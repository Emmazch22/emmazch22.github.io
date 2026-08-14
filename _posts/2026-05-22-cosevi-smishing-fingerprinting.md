---
title: "Inside a COSEVI Smishing Campaign: Fingerprinting and Conditional Phishing Delivery"
title_es: "Dentro de una campaña de smishing COSEVI: fingerprinting y entrega condicional de phishing"
date: 2026-05-22
tags: [smishing, phishing-kit, fingerprinting, costa-rica, anti-analysis, cosevi]
excerpt: >-
  A smishing campaign impersonating COSEVI (Costa Rica) served a harmless
  "Meridian Cloud" SaaS decoy to scanners and sandboxes, while fingerprinting real mobile visitors
  to deliver a full bank-card and OTP harvesting flow.
bilingual: true
---

<div class="lang-content" data-lang="en" markdown="1">

## TL;DR

- Analysis of a smishing campaign targeting Costa Rica, impersonating COSEVI (the national traffic safety agency)
- The initial site looked completely harmless — a static SaaS-style landing page ("Meridian Cloud"), no working forms or links
- The kit implemented **browser fingerprinting and traffic classification** to decide whether to serve benign content or the real phishing flow
- Automated analysis tools (URLScan, Browserling, VMs) only ever received the facade; real mobile devices received an entirely different credential-harvesting flow
- The kit included DevTools detection, behavior scoring, and card capture plus bank OTP interception

---

## Context

I received an SMS with a link (`cosevik.cc/cr`) impersonating COSEVI — a common smishing pattern in Costa Rica: "pending traffic violation" messages designed to create urgency so the victim clicks without thinking twice.

What made this case interesting wasn't the pretext — that part is standard — but what happened when I tried to analyze it.

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/smishing-sms.jpg' | relative_url }}" alt="Screenshot of the SMS message impersonating COSEVI, linking to cosevik.cc/cr">
  <figcaption>The original smishing SMS impersonating COSEVI, warning of a "pending judicial collection" and linking to <code>cosevik.cc/cr</code> — an urgency-driven pretext designed to trigger an impulsive click.</figcaption>
</figure>

## First impression: a "dead" site

Visiting the domain showed a static landing page with generic "Meridian Cloud" branding, mimicking a legitimate corporate SaaS platform. No hyperlink worked, no visible forms — at first glance it looked like abandoned or placeholder infrastructure.

The domain itself (`.cc`, unrelated to any known entity in Costa Rica) was already a red flag, but the lack of "active" content didn't match the expected pattern for a live smishing campaign.

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/decoy-landing.jpg' | relative_url }}" alt="Illustrative screenshot of the decoy SaaS landing page shown at cosevik.cc/cr in a normal desktop browser">
  <figcaption>Illustrative capture of the decoy pattern: a generic SaaS landing page ("Meridian Cloud" at the time of this analysis) served to a normal desktop browser at <code>cosevik.cc/cr</code>, with no working links or forms — the benign content shown to anything that fails the kit's fingerprint check.</figcaption>
</figure>

## First indicator: inconsistent behavior depending on the environment

Running the link through automated analysis tools — URLScan, Browserling, and virtual machines — always returned the same result: the harmless landing page. But the attack vector (SMS) pointed specifically at mobile devices.

That discrepancy — sandboxes and crawlers seeing something different from what a real victim would see — is the classic signature of a **fingerprinting and conditional content delivery system**.

## Dissecting the fingerprinting mechanism

Inspecting the response from the `/cr` endpoint, I found a script responsible for generating an identification cookie before deciding what to serve:

```javascript
var ts = Math.floor(Date.now() / 1000);
var nav = (navigator.userAgent || '').length;
var scr = (screen.width || 0) * (screen.height || 0);

document.cookie = '_bc=' + token;
window.location.reload();
```

The logic is simple but effective: it pulls basic browser characteristics (user-agent length, screen resolution, timestamp), generates an identifier, stores it in a temporary cookie (`_bc`), and reloads the page. That cycle gives the backend a chance to classify the visitor — sandbox/crawler vs. real mobile device — before deciding which version of the site to show.

**Key point for detection**: this pattern (fingerprint → cookie → reload) is reproducible as a behavioral IOC, not just a domain-based one. A kit that rewrites its own response based on client characteristics is harder to catch with a simple URL scanner, but the "reload conditioned on fingerprint" pattern is identifiable in proxy/DNS telemetry if you know what to look for.

## Reproducing real-victim conditions

To reach the kit's actual content, I had to replicate an environment that would "pass" the fingerprint check. Using Firefox in responsive mode configured specifically as an iPhone 14 Pro Max (real mobile resolution, mobile user-agent, no throttling, direct browsing without proxy or extensions), the server delivered content completely different from the initial landing page.

This step confirmed the kit wasn't relying on User-Agent alone — it validated consistency across multiple browser signals (rendering engine, resolution, touch behavior), which rules out superficial UA spoofing as an analysis method.

## The real phishing flow

Once the "real" content was served, the flow convincingly replicated a government procedure:

1. **Violation lookup** — initial screen simulating an official COSEVI verification, with careful visual branding and a mobile-optimized layout
2. **Violation details** — ticket number, location, legal article cited, and amount due, designed to create psychological pressure through the implicit threat of surcharges or legal restrictions
3. **Card capture** — a full form for cardholder name, card number, expiration date, and CVV, with additional support for capturing a bank OTP

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/violation-lookup.jpg' | relative_url }}" alt="Screenshot of the violation lookup screen in the real phishing flow, with browser DevTools open">
  <figcaption>Step 1 — the real phishing flow, only reachable by spoofing an iPhone 14 Pro Max in responsive mode. DevTools' Network panel (right) shows the kit loading its own JS/CSS bundle and hitting endpoints like <code>/geoinfo</code>, <code>/handshake</code>, and <code>/credentials</code>.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/violation-detail.jpg' | relative_url }}" alt="Screenshot of the fabricated traffic violation detail screen">
  <figcaption>Step 2 — a fabricated traffic violation with plate number, legal article, and amount due, engineered to create payment pressure with a fake 40% early-payment "discount."</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/card-capture.jpg' | relative_url }}" alt="Screenshot of the bank card capture form">
  <figcaption>Step 3 — the credential-harvesting form capturing full card number, expiration, and CVV, styled to look like a legitimate Costa Rican payment page listing recognizable local banks.</figcaption>
</figure>

The kit's internal HTML/configuration explicitly defined the flow's routes:

```json
"pages": [
  {"path": "/index"},
  {"path": "/bill"},
  {"path": "/card"}
]
```

And specific support for intercepting bank verification codes:

```json
"otp": {"enabled": true}
```

The kit included verification templates aimed at capturing the OTP code immediately after the card data theft — meaning it wasn't just stealing the card, but designed to complete the fraud in real time before the victim could react.

## Embedded anti-analysis mechanisms

Beyond the initial fingerprinting, the kit's panel configuration revealed several additional layers of evasion:

```json
"detectDevTools": true,
"behaviorScoreThreshold": 4,
"block_bot": "1"
```

This indicates:
- **Active DevTools detection** — likely alters or blocks content when developer tools are detected open
- **Behavior scoring** — visitor classification beyond a binary check, suggesting a cumulative "suspicion" threshold
- **Dynamic bot blacklisting** — active blocking of traffic identified as automated

The theme configuration also confirmed explicit regional targeting:

```json
"name": "哥斯达黎加 COSEVI重构版",
"homepage": "https://www.cosevi.go.cr/"
```

The Chinese-language reference ("Costa Rica — reconstructed COSEVI version") suggests the kit was sourced or deployed from a phishing-as-a-service provider, with the COSEVI theme as just one template among several available — consistent with the business model of phishing kits sold on underground forums.

## Why this matters for detection

This case illustrates a real shift in the sophistication of phishing kits targeting the region:

- **Analyzing the domain or static HTML alone is no longer enough** — malicious content can be entirely hidden behind server-side fingerprinting logic
- **Automated scanners (URLScan, sandboxes) can produce false negatives** on campaigns implementing this kind of evasion, which has direct implications for any detection pipeline relying on threat intel feeds built from automated scanning
- **The behavioral pattern (fingerprint → cookie → conditional reload) is a more durable IOC** than the domain itself, which is disposable

For an MDR/SOC team, the practical takeaway is that the absence of visible malicious content in an automated scan is not evidence that a domain is benign — especially in campaigns targeting a specific vector (SMS, geographic region, device type).

## Observed indicators

| Type | Value |
|---|---|
| Domain | `cosevik.cc` |
| Entry path | `/cr` |
| Fingerprinting cookie | `_bc` |
| Impersonated brand | COSEVI (Costa Rica) |
| Kit routes | `/index`, `/bill`, `/card` |

---

*This analysis was conducted solely for defensive research purposes. No real data was ever entered — exploring the capture flow was done only to document the attack's structure.*

</div>

<div class="lang-content" data-lang="es" markdown="1" hidden>

## TL;DR

- Análisis de una campaña de smishing dirigida a Costa Rica, suplantando al COSEVI (Consejo de Seguridad Vial)
- El sitio inicial se veía completamente inofensivo — una landing estática tipo SaaS ("Meridian Cloud"), sin formularios ni links funcionales
- El kit implementaba **fingerprinting del navegador y clasificación de tráfico** para decidir si servir contenido benigno o el phishing real
- Herramientas de análisis automatizado (URLScan, Browserling, VMs) recibían solo la fachada; dispositivos móviles reales recibían el flujo de robo de credenciales bancarias
- El kit incluía detección de DevTools, scoring de comportamiento, y captura de tarjeta + OTP bancario

---

## Contexto

Recibí un SMS con un link (`cosevik.cc/cr`) suplantando al COSEVI, un patrón común de smishing en Costa Rica: mensajes de "infracción pendiente" que generan urgencia para que la víctima haga clic sin pensarlo dos veces.

Lo que hizo este caso interesante no fue el pretexto — eso es estándar — sino lo que pasó al intentar analizarlo.

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/smishing-sms.jpg' | relative_url }}" alt="Captura del mensaje SMS suplantando al COSEVI, enlazando a cosevik.cc/cr">
  <figcaption>El SMS de smishing original suplantando al COSEVI, advirtiendo sobre un "cobro judicial" pendiente y enlazando a <code>cosevik.cc/cr</code> — un pretexto basado en urgencia diseñado para provocar un clic impulsivo.</figcaption>
</figure>

## Primera impresión: un sitio "muerto"

Al visitar el dominio, la página mostraba una landing estática con branding genérico de "Meridian Cloud", simulando ser una plataforma SaaS corporativa legítima. Ningún hipervínculo funcionaba, no había formularios visibles, y a primera vista parecía infraestructura abandonada o un placeholder.

Ya el dominio en sí (`.cc`, sin relación con ninguna entidad conocida en Costa Rica) era una señal de alerta, pero la falta de contenido "activo" no encajaba con el patrón esperado de una campaña de smishing en curso.

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/decoy-landing.jpg' | relative_url }}" alt="Captura ilustrativa de la landing señuelo tipo SaaS mostrada en cosevik.cc/cr en un navegador de escritorio normal">
  <figcaption>Captura ilustrativa del patrón de señuelo: una landing genérica tipo SaaS ("Meridian Cloud" al momento de este análisis) servida a un navegador de escritorio normal en <code>cosevik.cc/cr</code>, sin enlaces ni formularios funcionales — el contenido inofensivo mostrado a cualquier visitante que no pasa el chequeo de fingerprint del kit.</figcaption>
</figure>

## El primer indicador: comportamiento inconsistente según el entorno

Al correr el enlace por herramientas de análisis automatizado — URLScan, Browserling, y máquinas virtuales — el resultado era siempre el mismo: la landing inofensiva. Pero el vector del ataque (SMS) apuntaba específicamente a dispositivos móviles.

Esa discrepancia — sandboxes y crawlers viendo algo distinto a lo que vería una víctima real — es la firma clásica de un sistema de **fingerprinting y entrega condicional de contenido**.

## Diseccionando el mecanismo de fingerprinting

Inspeccionando la respuesta del endpoint `/cr`, encontré un script encargado de generar una cookie de identificación antes de decidir qué servir:

```javascript
var ts = Math.floor(Date.now() / 1000);
var nav = (navigator.userAgent || '').length;
var scr = (screen.width || 0) * (screen.height || 0);

document.cookie = '_bc=' + token;
window.location.reload();
```

La lógica es simple pero efectiva: toma características básicas del navegador (longitud del user-agent, resolución de pantalla, timestamp), genera un identificador, lo guarda en una cookie temporal (`_bc`), y recarga la página. Ese ciclo le da al backend la oportunidad de clasificar al visitante — sandbox/crawler vs. dispositivo móvil real — antes de decidir qué versión del sitio mostrar.

**Punto clave para detección**: este patrón (fingerprint → cookie → reload) es replicable como IOC de comportamiento, no solo de dominio. Un kit que reescribe su propia respuesta según características del cliente es más difícil de detectar con un scanner de URL simple, pero el patrón de "reload condicionado por fingerprint" sí es identificable en telemetría de proxy/DNS si se sabe qué buscar.

## Reproduciendo las condiciones de una víctima real

Para llegar al contenido real del kit, tuve que replicar un entorno que "pasara" la validación de fingerprint. Usando Firefox en modo responsive configurado específicamente como iPhone 14 Pro Max (resolución móvil real, user-agent móvil, sin throttling, navegación directa sin proxy ni extensiones), el servidor entregó un contenido completamente distinto al de la landing inicial.

Este paso confirmó que el kit no dependía solo del User-Agent — validaba consistencia entre múltiples señales del navegador (motor de renderizado, resolución, comportamiento de touch), lo que descarta spoofing superficial de UA como método de análisis.

## El flujo de phishing real

Una vez servido el contenido "real", el flujo replicaba de forma convincente un trámite gubernamental:

1. **Consulta de infracción** — pantalla inicial simulando verificación oficial del COSEVI, con branding visual cuidado y diseño optimizado para móvil
2. **Detalle de la infracción** — número de boleta, ubicación, artículo legal infringido, y monto a pagar, diseñado para generar presión psicológica mediante amenaza implícita de recargos o restricciones legales
3. **Captura bancaria** — formulario completo para nombre del titular, número de tarjeta, fecha de vencimiento y CVV, con soporte adicional para captura de OTP bancario

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/violation-lookup.jpg' | relative_url }}" alt="Captura de la pantalla de consulta de infracciones del flujo real de phishing, con DevTools del navegador abierto">
  <figcaption>Paso 1 — el flujo real de phishing, alcanzable solo simulando un iPhone 14 Pro Max en modo responsive. El panel Network de DevTools (derecha) muestra al kit cargando su propio bundle de JS/CSS y llamando a endpoints como <code>/geoinfo</code>, <code>/handshake</code> y <code>/credentials</code>.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/violation-detail.jpg' | relative_url }}" alt="Captura de la pantalla de detalle de la infracción fabricada">
  <figcaption>Paso 2 — una infracción de tránsito fabricada con número de placa, artículo legal y monto a pagar, diseñada para generar presión de pago mediante un falso "descuento" del 40% por pago anticipado.</figcaption>
</figure>

<figure class="post-figure">
  <img src="{{ '/assets/images/writeups/cosevi-smishing/card-capture.jpg' | relative_url }}" alt="Captura del formulario de robo de datos de tarjeta bancaria">
  <figcaption>Paso 3 — el formulario de robo de datos bancarios, capturando número de tarjeta completo, vencimiento y CVV, con un diseño que imita una página de pago legítima costarricense listando bancos locales reconocibles.</figcaption>
</figure>

En el HTML/configuración interna del kit se podían ver las rutas del flujo definidas explícitamente:

```json
"pages": [
  {"path": "/index"},
  {"path": "/bill"},
  {"path": "/card"}
]
```

Y soporte específico para interceptar códigos de verificación bancaria:

```json
"otp": {"enabled": true}
```

El kit incluía plantillas de verificación orientadas a capturar el código OTP inmediatamente después del robo de datos de tarjeta — es decir, no solo roba la tarjeta, sino que está diseñado para completar el fraude en tiempo real antes de que la víctima pueda reaccionar.

## Mecanismos anti-analysis embebidos

Más allá del fingerprinting inicial, la configuración del panel del kit reveló varias capas adicionales de evasión:

```json
"detectDevTools": true,
"behaviorScoreThreshold": 4,
"block_bot": "1"
```

Esto indica:
- **Detección activa de DevTools** — probablemente altera o bloquea el contenido si detecta que las herramientas de desarrollador están abiertas
- **Scoring de comportamiento** — clasificación del visitante más allá de un check binario, sugiriendo un umbral acumulativo de "sospecha"
- **Blacklist dinámica de bots** — bloqueo activo de tráfico identificado como automatizado

La configuración del theme confirmaba además el targeting regional explícito:

```json
"name": "哥斯达黎加 COSEVI重构版",
"homepage": "https://www.cosevi.go.cr/"
```

La referencia en chino ("Costa Rica — versión reconstruida de COSEVI") sugiere que el kit fue adquirido o desplegado desde un proveedor de phishing-as-a-service, con el theme de COSEVI como una plantilla más entre varias disponibles — consistente con el modelo de negocio de kits de phishing comercializados en foros clandestinos.

## Por qué esto importa para detección

Este caso ilustra un cambio real en la sofisticación de los kits de phishing dirigidos a la región:

- **Ya no basta con analizar el dominio o el HTML estático** — el contenido malicioso puede estar completamente oculto detrás de lógica de fingerprinting server-side
- **Los scanners automatizados (URLScan, sandboxes) pueden dar falsos negativos** en campañas que implementan este tipo de evasión, lo cual tiene implicación directa para cualquier pipeline de detección que dependa de threat intel feeds basados en scanning automatizado
- **El patrón de comportamiento (fingerprint → cookie → reload condicional) es un IOC más robusto** que el dominio en sí, que es desechable

Para un equipo de MDR/SOC, la lección práctica es que la ausencia de contenido malicioso visible en un scan automatizado no es evidencia de que un dominio sea benigno — especialmente en campañas dirigidas a un vector específico (SMS, región geográfica, tipo de dispositivo).

## Indicadores observados

| Tipo | Valor |
|---|---|
| Dominio | `cosevik.cc` |
| Ruta de entrada | `/cr` |
| Cookie de fingerprinting | `_bc` |
| Marca suplantada | COSEVI (Costa Rica) |
| Rutas del kit | `/index`, `/bill`, `/card` |

---

*Este análisis se realizó exclusivamente con fines de investigación defensiva. No se ingresaron datos reales en ningún momento — la exploración del flujo de captura se hizo únicamente para documentar la estructura del ataque.*

</div>
