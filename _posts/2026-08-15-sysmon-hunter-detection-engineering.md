---
title: "How I Built the Detections in Sysmon Hunter"
title_es: "Cómo construí las detecciones en Sysmon Hunter"
date: 2026-08-15
tags: [detection-engineering, sysmon, sigma, threat-hunting, windows, python]
excerpt: >-
  A deep dive into Sysmon Hunter's detection pipeline: a hand-written
  Sigma-style rule engine, statistical detectors for beaconing and discovery,
  process-tree correlation into incidents, and the EVTX-ATTACK-SAMPLES-driven
  process used to find real coverage gaps instead of guessing at them.
bilingual: true
---

<div class="lang-content" data-lang="en" markdown="1">

## TL;DR

- Every event in Sysmon Hunter runs through one single pipeline — `normalize -> ProcessTree.observe -> rules + statistical detectors -> correlate -> persist -> broadcast` — so there's no second copy of the logic that can drift out of sync between tests and production
- 173 hand-written YAML rules run through a custom Sigma-inspired matcher, alongside three statistical detectors: beaconing (median/MAD), discovery bursts (distinct ATT&CK techniques), and network scans (dual threshold)
- Every process is correlated by `ProcessGuid`, never PID, and detections sharing a process-tree root within a 10-minute window fold into a single incident with a severity that isn't a simple average
- New rules come from replaying the [EVTX-ATTACK-SAMPLES](https://github.com/sbousseaden/EVTX-ATTACK-SAMPLES) corpus (192 real attack-simulation files) and hunting for files that fire nothing at all, not from writing rules off general knowledge
- Documents the concrete mistakes made along the way: an overly permissive rule that slipped past testing, a regex `\b` gotcha, repeated field-casing bugs, a `|not` operator edge case, and a mislabeled ATT&CK technique

---

I've been heads down on this project for a while and wanted to write down how the detection side actually ended up working, since that's the core of the whole thing. The idea behind Sysmon Hunter never changed: take the raw events Sysmon dumps on a Windows box and turn them into something a human can read without jumping across twenty different logs.

Every event, no matter where it comes from (the `/ingest` endpoint, an `.evtx` replay, or a test), goes through the same path:

```
normalize -> ProcessTree.observe -> rules + statistical detectors -> correlate -> persist -> broadcast
```

That single-path detail matters more than it sounds. If something works in a test, it works the same way in production, because there's no second copy of the pipeline living somewhere else that could drift out of sync.

## The architecture, in short

| Layer | What it does | File |
|---|---|---|
| Normalization | Turns raw Winlogbeat/Sysmon JSON into a consistent `Event` | `normalizer.py` |
| Process tree | Tracks ancestry for every process, indexed by `ProcessGuid` | `correlator.py` |
| Rule engine | Evaluates YAML rules against an event | `matcher.py` + `rule_loader.py` |
| Statistical detectors | Beaconing, discovery bursts, network scans | `beacon.py`, `discovery.py`, `scan.py` |
| Correlation | Groups detections from the same process tree into one incident | `correlator.py` (`IncidentEngine`) |
| Persistence | SQLite through async SQLAlchemy | `db.py` |

## The rule engine

Rules are YAML, 173 of them at this point. They live under folders like `rules/process_creation/`, `rules/registry/`, `rules/pipe/`, but those folders mean nothing to the engine itself. The only thing that decides when a rule gets evaluated is its `event_id` field. I could dump every rule into one flat folder and it would behave exactly the same.

A typical rule looks like this:

```yaml
id: SYS-041
title: LSASS opened with credential-dumping access rights
event_id: 10
severity: critical
attack: [T1003.001]
detection:
  TargetImage|endswith: '\lsass.exe'
  GrantedAccess: ["0x1010", "0x1410", "0x143a", "0x1438", "0x1fffff"]
condition: all
```

I hand-wrote the matcher that evaluates these rules instead of pulling in a full Sigma library. Field specs look like `field`, `field|operator`, or `field|operator|not`. Here's the full operator set:

| Operator | What it does | Example |
|---|---|---|
| `equals` (default) | Exact match | `EventType: SetValue` |
| `contains` | Value contains the substring | `command_line\|contains: '-enc'` |
| `startswith` | Value starts with this | `image\|startswith: '\\tsclient\\'` |
| `endswith` | Value ends with this | `image\|endswith: '\lsass.exe'` |
| `re` | Regex, always case-insensitive | `PipeName\|re: '^\\[0-9a-f]{16,40}$'` |

Add `|not` at the end and it flips the result. Everything runs case-insensitive across the board, because Windows paths are inconsistent enough that you'd go insane otherwise.

One thing that bit me more than once while writing new rules: events carry normalized lowercase fields (`image`, `command_line`, `parent_image`) alongside the raw fields Sysmon sends as-is (`Image`, `TargetObject`, `GrantedAccess`, `CallTrace`). The engine checks the normalized attribute first and falls back to the raw dict:

```python
def get(self, field: str) -> Any:
    if field in self.model_fields_normalized:
        return getattr(self, field)
    return self.raw.get(field)
```

So a rule can reference either `image|endswith` or `Image|endswith` and both work, they just resolve through different paths underneath. I've written a test case with lowercase `image=` when the rule actually expected capitalized `Image`, and the test failed quietly because the field simply didn't exist where I was looking for it.

## The detectors that aren't YAML

Not every detection comes from a static rule. Three detectors run alongside the rule engine, crunch numbers over a rolling window of events, and when something crosses a threshold, they emit a detection just like any rule would, only tagged with a different ID prefix so it's obvious where it came from.

| Detector | Prefix | Watches for | The statistical trick |
|---|---|---|---|
| Beacon | `BCN-` | Periodic C2 network connections | Median + MAD instead of mean + standard deviation, to survive jitter |
| Discovery | `DSC-` | A burst of recon commands | Counts *distinct* ATT&CK techniques, not raw execution count |
| Scan (`SCN-001`) | `SCN-` | Network sweeps | Dual threshold: distinct IPs or distinct ports, either one is enough |

The beacon one is my favorite to explain. If you detect periodicity using mean and standard deviation, an attacker who adds even a small amount of random jitter to their connection interval breaks the detection outright. Median and MAD (median absolute deviation) are both far more resistant to outliers, so the same jitter that would blind a naive detector barely moves the needle here.

## How an incident actually comes together

This is the part that shapes how the tool feels to use the most. The entire process tree is indexed by `ProcessGuid`, never by PID. Windows recycles PIDs constantly, so correlating by PID would eventually graft a completely innocent process onto a malicious one's family tree just because it happened to inherit the same number a few minutes later.

```python
# correlator.py, simplified
def root_guid(self, guid: str) -> str:
    """GUID of the oldest known ancestor, used as the correlation key."""
    node = self.nodes.get(guid)
    while node and node.parent_guid in self.nodes:
        node = self.nodes[node.parent_guid]
    return node.guid if node else guid
```

When a rule or a statistical detector fires, that detection doesn't become its own standalone incident. The `IncidentEngine` groups every detection sharing the same process-tree root within a correlation window (10 minutes by default, tunable through `HUNTER_CORRELATION_WINDOW_MINUTES`). Here's what that looks like in practice:

1. A Word macro fires `SYS-001` (Office spawning a shell).
2. That shell fires `SYS-009` (PowerShell launched with obfuscation flags).
3. Ten seconds later, the same PowerShell starts beaconing and fires `BCN-001`.

All three land in a single incident, instead of three disconnected alerts an analyst would have to piece together by hand.

Incident severity isn't a simple linear sum either:

| Detection severity | Points |
|---|---|
| info | 1 |
| low | 3 |
| medium | 5 |
| high | 8 |
| critical | 14 |

Those points accumulate and get bucketed back into an incident severity using bands that were calibrated on purpose:

| Cumulative score | Incident severity |
|---|---|
| ≥ 14 | critical |
| ≥ 8 | high |
| ≥ 5 | medium |
| ≥ 2 | low |
| < 2 | info |

The critical band starts at 14 specifically so that either a single critical detection (14 points) or two high-severity detections (8+8=16) reach it on their own. With a plain average, an incident carrying one genuinely critical detection buried under a pile of low-severity noise could end up reporting a lower severity than it deserves, and that's the exact failure mode I wanted to rule out.

One more deliberate choice: an incident's title and its kill-chain narrative are never stored in the database. They're computed fresh every time someone requests them, from whatever detections the incident currently holds. If a new detection lands on an already-open incident later, the title updates itself the next time anyone looks at it, no background job required.

## Where new rules actually come from

Early on I wrote rules based on general knowledge of known techniques. At some point I changed the whole approach: I pulled down the [EVTX-ATTACK-SAMPLES](https://github.com/sbousseaden/EVTX-ATTACK-SAMPLES) repo, which has hundreds of real `.evtx` files captured during documented attack simulations, and started running the current rule corpus against every one of them to see which files lit up nothing at all.

A small script handles that:

```python
for rel in files:
    tree = ProcessTree(ttl=timedelta(hours=6))
    fired = set()
    for payload in read_evtx(fpath):
        ev = normalize(payload)
        tree.observe(ev)
        for d in evaluate(ev, store.for_event(ev.event_id)):
            fired.add(d.rule_id)
    if not fired:
        print(f"zero detections: {rel}")
```

The files that fired nothing got bucketed by technique family (UAC bypass, lateral movement, defense evasion, and so on), and those real gaps became the actual backlog of rules to write. The difference from writing rules from memory is huge. That's how I found, for example, that PsExec's relay pipes keep the `-stdin`/`-stdout`/`-stderr` suffix even when the service binary itself gets renamed to dodge filename-based detection:

```yaml
id: SYS-208
title: Named pipe follows PsExec's stdin/stdout/stderr relay naming convention
event_id: 17
severity: high
attack: [T1569.002]
detection:
  PipeName|re: '-(stdin|stdout|stderr)$'
condition: all
```

And here's an example from the other side, one where the method nearly worked against me if I hadn't applied it carefully. I wrote a rule to catch UAC auto-elevate binaries (eventvwr.exe, sysprep.exe, wusa.exe, and so on) launched outside the normal Explorer flow and reaching High integrity. The first draft included `slui.exe` in the list of suspicious binaries. Running it against the full 192-file corpus, not just the UAC-bypass files, surfaced it firing on a completely unrelated persistence sample:

```json
{"Image": "C:\\Windows\\System32\\slui.exe",
 "CommandLine": "C:\\Windows\\System32\\slui.exe -Embedding",
 "IntegrityLevel": "High",
 "ParentImage": "C:\\Windows\\System32\\svchost.exe",
 "ParentCommandLine": "C:\\Windows\\system32\\svchost.exe -k DcomLaunch"}
```

That's Windows license activation running quietly in the background, completely routine. I pulled `slui.exe` out of the list and added `svchost.exe` to the excluded parent images:

```yaml
detection:
  Image|endswith: [..., '\eventvwr.exe', ...]  # slui.exe removed
  IntegrityLevel|equals: High
  ParentImage|endswith|not:
    - '\explorer.exe'
    - '\svchost.exe'
condition: all
```

If I'd only tested against the UAC folder, that false positive would have shipped without anyone noticing, since none of those files exercise slui.exe's legitimate trigger. That's when it became a hard rule for me: every new rule gets tested against its target bucket first, and then, always, against the entire corpus.

## Challenges and things I learned along the way

Not everything went smoothly. Here's an honest list of the trip-ups that stuck with me most, because I think they say more about how this ended up shaped than any architecture explanation would.

**An overly permissive rule slipped past the tests.** Early on I had a rule with `condition: any` meant to catch PowerShell with suspicious flags, but one of the fields was set up wrong and it ended up matching any PowerShell process at all, flags or not. I only caught it when I wrote the negative test case and watched it fire against a perfectly ordinary `powershell.exe`. From then on it became a rule for me: every detection rule needs a case proving it *doesn't* fire where it shouldn't, not just one proving it fires where it should.

**A regex `\b` that didn't do what I assumed.** I had a rule looking for certutil's `-urlcache` flag with a word boundary at the end (`-urlcache\b`), and it failed against some real command lines because they had another hyphenated flag glued on right after, and `\b` doesn't treat a hyphen as a word boundary. Had to rework the regex to stop relying on that assumption.

**Field casing bit me over and over.** I mentioned this above already, but it's worth repeating: writing a test with `image=` instead of `Image=` (or the other way around) doesn't throw an error, it produces a test that passes for the wrong reason or fails silently because the field simply isn't where the engine is looking for it. It happened to me on the SYS-197 rules, again on SYS-200, and again on SYS-204. I eventually made it a habit to check which operator a rule actually uses (`image|endswith` vs `Image|endswith`) before touching the test helper at all.

**The `|not` operator has a gotcha with missing fields.** If an event doesn't carry the field a rule asks for, `event.get(field)` returns `None`, and the comparison resolves to `False` before negation even applies. That means `ParentImage|endswith|not: ['\explorer.exe']` could technically fire against a process with no `ParentImage` at all, as if its parent "were not" explorer.exe. It's accepted behavior on purpose, since in practice a process with no known parent is rare, but it's documented as something to keep in mind, not treated as a bug to fix.

**Not every technique has a clean signature in Sysmon.** I ran into several real attacks in the corpus that just don't have a reliable pattern to catch using only the fields Sysmon exposes. The clearest one is `UACME_59`, which duplicates a SYSTEM token into `Taskmgr.exe` via `CreateProcessWithTokenW`, something that looks nearly identical to a legitimate Task Manager launch from the available fields alone. Another is DCOM's `ShellWindows` abuse, where the only visible trace is a network connection from `explorer.exe`, too weak a signal to build a rule on without generating noise. I learned to leave those as acknowledged gaps in the docs instead of forcing a rule that would generate more false alarms than real value.

**Mislabeling an ATT&CK technique is easy if you move fast.** For the rule catching a shell spawned by `DllHost.exe` at High integrity (the RottenPotato/RoguePotato/EfsPotato pattern), the first draft tagged it as T1546.015, "COM Hijacking" for persistence. It sounded close enough by name (everyone talks about "COM abuse"), but it's the wrong technique: what's actually happening there is token theft via COM for privilege escalation, which is T1134.001. Before calling any new rule done, I started double-checking whether the technique I was tagging actually described the real mechanism or just sounded similar.

**A poorly chosen `contains` nearly broke a UAC-disabled detection.** The first version of the rule looking for `EnableLUA` set to 0 used `Details|contains: '0'`. The problem is the value when UAC is *enabled* is `"DWORD (0x00000001)"`, which also contains the character `'0'` several times. The rule would have fired on both the good state and the bad one. I caught it by checking an earlier rule that had already solved a similar problem (detecting RDP enabled via registry), which used `equals` against the exact string instead of `contains`. From then on, any rule comparing a DWORD-style registry value uses the full string, never a fragment of it.

**Covering "almost all" of a technique bucket feels like covering all of it, until you re-check.** When I finished the first pass of UAC-bypass rules, I validated against the UAC sample folder and saw 11 out of 16 firing. That felt like a solid result. It was only when I went through the 5 that were still missing, one at a time, that two entirely different technique families showed up that I hadn't even considered (disabling UAC outright via `EnableLUA`, and the `DllHost.exe` COM-elevation pattern). I learned not to settle for "most of it fires" and to explicitly look at every file still coming up empty before calling a batch of rules finished.

## Where it stands now

Sysmon Hunter currently ships 173 YAML rules and three statistical detectors, all running through the same pipeline and landing in the same process-tree correlation engine. The rule I set for myself once I changed the approach stayed simple: nothing gets added without real evidence behind it, nothing is considered done without a true-positive and a true-negative case proving it, and nothing is considered safe until it's been run against the whole corpus, not just the slice that motivated it in the first place.

</div>

<div class="lang-content" data-lang="es" markdown="1" hidden>

## TL;DR

- Todo evento en Sysmon Hunter pasa por un único pipeline — `normalize -> ProcessTree.observe -> rules + statistical detectors -> correlate -> persist -> broadcast` — así que no existe una segunda copia de la lógica que pueda desincronizarse entre pruebas y producción
- 173 reglas YAML escritas a mano corren a través de un matcher propio inspirado en Sigma, junto a tres detectores estadísticos: beaconing (mediana/MAD), ráfagas de discovery (técnicas ATT&CK distintas) y escaneos de red (umbral doble)
- Cada proceso se correlaciona por `ProcessGuid`, nunca por PID, y las detecciones que comparten la misma raíz de árbol de procesos dentro de una ventana de 10 minutos se agrupan en un solo incidente con una severidad que no es un simple promedio
- Las reglas nuevas surgen de reproducir el corpus [EVTX-ATTACK-SAMPLES](https://github.com/sbousseaden/EVTX-ATTACK-SAMPLES) (192 archivos reales de simulaciones de ataque) y buscar los archivos que no disparan nada, no de escribir reglas de memoria
- Documenta los errores concretos cometidos en el camino: una regla demasiado permisiva que se coló en las pruebas, un problema con `\b` en una regex, bugs repetidos de casing en campos, un caso límite del operador `|not`, y una técnica ATT&CK mal etiquetada

---

Llevo un tiempo metido de lleno en este proyecto y quería dejar por escrito cómo terminó funcionando realmente el lado de detección, ya que es el núcleo de todo el proyecto. La idea detrás de Sysmon Hunter nunca cambió: tomar los eventos crudos que Sysmon vuelca en una máquina Windows y convertirlos en algo que una persona pueda leer sin saltar entre veinte logs distintos.

Cada evento, sin importar de dónde venga (el endpoint `/ingest`, una reproducción de `.evtx`, o una prueba), pasa por el mismo camino:

```
normalize -> ProcessTree.observe -> rules + statistical detectors -> correlate -> persist -> broadcast
```

Ese detalle de camino único importa más de lo que parece. Si algo funciona en una prueba, funciona igual en producción, porque no hay una segunda copia del pipeline viviendo en otro lado que pueda desincronizarse.

## La arquitectura, en resumen

| Capa | Qué hace | Archivo |
|---|---|---|
| Normalización | Convierte el JSON crudo de Winlogbeat/Sysmon en un `Event` consistente | `normalizer.py` |
| Árbol de procesos | Rastrea la ascendencia de cada proceso, indexado por `ProcessGuid` | `correlator.py` |
| Motor de reglas | Evalúa reglas YAML contra un evento | `matcher.py` + `rule_loader.py` |
| Detectores estadísticos | Beaconing, ráfagas de discovery, escaneos de red | `beacon.py`, `discovery.py`, `scan.py` |
| Correlación | Agrupa detecciones del mismo árbol de procesos en un incidente | `correlator.py` (`IncidentEngine`) |
| Persistencia | SQLite mediante SQLAlchemy asíncrono | `db.py` |

## El motor de reglas

Las reglas son YAML, 173 hasta ahora. Viven en carpetas como `rules/process_creation/`, `rules/registry/`, `rules/pipe/`, pero esas carpetas no significan nada para el motor en sí. Lo único que decide cuándo se evalúa una regla es su campo `event_id`. Podría meter todas las reglas en una sola carpeta plana y se comportaría exactamente igual.

Una regla típica luce así:

```yaml
id: SYS-041
title: LSASS opened with credential-dumping access rights
event_id: 10
severity: critical
attack: [T1003.001]
detection:
  TargetImage|endswith: '\lsass.exe'
  GrantedAccess: ["0x1010", "0x1410", "0x143a", "0x1438", "0x1fffff"]
condition: all
```

Escribí el matcher que evalúa estas reglas a mano en vez de meter una librería completa de Sigma. Las especificaciones de campo se ven como `field`, `field|operator`, o `field|operator|not`. Aquí está el set completo de operadores:

| Operador | Qué hace | Ejemplo |
|---|---|---|
| `equals` (default) | Coincidencia exacta | `EventType: SetValue` |
| `contains` | El valor contiene el substring | `command_line\|contains: '-enc'` |
| `startswith` | El valor empieza con esto | `image\|startswith: '\\tsclient\\'` |
| `endswith` | El valor termina con esto | `image\|endswith: '\lsass.exe'` |
| `re` | Regex, siempre case-insensitive | `PipeName\|re: '^\\[0-9a-f]{16,40}$'` |

Agregar `|not` al final invierte el resultado. Todo corre sin distinguir mayúsculas/minúsculas, porque las rutas de Windows son lo bastante inconsistentes como para volverse loco si no fuera así.

Algo que me mordió más de una vez escribiendo reglas nuevas: los eventos llevan campos normalizados en minúscula (`image`, `command_line`, `parent_image`) junto a los campos crudos que Sysmon envía tal cual (`Image`, `TargetObject`, `GrantedAccess`, `CallTrace`). El motor revisa primero el atributo normalizado y cae al diccionario crudo si no lo encuentra:

```python
def get(self, field: str) -> Any:
    if field in self.model_fields_normalized:
        return getattr(self, field)
    return self.raw.get(field)
```

Entonces una regla puede referenciar tanto `image|endswith` como `Image|endswith` y ambas funcionan, solo que se resuelven por caminos distintos por debajo. Escribí un caso de prueba con `image=` en minúscula cuando la regla en realidad esperaba `Image` con mayúscula, y la prueba falló en silencio porque el campo simplemente no existía donde yo estaba buscando.

## Los detectores que no son YAML

No toda detección viene de una regla estática. Tres detectores corren junto al motor de reglas, procesan números sobre una ventana móvil de eventos, y cuando algo cruza un umbral, emiten una detección igual que cualquier regla, solo que etiquetada con un prefijo de ID distinto para que sea obvio de dónde vino.

| Detector | Prefijo | Vigila | El truco estadístico |
|---|---|---|---|
| Beacon | `BCN-` | Conexiones de red C2 periódicas | Mediana + MAD en vez de media + desviación estándar, para sobrevivir al jitter |
| Discovery | `DSC-` | Una ráfaga de comandos de reconocimiento | Cuenta técnicas ATT&CK *distintas*, no la cantidad bruta de ejecuciones |
| Scan (`SCN-001`) | `SCN-` | Barridos de red | Umbral doble: IPs distintas o puertos distintos, cualquiera de los dos basta |

El de beacon es mi favorito para explicar. Si detectás periodicidad usando media y desviación estándar, un atacante que agregue aunque sea un poco de jitter aleatorio a su intervalo de conexión rompe la detección por completo. La mediana y el MAD (desviación absoluta respecto a la mediana) son mucho más resistentes a outliers, así que el mismo jitter que cegaría a un detector ingenuo apenas mueve la aguja acá.

## Cómo se arma un incidente en la práctica

Esta es la parte que más define cómo se siente usar la herramienta. Todo el árbol de procesos está indexado por `ProcessGuid`, nunca por PID. Windows recicla PIDs constantemente, así que correlacionar por PID eventualmente terminaría injertando un proceso completamente inocente al árbol genealógico de uno malicioso solo porque heredó el mismo número unos minutos después.

```python
# correlator.py, simplified
def root_guid(self, guid: str) -> str:
    """GUID of the oldest known ancestor, used as the correlation key."""
    node = self.nodes.get(guid)
    while node and node.parent_guid in self.nodes:
        node = self.nodes[node.parent_guid]
    return node.guid if node else guid
```

Cuando una regla o un detector estadístico dispara, esa detección no se convierte en su propio incidente independiente. El `IncidentEngine` agrupa toda detección que comparta la misma raíz de árbol de procesos dentro de una ventana de correlación (10 minutos por defecto, ajustable con `HUNTER_CORRELATION_WINDOW_MINUTES`). Así se ve en la práctica:

1. Una macro de Word dispara `SYS-001` (Office lanzando una shell).
2. Esa shell dispara `SYS-009` (PowerShell lanzado con flags de ofuscación).
3. Diez segundos después, el mismo PowerShell empieza a hacer beaconing y dispara `BCN-001`.

Las tres caen en un solo incidente, en vez de tres alertas desconectadas que un analista tendría que unir a mano.

La severidad del incidente tampoco es una suma lineal simple:

| Severidad de la detección | Puntos |
|---|---|
| info | 1 |
| low | 3 |
| medium | 5 |
| high | 8 |
| critical | 14 |

Esos puntos se acumulan y se agrupan de vuelta en una severidad de incidente usando bandas calibradas a propósito:

| Puntaje acumulado | Severidad del incidente |
|---|---|
| ≥ 14 | critical |
| ≥ 8 | high |
| ≥ 5 | medium |
| ≥ 2 | low |
| < 2 | info |

La banda crítica arranca justo en 14 para que tanto una sola detección crítica (14 puntos) como dos detecciones de severidad alta (8+8=16) la alcancen por sí solas. Con un promedio simple, un incidente que carga una detección genuinamente crítica enterrada bajo un montón de ruido de baja severidad podría terminar reportando una severidad menor de la que merece, y ese es exactamente el modo de falla que quería descartar.

Otra decisión deliberada: el título de un incidente y su narrativa de kill-chain nunca se guardan en la base de datos. Se calculan de nuevo cada vez que alguien los pide, a partir de las detecciones que el incidente tenga en ese momento. Si una detección nueva cae sobre un incidente ya abierto más tarde, el título se actualiza solo la próxima vez que alguien lo mire, sin necesidad de ningún job en segundo plano.

## De dónde salen realmente las reglas nuevas

Al principio escribía reglas basándome en conocimiento general de técnicas conocidas. En algún momento cambié todo el enfoque: bajé el repo [EVTX-ATTACK-SAMPLES](https://github.com/sbousseaden/EVTX-ATTACK-SAMPLES), que tiene cientos de archivos `.evtx` reales capturados durante simulaciones de ataque documentadas, y empecé a correr el corpus de reglas actual contra cada uno de ellos para ver cuáles no disparaban absolutamente nada.

Un script pequeño se encarga de eso:

```python
for rel in files:
    tree = ProcessTree(ttl=timedelta(hours=6))
    fired = set()
    for payload in read_evtx(fpath):
        ev = normalize(payload)
        tree.observe(ev)
        for d in evaluate(ev, store.for_event(ev.event_id)):
            fired.add(d.rule_id)
    if not fired:
        print(f"zero detections: {rel}")
```

Los archivos que no dispararon nada se agruparon por familia de técnica (bypass de UAC, movimiento lateral, evasión de defensas, etc.), y esos huecos reales se convirtieron en el backlog real de reglas por escribir. La diferencia con escribir reglas de memoria es enorme. Así fue como descubrí, por ejemplo, que los pipes de relay de PsExec mantienen el sufijo `-stdin`/`-stdout`/`-stderr` incluso cuando el binario del servicio se renombra para esquivar la detección basada en nombre de archivo:

```yaml
id: SYS-208
title: Named pipe follows PsExec's stdin/stdout/stderr relay naming convention
event_id: 17
severity: high
attack: [T1569.002]
detection:
  PipeName|re: '-(stdin|stdout|stderr)$'
condition: all
```

Y acá va un ejemplo del otro lado, uno donde el método casi juega en mi contra si no lo hubiera aplicado con cuidado. Escribí una regla para atrapar binarios de auto-elevación de UAC (eventvwr.exe, sysprep.exe, wusa.exe, etc.) lanzados fuera del flujo normal de Explorer y alcanzando integridad High. El primer borrador incluía `slui.exe` en la lista de binarios sospechosos. Al correrla contra el corpus completo de 192 archivos, no solo los de bypass de UAC, salió a la luz que disparaba contra una muestra de persistencia completamente ajena:

```json
{"Image": "C:\\Windows\\System32\\slui.exe",
 "CommandLine": "C:\\Windows\\System32\\slui.exe -Embedding",
 "IntegrityLevel": "High",
 "ParentImage": "C:\\Windows\\System32\\svchost.exe",
 "ParentCommandLine": "C:\\Windows\\system32\\svchost.exe -k DcomLaunch"}
```

Eso es la activación de licencia de Windows corriendo tranquilamente en segundo plano, completamente rutinario. Saqué `slui.exe` de la lista y agregué `svchost.exe` a los parent images excluidos:

```yaml
detection:
  Image|endswith: [..., '\eventvwr.exe', ...]  # slui.exe removed
  IntegrityLevel|equals: High
  ParentImage|endswith|not:
    - '\explorer.exe'
    - '\svchost.exe'
condition: all
```

Si solo hubiera probado contra la carpeta de UAC, ese falso positivo habría salido a producción sin que nadie lo notara, ya que ninguno de esos archivos ejercita el disparador legítimo de slui.exe. Ahí se volvió una regla dura para mí: toda regla nueva se prueba primero contra su bucket objetivo, y después, siempre, contra el corpus entero.

## Retos y cosas que aprendí en el camino

No todo salió bien. Acá va una lista honesta de los tropiezos que más se me quedaron grabados, porque creo que dicen más sobre cómo terminó formándose esto que cualquier explicación de arquitectura.

**Una regla demasiado permisiva se coló entre las pruebas.** Al principio tenía una regla con `condition: any` pensada para atrapar PowerShell con flags sospechosos, pero uno de los campos estaba mal configurado y terminó coincidiendo con cualquier proceso de PowerShell, con o sin flags. Solo lo detecté cuando escribí el caso de prueba negativo y vi que disparaba contra un `powershell.exe` perfectamente normal. Desde entonces se volvió una regla para mí: toda regla de detección necesita un caso que demuestre que *no* dispara donde no debería, no solo uno que demuestre que dispara donde debe.

**Un `\b` en una regex que no hacía lo que yo asumía.** Tenía una regla buscando el flag `-urlcache` de certutil con un límite de palabra al final (`-urlcache\b`), y fallaba contra algunas líneas de comando reales porque tenían otro flag con guion pegado justo después, y `\b` no trata un guion como límite de palabra. Tuve que rehacer la regex para dejar de depender de esa suposición.

**El casing de los campos me mordió una y otra vez.** Ya lo mencioné arriba, pero vale la pena repetirlo: escribir una prueba con `image=` en vez de `Image=` (o al revés) no lanza un error, produce una prueba que pasa por la razón equivocada o falla en silencio porque el campo simplemente no está donde el motor lo está buscando. Me pasó en las reglas SYS-197, de nuevo en SYS-200, y de nuevo en SYS-204. Eventualmente lo convertí en hábito: revisar qué operador usa realmente una regla (`image|endswith` vs `Image|endswith`) antes de tocar siquiera el helper de pruebas.

**El operador `|not` tiene una trampa con campos ausentes.** Si un evento no trae el campo que una regla pide, `event.get(field)` devuelve `None`, y la comparación resuelve a `False` antes incluso de que aplique la negación. Eso significa que `ParentImage|endswith|not: ['\explorer.exe']` técnicamente podría disparar contra un proceso sin `ParentImage` en absoluto, como si su padre "no fuera" explorer.exe. Es un comportamiento aceptado a propósito, ya que en la práctica un proceso sin padre conocido es raro, pero está documentado como algo a tener presente, no tratado como un bug a corregir.

**No toda técnica tiene una firma limpia en Sysmon.** Me topé con varios ataques reales en el corpus que simplemente no tienen un patrón confiable para atrapar usando solo los campos que Sysmon expone. El más claro es `UACME_59`, que duplica un token de SYSTEM hacia `Taskmgr.exe` vía `CreateProcessWithTokenW`, algo que se ve casi idéntico a un lanzamiento legítimo del Administrador de tareas a partir de los campos disponibles. Otro es el abuso de `ShellWindows` de DCOM, donde el único rastro visible es una conexión de red desde `explorer.exe`, una señal demasiado débil para construir una regla sin generar ruido. Aprendí a dejar esos como huecos reconocidos en la documentación en vez de forzar una regla que generaría más falsas alarmas que valor real.

**Etiquetar mal una técnica ATT&CK es fácil si vas rápido.** Para la regla que atrapa una shell lanzada por `DllHost.exe` en integridad High (el patrón RottenPotato/RoguePotato/EfsPotato), el primer borrador la etiquetó como T1546.015, "COM Hijacking" para persistencia. Sonaba lo bastante cercano por el nombre (todo el mundo habla de "abuso de COM"), pero es la técnica equivocada: lo que realmente pasa ahí es robo de token vía COM para escalamiento de privilegios, que es T1134.001. Antes de dar por terminada cualquier regla nueva, empecé a verificar dos veces si la técnica que estaba etiquetando realmente describía el mecanismo real o solo sonaba parecida.

**Un `contains` mal elegido casi rompe una detección de UAC deshabilitado.** La primera versión de la regla que buscaba `EnableLUA` en 0 usaba `Details|contains: '0'`. El problema es que el valor cuando UAC está *habilitado* es `"DWORD (0x00000001)"`, que también contiene el carácter `'0'` varias veces. La regla habría disparado tanto en el estado bueno como en el malo. Lo detecté al revisar una regla anterior que ya había resuelto un problema parecido (detectar RDP habilitado vía registro), que usaba `equals` contra el string exacto en vez de `contains`. Desde entonces, cualquier regla que compare un valor de registro tipo DWORD usa el string completo, nunca un fragmento.

**Cubrir "casi todo" un bucket de técnicas se siente como cubrirlo todo, hasta que revisás de nuevo.** Cuando terminé la primera pasada de reglas de bypass de UAC, validé contra la carpeta de muestras de UAC y vi 11 de 16 disparando. Se sentía como un resultado sólido. Fue solo al revisar los 5 que faltaban, uno por uno, que aparecieron dos familias de técnicas completamente distintas que ni siquiera había considerado (deshabilitar UAC directamente vía `EnableLUA`, y el patrón de elevación COM de `DllHost.exe`). Aprendí a no conformarme con "la mayoría dispara" y a revisar explícitamente cada archivo que seguía sin dar resultado antes de dar por terminado un lote de reglas.

## Dónde está parado ahora

Sysmon Hunter actualmente trae 173 reglas YAML y tres detectores estadísticos, todos corriendo por el mismo pipeline y cayendo en el mismo motor de correlación de árbol de procesos. La regla que me impuse una vez cambié de enfoque se mantuvo simple: nada se agrega sin evidencia real detrás, nada se considera terminado sin un caso true-positive y uno true-negative que lo demuestren, y nada se considera seguro hasta haber corrido contra el corpus entero, no solo contra el fragmento que lo motivó en primer lugar.

</div>
