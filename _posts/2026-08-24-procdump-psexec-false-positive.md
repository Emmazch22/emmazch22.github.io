---
title: "ProcDump vs. PsExec: Chasing Down a False Positive in sysmon-hunter"
title_es: "ProcDump vs. PsExec: cazando un falso positivo en sysmon-hunter"
date: 2026-08-24
tags: [purple-team, detection-engineering, threat-hunting, mitre-attack, sysmon]
excerpt: >-
  A purple-team run of Atomic Red Team's LSASS-dump-via-ProcDump test against
  sysmon-hunter confirms the intended detection fires correctly, then traces
  an unrelated PsExec rule that also fired back to the exact YAML condition
  causing the false positive.
bilingual: true
---

<div class="lang-content" data-lang="en" markdown="1">

## TL;DR

- **Technique:** T1003.001 — OS Credential Dumping: LSASS Memory (via Sysinternals ProcDump)
- **Result:** ✅ Detected — `SYS-109` (CRITICAL) fired correctly, correlated
  into one incident with a supporting detection via shared process-tree ancestry
- **Bug found and confirmed at the source:** `SYS-073` ("PsExec service binary
  executed") fired on ProcDump, not PsExec. Root cause: an `any` (OR) condition
  matching on the shared `-accepteula` flag instead of requiring the actual
  PsExec service image
- **Note on MTTD:** not meaningfully measurable from a batch `.evtx` replay;
  see [Detection Result](#detection-result)

---

## Lab Setup

- FlareVM (guest) on VirtualBox, NAT networking
- Sysmon installed with SwiftOnSecurity config
- Atomic Red Team installed for test execution
- sysmon-hunter running on host (`0.0.0.0:8000`)
- Connectivity confirmed guest → host via VirtualBox NAT gateway (`10.0.2.2`)
- `.evtx` export/replay pipeline used (`scripts/replay_evtx.py`) instead of live
  Winlogbeat shipping — same ingest pipeline, simpler for a single-technique test

---

## Hypothesis

sysmon-hunter's rule corpus documents explicit coverage for LSASS dumping via
ProcDump (`SYS-109`, added in the second detection-engineering pass, SYS-108
through SYS-123). Hypothesis: running Atomic Red Team's ProcDump-based
LSASS-dump test should trigger this rule and raise a CRITICAL incident.

---

## Execution

T1003.001 ships several Atomic Red Team variants covering different LSASS-
dumping tools (`comsvcs.dll` MiniDump, Task Manager dump, `procdump`, among
others). Test #1 (ProcDump) was chosen because sysmon-hunter's rule corpus
explicitly documents coverage for it (`SYS-109`), making it the most direct
way to validate the hypothesis above.

**Baseline — sysmon-hunter console before ingesting any telemetry:**

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/00_baseline_console.png' | relative_url }}" alt="sysmon-hunter console at rest, showing 0 incidents and 0 detections with the rule engine loaded" width="2536" height="907" loading="lazy" decoding="async">
  <figcaption>Figure 1: sysmon-hunter console at rest — 0 incidents, 0 detections, engine loaded with 192 rules. Captured before the <code>.evtx</code> replay to establish a clean before/after comparison.</figcaption>
</figure>

**Prerequisites installed, then test executed:**

```
Invoke-AtomicTest T1003.001 -TestNumbers 1 -GetPrereqs
Invoke-AtomicTest T1003.001 -TestNumbers 1
```

- Start (UTC): `2026-08-24T18:28:09`
- End (UTC): `2026-08-24T18:28:10`

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/02_atomic_execution.png' | relative_url }}" alt="Atomic Red Team console output executing T1003.001 test 1 with ProcDump" width="1328" height="602" loading="lazy" decoding="async">
  <figcaption>Figure 2: Atomic Red Team executing T1003.001 test #1 — ProcDump v12.01 dumping <code>lsass.exe</code> memory to <code>C:\Windows\Temp\lsass_dump.dmp</code> (55 MB, completed in 0.9s).</figcaption>
</figure>

---

## Log Export

Exported Sysmon telemetry scoped to the execution window (`18:26:00`–`18:31:00`
UTC) to avoid noise from unrelated lab/setup activity:

```
wevtutil epl Microsoft-Windows-Sysmon/Operational C:\Users\Public\sysmon_export_t1003.evtx /q:"*[System[TimeCreated[@SystemTime>='2026-08-24T18:26:00.000Z' and @SystemTime<='2026-08-24T18:31:00.000Z']]]"
```

First attempt (unscoped, 1795 events) surfaced only unrelated noise — no LSASS
detections. Re-exporting with a tight time window was necessary to isolate the
actual technique from background activity.

---

## Detection Result

```
python scripts/replay_evtx.py --file sysmon_export_t1003.evtx
```

33 events replayed → 11 detections across 4 rules → **2 incidents**:

| Rule ID | Severity | Description | Count |
|---|---|---|---|
| SYS-109 | CRITICAL | Sysinternals procdump run against LSASS | 2 |
| SYS-073 | HIGH | PsExec service binary executed on this host | 3 |
| SYS-020 | MEDIUM | Scripting or LOLBin process made an outbound connection | 5 |
| SYS-009 | HIGH | PowerShell download cradle | 1 |

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/03_console_incidents.png' | relative_url }}" alt="sysmon-hunter console after replay, showing 2 incidents both marked CRITICAL" width="2529" height="902" loading="lazy" decoding="async">
  <figcaption>Figure 3: Post-replay console — 2 incidents, both CRITICAL. "Credential access on DESKTOP-6VMFSGO" (score 52) is the ProcDump/LSASS chain; "Execution with C2 on DESKTOP-6VMFSGO" (score 33) is a separate incident rooted at <code>powershell.exe</code>, covering the tool-download step (SYS-009, SYS-020).</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/04_incident_detail.png' | relative_url }}" alt="Incident detail view for the Credential access incident, showing the auto-narrated kill chain and both SYS-073 and SYS-109 detections" width="1044" height="584" loading="lazy" decoding="async">
  <figcaption>Figure 4: Incident detail for "Credential access on DESKTOP-6VMFSGO" — behavior profile auto-narrates the chain as execution → lateral movement → credential access (T1569.002, T1021.002, T1003.001), with SYS-073 and SYS-109 both listed as detections sharing the same process tree.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/05_process_tree.png' | relative_url }}" alt="Process tree view showing cmd.exe spawning procdump.exe spawning procdump64.exe, with both detections attached to procdump64.exe" width="1045" height="585" loading="lazy" decoding="async">
  <figcaption>Figure 5: Process tree view — <code>cmd.exe</code> → <code>procdump.exe</code> → <code>procdump64.exe</code>, the exact ancestry Atomic Red Team's test #1 produces. Both SYS-073 and SYS-109 fired on <code>procdump64.exe</code>, confirming they were correlated by shared <code>ProcessGuid</code> lineage, not just proximity in time.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/06_timeline.png' | relative_url }}" alt="Interactive timeline view showing SYS-073 and SYS-109 both logged at the same ingestion timestamp" width="1055" height="582" loading="lazy" decoding="async">
  <figcaption>Figure 6: Timeline view of the same incident — SYS-073 and SYS-109 both logged at <code>18:31:01</code> UTC, the moment the replay script ingested the event, not the moment Sysmon originally recorded it (<code>18:28:09–10</code> UTC).</figcaption>
</figure>

**Event time (Sysmon, original):** `2026-08-24T18:28:09–10 UTC`
**Detection time (console, replay ingestion):** `2026-08-24T18:31:01 UTC`

This ~3-minute gap is an artifact of batch replay, not real detection latency — the
replay script processes the whole `.evtx` file in one pass after the fact. A live
Winlogbeat feed would be needed to measure true MTTD; what this run validates is
that the rule *fires correctly*, not how fast it would fire in production.

---

## Analysis

**SYS-109 fired as expected** — confirms sysmon-hunter's documented ProcDump-
against-LSASS coverage works end to end against real Atomic Red Team telemetry,
not just the sample corpus it was validated against during development.

**Correlation worked as documented.** SYS-109 and SYS-073 shared the same
`ProcessGuid` ancestry (`cmd.exe` → `procdump.exe` → `procdump64.exe`) and were
correctly folded into a single incident instead of surfacing as two disconnected
alerts — exactly the behavior the project's design docs describe.

**SYS-073 ("PsExec service binary executed") is a genuine false positive, and
tracing it back to the rule source confirms exactly why.** The incident detail's
raw command lines showed SYS-073 firing on the same line as SYS-109:

```
C:\AtomicRedTeam\atomics\..\ExternalPayloads\procdump.exe -accepteula -ma lsass.exe C:\Windows\Temp\lsass_dump.dmp
```

No `PSEXESVC.exe` anywhere in that chain — so why did a PsExec-specific rule
fire? Pulling the rule source (`rules/process_creation/psexec_service_execution.yml`)
answers it directly:

```yaml
id: SYS-073
title: PsExec service binary executed on this host
detection:
  image|endswith:
    - '\PSEXESVC.exe'
  command_line|contains:
    - '-accepteula'
condition: any
```

`condition: any` means these two clauses are OR'd, not AND'd. The rule was
clearly meant to catch two separate PsExec artifacts — the service image
*or* the client's telltale flag — but written as a single rule with `any`
instead of two rules (or an `all` condition scoped to the image), it also
fires on **any** command line containing `-accepteula`, regardless of which
binary is running. ProcDump ships the exact same Sysinternals EULA flag, so
it trips the same rule PsExec does.

**Proposed fix:** split into two rules, or require both `image|endswith:
'\PSEXESVC.exe'` and `-accepteula` together for the PsExec-flag branch — the
flag alone isn't evidence of PsExec, only of *some* Sysinternals tool.

**SYS-009 (download cradle) landed in a separate incident, not the credential-
access one** — it shares no process-tree root with the ProcDump chain (its root
is `powershell.exe`, from the `-GetPrereqs` step downloading `procdump.exe`
itself). This is legitimate admin-tooling acquisition, not an attacker's
cradle — a case where the label is technically accurate but the context (a
lab setup step, not live malware staging) matters for triage.

---

## Takeaways

- Unscoped `.evtx` exports produce too much noise for a clean single-technique
  test — scoping by timestamp is a necessary step, not optional.
- sysmon-hunter's documented rule-to-sample validation approach holds up
  against live atomic-test telemetry, not just its own validation corpus.
- Process-tree correlation by `ProcessGuid` genuinely groups related detections
  into one incident, matching the design docs' stated behavior.
- **Confirmed root cause for SYS-073:** the rule's `condition: any` OR's an
  image-name check against a command-line-flag check instead of requiring
  both — split them into two rules, or require the PsExec image alongside
  the flag, so it stops firing on unrelated Sysinternals tools like ProcDump.
- Batch replay measures whether a rule fires correctly, not real-world MTTD —
  that requires a live Winlogbeat feed, a natural next iteration of this lab.

---

## Evidence

Raw `.evtx` export and sysmon-hunter JSON logs available on request.

</div>

<div class="lang-content" data-lang="es" markdown="1" hidden>

## TL;DR

- **Técnica:** T1003.001 — OS Credential Dumping: LSASS Memory (vía ProcDump de Sysinternals)
- **Resultado:** ✅ Detectado — `SYS-109` (CRITICAL) disparó correctamente,
  correlacionado en un solo incidente junto a una detección de apoyo por
  ascendencia compartida en el árbol de procesos
- **Bug encontrado y confirmado en el origen:** `SYS-073` ("PsExec service
  binary executed") disparó con ProcDump, no con PsExec. Causa raíz: una
  condición `any` (OR) que coincide con el flag compartido `-accepteula` en
  vez de exigir la imagen real del servicio PsExec
- **Nota sobre el MTTD:** no es medible de forma significativa a partir de un
  replay batch de `.evtx`; ver [Resultado de la detección](#resultado-de-la-detección)

---

## Configuración del laboratorio

- FlareVM (guest) en VirtualBox, red NAT
- Sysmon instalado con la configuración de SwiftOnSecurity
- Atomic Red Team instalado para ejecutar las pruebas
- sysmon-hunter corriendo en el host (`0.0.0.0:8000`)
- Conectividad confirmada guest → host vía el gateway NAT de VirtualBox (`10.0.2.2`)
- Se usó el pipeline de exportación/replay de `.evtx` (`scripts/replay_evtx.py`)
  en lugar del envío en vivo por Winlogbeat — el mismo pipeline de ingesta,
  más simple para una prueba de una sola técnica

---

## Hipótesis

El corpus de reglas de sysmon-hunter documenta cobertura explícita para el
dump de LSASS vía ProcDump (`SYS-109`, agregada en la segunda pasada de
detection engineering, SYS-108 a SYS-123). Hipótesis: correr la prueba de
Atomic Red Team basada en ProcDump para el dump de LSASS debería disparar
esta regla y levantar un incidente CRITICAL.

---

## Ejecución

T1003.001 incluye varias variantes de Atomic Red Team que cubren distintas
herramientas de dump de LSASS (MiniDump vía `comsvcs.dll`, dump desde el
Administrador de tareas, `procdump`, entre otras). Se eligió la prueba #1
(ProcDump) porque el corpus de reglas de sysmon-hunter documenta cobertura
explícita para ella (`SYS-109`), lo que la vuelve la forma más directa de
validar la hipótesis anterior.

**Baseline — consola de sysmon-hunter antes de ingerir cualquier telemetría:**

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/00_baseline_console.png' | relative_url }}" alt="Consola de sysmon-hunter en reposo, mostrando 0 incidentes y 0 detecciones con el motor de reglas cargado" width="2536" height="907" loading="lazy" decoding="async">
  <figcaption>Figura 1: consola de sysmon-hunter en reposo — 0 incidentes, 0 detecciones, motor cargado con 192 reglas. Capturada antes del replay de <code>.evtx</code> para establecer una comparación limpia de antes/después.</figcaption>
</figure>

**Prerequisitos instalados, luego se ejecuta la prueba:**

```
Invoke-AtomicTest T1003.001 -TestNumbers 1 -GetPrereqs
Invoke-AtomicTest T1003.001 -TestNumbers 1
```

- Inicio (UTC): `2026-08-24T18:28:09`
- Fin (UTC): `2026-08-24T18:28:10`

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/02_atomic_execution.png' | relative_url }}" alt="Salida de consola de Atomic Red Team ejecutando la prueba 1 de T1003.001 con ProcDump" width="1328" height="602" loading="lazy" decoding="async">
  <figcaption>Figura 2: Atomic Red Team ejecutando la prueba #1 de T1003.001 — ProcDump v12.01 volcando la memoria de <code>lsass.exe</code> a <code>C:\Windows\Temp\lsass_dump.dmp</code> (55 MB, completado en 0.9s).</figcaption>
</figure>

---

## Exportación de logs

Se exportó la telemetría de Sysmon acotada a la ventana de ejecución
(`18:26:00`–`18:31:00` UTC) para evitar ruido de actividad de laboratorio/setup
no relacionada:

```
wevtutil epl Microsoft-Windows-Sysmon/Operational C:\Users\Public\sysmon_export_t1003.evtx /q:"*[System[TimeCreated[@SystemTime>='2026-08-24T18:26:00.000Z' and @SystemTime<='2026-08-24T18:31:00.000Z']]]"
```

El primer intento (sin acotar, 1795 eventos) solo mostró ruido no relacionado
— ninguna detección de LSASS. Fue necesario reexportar con una ventana de
tiempo estrecha para aislar la técnica real de la actividad de fondo.

---

## Resultado de la detección

```
python scripts/replay_evtx.py --file sysmon_export_t1003.evtx
```

33 eventos reproducidos → 11 detecciones en 4 reglas → **2 incidentes**:

| ID de regla | Severidad | Descripción | Cantidad |
|---|---|---|---|
| SYS-109 | CRITICAL | Sysinternals procdump ejecutado contra LSASS | 2 |
| SYS-073 | HIGH | Binario de servicio de PsExec ejecutado en este host | 3 |
| SYS-020 | MEDIUM | Proceso de scripting o LOLBin hizo una conexión saliente | 5 |
| SYS-009 | HIGH | Download cradle de PowerShell | 1 |

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/03_console_incidents.png' | relative_url }}" alt="Consola de sysmon-hunter después del replay, mostrando 2 incidentes marcados como CRITICAL" width="2529" height="902" loading="lazy" decoding="async">
  <figcaption>Figura 3: consola post-replay — 2 incidentes, ambos CRITICAL. "Credential access on DESKTOP-6VMFSGO" (score 52) es la cadena ProcDump/LSASS; "Execution with C2 on DESKTOP-6VMFSGO" (score 33) es un incidente separado con raíz en <code>powershell.exe</code>, que cubre el paso de descarga de la herramienta (SYS-009, SYS-020).</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/04_incident_detail.png' | relative_url }}" alt="Vista de detalle del incidente de Credential access, mostrando la narrativa auto-generada de la kill chain y ambas detecciones SYS-073 y SYS-109" width="1044" height="584" loading="lazy" decoding="async">
  <figcaption>Figura 4: detalle del incidente "Credential access on DESKTOP-6VMFSGO" — el perfil de comportamiento narra automáticamente la cadena como ejecución → movimiento lateral → acceso a credenciales (T1569.002, T1021.002, T1003.001), con SYS-073 y SYS-109 listadas como detecciones que comparten el mismo árbol de procesos.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/05_process_tree.png' | relative_url }}" alt="Vista de árbol de procesos mostrando cmd.exe generando procdump.exe que a su vez genera procdump64.exe, con ambas detecciones asociadas a procdump64.exe" width="1045" height="585" loading="lazy" decoding="async">
  <figcaption>Figura 5: vista de árbol de procesos — <code>cmd.exe</code> → <code>procdump.exe</code> → <code>procdump64.exe</code>, la ascendencia exacta que produce la prueba #1 de Atomic Red Team. Tanto SYS-073 como SYS-109 dispararon sobre <code>procdump64.exe</code>, confirmando que se correlacionaron por linaje compartido de <code>ProcessGuid</code>, no solo por cercanía temporal.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/procdump-psexec-false-positive/06_timeline.png' | relative_url }}" alt="Vista de línea de tiempo interactiva mostrando SYS-073 y SYS-109 registradas con el mismo timestamp de ingesta" width="1055" height="582" loading="lazy" decoding="async">
  <figcaption>Figura 6: vista de línea de tiempo del mismo incidente — SYS-073 y SYS-109 quedaron registradas a las <code>18:31:01</code> UTC, el momento en que el script de replay ingirió el evento, no el momento en que Sysmon lo registró originalmente (<code>18:28:09–10</code> UTC).</figcaption>
</figure>

**Hora del evento (Sysmon, original):** `2026-08-24T18:28:09–10 UTC`
**Hora de detección (consola, ingesta del replay):** `2026-08-24T18:31:01 UTC`

Esta brecha de ~3 minutos es un artefacto del replay batch, no latencia real
de detección — el script de replay procesa todo el archivo `.evtx` de una vez,
después del hecho. Para medir el MTTD real haría falta un feed en vivo de
Winlogbeat; lo que valida esta corrida es que la regla *dispara correctamente*,
no qué tan rápido lo haría en producción.

---

## Análisis

**SYS-109 disparó como se esperaba** — confirma que la cobertura documentada
de sysmon-hunter para ProcDump contra LSASS funciona de punta a punta contra
telemetría real de Atomic Red Team, no solo contra el corpus de muestra usado
durante el desarrollo.

**La correlación funcionó como está documentada.** SYS-109 y SYS-073
compartieron la misma ascendencia de `ProcessGuid` (`cmd.exe` → `procdump.exe`
→ `procdump64.exe`) y se agruparon correctamente en un solo incidente en vez
de aparecer como dos alertas desconectadas — exactamente el comportamiento
que describen los documentos de diseño del proyecto.

**SYS-073 ("PsExec service binary executed") es un falso positivo genuino, y
rastrearlo hasta el origen de la regla confirma exactamente por qué.** Las
líneas de comando crudas del detalle del incidente mostraron a SYS-073
disparando sobre la misma línea que SYS-109:

```
C:\AtomicRedTeam\atomics\..\ExternalPayloads\procdump.exe -accepteula -ma lsass.exe C:\Windows\Temp\lsass_dump.dmp
```

Ningún `PSEXESVC.exe` en ninguna parte de esa cadena — entonces, ¿por qué
disparó una regla específica de PsExec? Revisar el origen de la regla
(`rules/process_creation/psexec_service_execution.yml`) lo responde
directamente:

```yaml
id: SYS-073
title: PsExec service binary executed on this host
detection:
  image|endswith:
    - '\PSEXESVC.exe'
  command_line|contains:
    - '-accepteula'
condition: any
```

`condition: any` significa que estas dos cláusulas están unidas por OR, no
por AND. La regla claramente estaba pensada para atrapar dos artefactos
distintos de PsExec — la imagen del servicio *o* el flag delator del
cliente — pero al escribirse como una sola regla con `any` en vez de dos
reglas (o una condición `all` acotada a la imagen), también dispara con
**cualquier** línea de comando que contenga `-accepteula`, sin importar qué
binario esté corriendo. ProcDump trae exactamente el mismo flag de EULA de
Sysinternals, así que activa la misma regla que PsExec.

**Corrección propuesta:** dividirla en dos reglas, o exigir tanto
`image|endswith: '\PSEXESVC.exe'` como `-accepteula` juntos en la rama del
flag de PsExec — el flag por sí solo no es evidencia de PsExec, solo de
*alguna* herramienta de Sysinternals.

**SYS-009 (download cradle) cayó en un incidente separado, no en el de acceso
a credenciales** — no comparte raíz de árbol de procesos con la cadena de
ProcDump (su raíz es `powershell.exe`, del paso `-GetPrereqs` que descarga
`procdump.exe`). Esto es adquisición legítima de herramientas administrativas,
no un cradle de un atacante — un caso donde la etiqueta es técnicamente
correcta pero el contexto (un paso de configuración de laboratorio, no
staging de malware en vivo) importa para el triage.

---

## Conclusiones

- Las exportaciones de `.evtx` sin acotar producen demasiado ruido para una
  prueba limpia de una sola técnica — acotar por timestamp es un paso
  necesario, no opcional.
- El enfoque documentado de sysmon-hunter de validar reglas contra muestras
  se sostiene contra telemetría real de pruebas atómicas, no solo contra su
  propio corpus de validación.
- La correlación por árbol de procesos vía `ProcessGuid` efectivamente agrupa
  detecciones relacionadas en un solo incidente, coincidiendo con el
  comportamiento descrito en los documentos de diseño.
- **Causa raíz confirmada para SYS-073:** la `condition: any` de la regla
  une con OR un chequeo de nombre de imagen con un chequeo de flag en la
  línea de comando en vez de exigir ambos — dividirla en dos reglas, o exigir
  la imagen de PsExec junto con el flag, para que deje de disparar con otras
  herramientas de Sysinternals no relacionadas como ProcDump.
- El replay batch mide si una regla dispara correctamente, no el MTTD real —
  eso requiere un feed en vivo de Winlogbeat, una iteración natural siguiente
  de este laboratorio.

---

## Evidencia

Exportación `.evtx` cruda y logs JSON de sysmon-hunter disponibles a pedido.

</div>
