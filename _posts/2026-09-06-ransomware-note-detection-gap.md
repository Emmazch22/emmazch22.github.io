---
title: "T1490 and T1486 vs. sysmon-hunter: A Second Look, and a Regression Check"
title_es: "T1490 y T1486 vs. sysmon-hunter: una segunda mirada y una prueba de regresión"
date: 2026-09-06
tags: [purple-team, detection-engineering, threat-hunting, mitre-attack, sysmon, ransomware]
excerpt: >-
  A purple-team run of Atomic Red Team's shadow-copy-deletion and ransomware
  tests against sysmon-hunter uncovers a Sysmon FileCreate allowlist blind
  spot hiding the ransom note from detection entirely, then confirms an
  earlier false-positive fix for a Tor-adjacent rule still holds against new
  telemetry.
bilingual: true
---

<div class="lang-content" data-lang="en" markdown="1">

## TL;DR

- **Techniques:** T1490 — Inhibit System Recovery (shadow copy deletion) and
  T1486 — Data Encrypted for Impact (simulated ransom note drop)
- **Result:** ✅ Both detected — `SYS-004` fired twice on the shadow copy
  deletion, `SYS-080` fired once on the ransom note, split into two incidents
  by process-tree ancestry
- **Bug found mid-exercise, and it wasn't the rule:** the ransom note produced
  no Sysmon FileCreate event at all on the first run. SwiftOnSecurity's Sysmon
  config treats FileCreate as an allowlist — specific extensions and folders
  only — and a plain `.txt` ransom note on the desktop isn't on it
- **Regression check:** replayed the same `.onion`-containing ransom note
  text that caused a false Tor detection under an earlier version of
  `SYS-189` in a prior exercise — the fixed rule stayed quiet this time,
  confirming the fix still holds

---

## Lab Setup: An Isolated Jump Box

This exercise involves deleting shadow copies and dropping ransomware
artifacts on disk — not something worth running on a VM with any live path
back to the host. So the lab topology changed from the previous exercise:

- FlareVM now sits on a VirtualBox Internal Network adapter only — no NAT, no
  route out
- A separate Kali VM has two adapters: one on that same internal network to
  reach FlareVM, one on NAT for its own connectivity
- Kali runs its own local copy of sysmon-hunter, so replay happens entirely
  inside the isolated network with nothing routing back to the host

The flow: FlareVM exports the `.evtx`, SCPs it to Kali over the internal
network, and `replay_evtx.py` feeds it into the sysmon-hunter instance
running on Kali itself.

---

## Hypothesis

sysmon-hunter's rule corpus has a rule for each technique: `SYS-004` for
shadow copy deletion, `SYS-080` for a ransom note dropped on disk, matched by
filename convention. Running Atomic Red Team's T1490 and T1486 tests should
trigger both.

---

## Execution

Atomic Red Team's own prerequisite check for T1490 fails on this Windows
build's version detection, so a shadow copy had to be created manually
before there was anything to delete:

```powershell
$class = [wmiclass]"Win32_ShadowCopy"
$class.Create("C:\", "ClientAccessible")
vssadmin list shadows
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/01_shadow_copy_created.png' | relative_url }}" alt="PowerShell console showing a shadow copy created via WMI and confirmed with vssadmin list shadows" width="1263" height="888" loading="lazy" decoding="async">
  <figcaption>Figure 1: A shadow copy created manually via the <code>Win32_ShadowCopy</code> WMI class, since Atomic Red Team's own T1490 prereq check fails on this build's Windows version detection. <code>vssadmin list shadows</code> confirms it exists before the deletion test runs.</figcaption>
</figure>

Then the actual test:

```powershell
(Get-Date).ToUniversalTime()
Invoke-AtomicTest T1490 -TestNumbers 1
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/02_t1490_execution.png' | relative_url }}" alt="Atomic Red Team executing T1490 test 1, running vssadmin delete shadows through cmd.exe" width="1262" height="888" loading="lazy" decoding="async">
  <figcaption>Figure 2: T1490 test #1 executing — <code>vssadmin delete shadows /all /quiet</code>, launched through <code>cmd.exe</code> at <code>2026-09-06T20:35:36 UTC</code>.</figcaption>
</figure>

```powershell
vssadmin list shadows
(Get-Date).ToUniversalTime()
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/03_t1490_verified.png' | relative_url }}" alt="vssadmin list shadows returning No items found after the T1490 deletion test" width="1266" height="882" loading="lazy" decoding="async">
  <figcaption>Figure 3: <code>vssadmin list shadows</code> returns "No items found," confirming the deletion worked.</figcaption>
</figure>

Next, the ransomware simulation:

```powershell
(Get-Date).ToUniversalTime()
Invoke-AtomicTest T1486 -TestNumbers 10
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/04_t1486_execution.png' | relative_url }}" alt="Atomic Red Team executing T1486 test 10, dropping an akira_readme.txt ransom note on the desktop" width="1259" height="886" loading="lazy" decoding="async">
  <figcaption>Figure 4: T1486 test #10 executing — drops <code>akira_readme.txt</code> on the desktop, a fairly standard ransom note referencing payment terms and a contact channel.</figcaption>
</figure>

---

## The FileCreate Blind Spot

Before even checking sysmon-hunter, I ran a query I'd skipped in the last
exercise: did Sysmon actually log a FileCreate event for the note being
written?

```powershell
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -MaxEvents 20 |
  Where-Object { $_.Id -eq 11 }
(Get-Date).ToUniversalTime()
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/05_filecreate_confirmed.png' | relative_url }}" alt="Sysmon Operational log showing FileCreate Event ID 11 entries after adjusting the Sysmon configuration" width="1264" height="868" loading="lazy" decoding="async">
  <figcaption>Figure 5: FileCreate (Event ID 11) entries in the Sysmon log — but only after adjusting the configuration. The first time this query ran, against the original SwiftOnSecurity config, nothing came back.</figcaption>
</figure>

Turns out the SwiftOnSecurity Sysmon config handles FileCreate as an
allowlist, not a blocklist. It only logs the event for a specific set of
extensions it considers dangerous — things like `.exe`, `.ps1`, `.dmp` — plus
a handful of folders like Downloads or Startup. A plain `.txt` file on the
desktop isn't on that list at all.

The logic behind that isn't crazy. It keeps log volume down by assuming a
text file is rarely the actual threat. But it also means a ransom note is
invisible to Sysmon by design, no matter how well the rule downstream is
written to catch it. I adjusted the Sysmon configuration to close that gap
and re-ran the test, which is what Figure 5 actually shows.

---

## Exporting and Moving the Logs

```powershell
Remove-Item C:\Users\Public\sysmon_export_ransomware*.evtx -Force -ErrorAction SilentlyContinue

wevtutil epl Microsoft-Windows-Sysmon/Operational C:\Users\Public\sysmon_export_ransomware.evtx /q:"*[System[TimeCreated[@SystemTime>='2026-09-06T20:35:00.000Z' and @SystemTime<='2026-09-06T20:40:00.000Z']]]"

Get-WinEvent -Path C:\Users\Public\sysmon_export_ransomware.evtx | Measure-Object
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/06_export_count.png' | relative_url }}" alt="PowerShell output showing 116 Sysmon events exported in the test time window" width="1258" height="889" loading="lazy" decoding="async">
  <figcaption>Figure 6: 116 events in the scoped export window.</figcaption>
</figure>

```powershell
Get-WinEvent -Path C:\Users\Public\sysmon_export_ransomware.evtx | Where-Object { $_.Id -eq 11 } | Measure-Object
Get-WinEvent -Path C:\Users\Public\sysmon_export_ransomware.evtx | Where-Object { $_.Message -match "vssadmin" } | Measure-Object
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/07_export_breakdown.png' | relative_url }}" alt="PowerShell output showing counts of FileCreate events and vssadmin-related events in the export" width="1261" height="884" loading="lazy" decoding="async">
  <figcaption>Figure 7: FileCreate and vssadmin activity were both present in the export. Both techniques were captured before this ever touched sysmon-hunter.</figcaption>
</figure>

```powershell
scp C:\Users\Public\sysmon_export_ransomware.evtx kali@192.168.100.20:/home/kali/
```

---

## Replay and Detection Result

```
python3 scripts/replay_evtx.py --file /home/kali/sysmon_export_ransomware.evtx
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/09_replay_after_fix.png' | relative_url }}" alt="Terminal output from replay_evtx.py showing SYS-004 firing twice and SYS-080 firing once" width="1276" height="952" loading="lazy" decoding="async">
  <figcaption>Figure 8: Replay result after the Sysmon config fix — <code>SYS-004</code> fired twice, <code>SYS-080</code> fired once. Both techniques caught.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/10_incident_queue.png' | relative_url }}" alt="sysmon-hunter console showing two incidents in the queue, both critical" width="1265" height="915" loading="lazy" decoding="async">
  <figcaption>Figure 9: Two incidents in the queue. "Ransomware preparation on DESKTOP-6VMFSGO" scored 28, CRITICAL, 2 detections, mapped to T1490. A separate incident covered the ransom note. They stayed apart because they're rooted in different process trees — <code>powershell.exe</code> on one side, <code>cmd.exe</code> spawning <code>vssadmin.exe</code> on the other — which makes sense since these were two unrelated atomic tests run moments apart.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/12_process_tree_destructive.png' | relative_url }}" alt="Process tree view for the ransom note incident showing the full command line including an onion domain reference" width="1267" height="919" loading="lazy" decoding="async">
  <figcaption>Figure 10: Process tree for the ransom note incident. The full command line behind the note includes a <code>hxxps[://]akira[.]onion</code> contact reference. In an earlier exercise, that exact kind of text caused a false Tor detection under an older version of a different rule, <code>SYS-189</code>, which used to match any command line containing <code>.onion</code> regardless of context. After that rule got split so it only fires on the real Tor binary or a genuine network reference, this run was the first time similar text showed up again in a fresh replay. It fired nothing related to Tor — the fix held.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/13_process_tree_shadow.png' | relative_url }}" alt="Process tree view for the shadow copy incident showing cmd.exe spawning vssadmin.exe" width="1262" height="955" loading="lazy" decoding="async">
  <figcaption>Figure 11: Process tree for the shadow copy incident — <code>cmd.exe</code> to <code>vssadmin.exe</code>, the same shape as the shadow copy detection from an earlier exercise, unaffected by anything in this run.</figcaption>
</figure>

---

## Analysis

From the outside, a missing detection can look like a rule problem when it's
actually a telemetry problem. The silence on the ransom note looked, at
first glance, like something `SYS-080` should have caught and didn't. It
would have been easy to go rewrite that rule without ever checking whether
Sysmon had logged the event in the first place. Checking the raw log
directly is what actually found the real issue, and the rule turned out to
be fine all along.

The other half of this exercise was quieter but just as worth doing. Running
the exact `.onion`-containing command line that broke `SYS-189` in an
earlier exercise, just to confirm it stayed quiet here too, took an extra
minute. A fix that works once is a good sign. A fix that still works the
next time unrelated telemetry happens to brush up against the same pattern
is what actually tells you it's solid.

---

## Takeaways

- Check whether the sensor logged the event before assuming a rule is
  broken. It takes one command and can save you from rewriting a rule that
  was never the problem.
- Allowlist-based logging, like Sysmon's default FileCreate config, trades
  log volume for blind spots on purpose. Know which one you're running
  before trusting silence as a clean result.
- Rerun old test cases against new fixes when you get the chance, not just
  the case the fix was written for. It's a small check and it's the
  difference between assuming something works and knowing it does.
- Keep incidents separated by process lineage rather than by time window.
  Two unrelated atomics running minutes apart shouldn't get merged into one
  incident just because they happened close together, and they didn't here.

---

## Evidence

Raw `.evtx` export and sysmon-hunter's JSON logs are available on request.

</div>

<div class="lang-content" data-lang="es" markdown="1" hidden>

## TL;DR

- **Técnicas:** T1490 — Inhibit System Recovery (borrado de shadow copies) y
  T1486 — Data Encrypted for Impact (nota de rescate simulada)
- **Resultado:** ✅ Ambas detectadas — `SYS-004` disparó dos veces con el
  borrado de shadow copies, `SYS-080` disparó una vez con la nota de rescate,
  separadas en dos incidentes por ascendencia del árbol de procesos
- **Bug encontrado a mitad del ejercicio, y no era la regla:** la nota de
  rescate no generó ningún evento FileCreate de Sysmon en la primera corrida.
  La configuración de Sysmon de SwiftOnSecurity trata FileCreate como una
  lista blanca — solo ciertas extensiones y carpetas — y un simple `.txt` en
  el escritorio no está en esa lista
- **Prueba de regresión:** se reprodujo el mismo texto de la nota de rescate
  que contiene un dominio `.onion` y que había causado una falsa detección de
  Tor bajo una versión anterior de `SYS-189` en un ejercicio previo — la
  regla corregida permaneció en silencio esta vez, confirmando que la
  corrección sigue funcionando

---

## Configuración del laboratorio: un jump box aislado

Este ejercicio implica borrar shadow copies y dejar artefactos de ransomware
en disco — no es algo que valga la pena correr en una VM con cualquier ruta
en vivo de vuelta al host. Así que la topología del laboratorio cambió
respecto al ejercicio anterior:

- FlareVM ahora está únicamente en un adaptador Internal Network de
  VirtualBox — sin NAT, sin salida
- Una VM Kali separada tiene dos adaptadores: uno en esa misma red interna
  para alcanzar a FlareVM, y otro en NAT para su propia conectividad
- Kali corre su propia copia local de sysmon-hunter, así que el replay ocurre
  completamente dentro de la red aislada, sin nada que regrese al host

El flujo: FlareVM exporta el `.evtx`, lo envía a Kali por SCP a través de la
red interna, y `replay_evtx.py` lo alimenta a la instancia de sysmon-hunter
que corre en el propio Kali.

---

## Hipótesis

El corpus de reglas de sysmon-hunter tiene una regla para cada técnica:
`SYS-004` para el borrado de shadow copies, `SYS-080` para una nota de
rescate en disco, identificada por convención de nombre de archivo. Correr
las pruebas T1490 y T1486 de Atomic Red Team debería disparar ambas.

---

## Ejecución

El propio chequeo de prerequisitos de Atomic Red Team para T1490 falla en la
detección de versión de Windows de este build, así que hubo que crear una
shadow copy manualmente antes de tener algo que borrar:

```powershell
$class = [wmiclass]"Win32_ShadowCopy"
$class.Create("C:\", "ClientAccessible")
vssadmin list shadows
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/01_shadow_copy_created.png' | relative_url }}" alt="Consola de PowerShell mostrando una shadow copy creada vía WMI y confirmada con vssadmin list shadows" width="1263" height="888" loading="lazy" decoding="async">
  <figcaption>Figura 1: una shadow copy creada manualmente vía la clase WMI <code>Win32_ShadowCopy</code>, ya que el propio chequeo de prerequisitos de T1490 de Atomic Red Team falla en la detección de versión de Windows de este build. <code>vssadmin list shadows</code> confirma que existe antes de correr la prueba de borrado.</figcaption>
</figure>

Luego la prueba en sí:

```powershell
(Get-Date).ToUniversalTime()
Invoke-AtomicTest T1490 -TestNumbers 1
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/02_t1490_execution.png' | relative_url }}" alt="Atomic Red Team ejecutando la prueba 1 de T1490, corriendo vssadmin delete shadows a través de cmd.exe" width="1262" height="888" loading="lazy" decoding="async">
  <figcaption>Figura 2: prueba #1 de T1490 ejecutándose — <code>vssadmin delete shadows /all /quiet</code>, lanzado a través de <code>cmd.exe</code> a las <code>2026-09-06T20:35:36 UTC</code>.</figcaption>
</figure>

```powershell
vssadmin list shadows
(Get-Date).ToUniversalTime()
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/03_t1490_verified.png' | relative_url }}" alt="vssadmin list shadows retornando No items found después de la prueba de borrado T1490" width="1266" height="882" loading="lazy" decoding="async">
  <figcaption>Figura 3: <code>vssadmin list shadows</code> retorna "No items found", confirmando que el borrado funcionó.</figcaption>
</figure>

A continuación, la simulación de ransomware:

```powershell
(Get-Date).ToUniversalTime()
Invoke-AtomicTest T1486 -TestNumbers 10
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/04_t1486_execution.png' | relative_url }}" alt="Atomic Red Team ejecutando la prueba 10 de T1486, dejando una nota de rescate akira_readme.txt en el escritorio" width="1259" height="886" loading="lazy" decoding="async">
  <figcaption>Figura 4: prueba #10 de T1486 ejecutándose — deja <code>akira_readme.txt</code> en el escritorio, una nota de rescate bastante estándar que menciona términos de pago y un canal de contacto.</figcaption>
</figure>

---

## El punto ciego de FileCreate

Antes incluso de revisar sysmon-hunter, corrí una consulta que me había
saltado en el ejercicio anterior: ¿Sysmon realmente registró un evento
FileCreate por la escritura de la nota?

```powershell
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -MaxEvents 20 |
  Where-Object { $_.Id -eq 11 }
(Get-Date).ToUniversalTime()
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/05_filecreate_confirmed.png' | relative_url }}" alt="Log Operational de Sysmon mostrando entradas de FileCreate Event ID 11 después de ajustar la configuración de Sysmon" width="1264" height="868" loading="lazy" decoding="async">
  <figcaption>Figura 5: entradas de FileCreate (Event ID 11) en el log de Sysmon — pero solo después de ajustar la configuración. La primera vez que corrió esta consulta, contra la configuración original de SwiftOnSecurity, no volvió nada.</figcaption>
</figure>

Resulta que la configuración de Sysmon de SwiftOnSecurity maneja FileCreate
como una lista blanca, no como una lista negra. Solo registra el evento para
un conjunto específico de extensiones que considera peligrosas — cosas como
`.exe`, `.ps1`, `.dmp` — más un puñado de carpetas como Downloads o Startup.
Un simple archivo `.txt` en el escritorio no está en esa lista para nada.

La lógica detrás de eso no es descabellada. Mantiene bajo el volumen de logs
asumiendo que un archivo de texto rara vez es la amenaza real. Pero también
significa que una nota de rescate es invisible para Sysmon por diseño, sin
importar qué tan bien esté escrita la regla que debería atraparla más
adelante en la cadena. Ajusté la configuración de Sysmon para cerrar esa
brecha y volví a correr la prueba, que es lo que realmente muestra la
Figura 5.

---

## Exportando y moviendo los logs

```powershell
Remove-Item C:\Users\Public\sysmon_export_ransomware*.evtx -Force -ErrorAction SilentlyContinue

wevtutil epl Microsoft-Windows-Sysmon/Operational C:\Users\Public\sysmon_export_ransomware.evtx /q:"*[System[TimeCreated[@SystemTime>='2026-09-06T20:35:00.000Z' and @SystemTime<='2026-09-06T20:40:00.000Z']]]"

Get-WinEvent -Path C:\Users\Public\sysmon_export_ransomware.evtx | Measure-Object
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/06_export_count.png' | relative_url }}" alt="Salida de PowerShell mostrando 116 eventos de Sysmon exportados en la ventana de tiempo de la prueba" width="1258" height="889" loading="lazy" decoding="async">
  <figcaption>Figura 6: 116 eventos en la ventana de exportación acotada.</figcaption>
</figure>

```powershell
Get-WinEvent -Path C:\Users\Public\sysmon_export_ransomware.evtx | Where-Object { $_.Id -eq 11 } | Measure-Object
Get-WinEvent -Path C:\Users\Public\sysmon_export_ransomware.evtx | Where-Object { $_.Message -match "vssadmin" } | Measure-Object
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/07_export_breakdown.png' | relative_url }}" alt="Salida de PowerShell mostrando el conteo de eventos FileCreate y de eventos relacionados con vssadmin en la exportación" width="1261" height="884" loading="lazy" decoding="async">
  <figcaption>Figura 7: tanto la actividad de FileCreate como la de vssadmin estaban presentes en la exportación. Ambas técnicas quedaron capturadas antes de que esto tocara sysmon-hunter.</figcaption>
</figure>

```powershell
scp C:\Users\Public\sysmon_export_ransomware.evtx kali@192.168.100.20:/home/kali/
```

---

## Replay y resultado de la detección

```
python3 scripts/replay_evtx.py --file /home/kali/sysmon_export_ransomware.evtx
```

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/09_replay_after_fix.png' | relative_url }}" alt="Salida de terminal de replay_evtx.py mostrando a SYS-004 disparando dos veces y a SYS-080 una vez" width="1276" height="952" loading="lazy" decoding="async">
  <figcaption>Figura 8: resultado del replay después de la corrección en Sysmon — <code>SYS-004</code> disparó dos veces, <code>SYS-080</code> una vez. Ambas técnicas capturadas.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/10_incident_queue.png' | relative_url }}" alt="Consola de sysmon-hunter mostrando dos incidentes en la cola, ambos críticos" width="1265" height="915" loading="lazy" decoding="async">
  <figcaption>Figura 9: dos incidentes en la cola. "Ransomware preparation on DESKTOP-6VMFSGO" con puntaje 28, CRITICAL, 2 detecciones, mapeado a T1490. Un incidente separado cubrió la nota de rescate. Se mantuvieron separados porque tienen raíces en árboles de procesos distintos — <code>powershell.exe</code> de un lado, <code>cmd.exe</code> generando <code>vssadmin.exe</code> del otro — lo cual tiene sentido ya que eran dos pruebas atómicas no relacionadas corridas con minutos de diferencia.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/12_process_tree_destructive.png' | relative_url }}" alt="Vista de árbol de procesos del incidente de la nota de rescate mostrando la línea de comando completa, incluida una referencia a un dominio onion" width="1267" height="919" loading="lazy" decoding="async">
  <figcaption>Figura 10: árbol de procesos del incidente de la nota de rescate. La línea de comando completa detrás de la nota incluye una referencia de contacto <code>hxxps[://]akira[.]onion</code>. En un ejercicio anterior, ese mismo tipo de texto causó una falsa detección de Tor bajo una versión más antigua de otra regla, <code>SYS-189</code>, que solía coincidir con cualquier línea de comando que contuviera <code>.onion</code> sin importar el contexto. Después de que esa regla se dividiera para que solo dispare con el binario real de Tor o una referencia de red genuina, esta corrida fue la primera vez que un texto similar volvió a aparecer en un replay nuevo. No disparó nada relacionado con Tor — la corrección se mantuvo.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/ransomware-note-detection-gap/13_process_tree_shadow.png' | relative_url }}" alt="Vista de árbol de procesos del incidente de shadow copy mostrando a cmd.exe generando vssadmin.exe" width="1262" height="955" loading="lazy" decoding="async">
  <figcaption>Figura 11: árbol de procesos del incidente de shadow copy — <code>cmd.exe</code> a <code>vssadmin.exe</code>, la misma forma que la detección de shadow copy de un ejercicio anterior, sin verse afectada por nada en esta corrida.</figcaption>
</figure>

---

## Análisis

Desde afuera, una detección faltante puede parecer un problema de regla
cuando en realidad es un problema de telemetría. El silencio sobre la nota
de rescate parecía, a primera vista, algo que `SYS-080` debería haber
atrapado y no lo hizo. Habría sido fácil ir a reescribir esa regla sin nunca
verificar si Sysmon había registrado el evento en primer lugar. Revisar el
log crudo directamente fue lo que realmente encontró el problema real, y la
regla resultó estar bien todo el tiempo.

La otra mitad de este ejercicio fue más silenciosa pero igual de necesaria.
Correr la línea de comando exacta con el dominio `.onion` que rompió
`SYS-189` en un ejercicio anterior, solo para confirmar que aquí también se
mantenía en silencio, tomó un minuto extra. Una corrección que funciona una
vez es una buena señal. Una corrección que sigue funcionando la próxima vez
que telemetría no relacionada roza el mismo patrón es lo que realmente te
dice que es sólida.

---

## Conclusiones

- Verificar si el sensor registró el evento antes de asumir que una regla
  está rota. Toma un solo comando y puede ahorrarte reescribir una regla que
  nunca fue el problema.
- El registro basado en listas blancas, como la configuración de FileCreate
  por defecto de Sysmon, intercambia volumen de logs por puntos ciegos a
  propósito. Hay que saber cuál se está corriendo antes de confiar en el
  silencio como un resultado limpio.
- Volver a correr casos de prueba antiguos contra correcciones nuevas cuando
  se pueda, no solo el caso para el que se escribió la corrección. Es una
  verificación pequeña y es la diferencia entre asumir que algo funciona y
  saber que funciona.
- Mantener los incidentes separados por linaje de procesos en lugar de por
  ventana de tiempo. Dos pruebas atómicas no relacionadas corriendo con
  minutos de diferencia no deberían fusionarse en un solo incidente solo
  porque ocurrieron cerca en el tiempo, y aquí no ocurrió.

---

## Evidencia

La exportación `.evtx` cruda y los logs JSON de sysmon-hunter están
disponibles a pedido.

</div>
