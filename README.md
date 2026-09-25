# TrailCoach

Tu entrenador personal de ultra trail running. Web app privada (funciona como app instalable en el móvil, PWA), pensada específicamente para corredores de ultra trail — no para running de ruta. Es multiusuario: cada persona crea su propia cuenta (email + contraseña) y sus datos se guardan en tu propio servidor, en una base de datos SQLite — nada en la nube de terceros salvo lo que cada usuario conecte (Strava, y opcionalmente la IA de Claude).

## Qué hace

- **Motor de entrenamiento basado en metodologías reales de resistencia y ultra trail**, no un calendario genérico de running: combina periodización por bloques, distribución de intensidad polarizada/piramidal, back-to-back long runs y especificidad de montaña, y decide cada semana qué mezcla aplica según tu carrera objetivo, tu nivel (inferido de tu historial), tu disponibilidad y tu fatiga real — no un PDF fijo de 12-16 semanas. Ver `server/methodology.js` y el apartado "¿En qué se basa?" dentro de la propia app para el detalle.
- La temporada se divide sola en fases **Base → Construcción → Específico → Máxima especificidad (Peak) → Afinado → Carrera → Recuperación**, con una semana de descarga cada 4 semanas de carga.
- Cada sesión trae explicado **por qué la recibes y qué adaptación busca** (no solo "qué toca hacer"), y cubre en detalle lo propio de ultra trail: tiradas largas, back-to-back, subida corriendo vs power hiking, bajada técnica y trabajo excéntrico, fuerza unilateral y de gemelo/sóleo, uso de bastones, nutrición e hidratación en sesión, entrenamiento con fatiga acumulada, simulacros de carrera y afinado.
- Cargas el **track GPX** de una carrera y calcula distancia, desnivel positivo/negativo, perfil y las subidas/bajadas principales — el plan prioriza más la bajada técnica cuanto más desnivel negativo tenga tu carrera o más cerca esté.
- Cada día haces un **check-in** ("estoy cansado", "me pesan las piernas", "solo tengo 1 hora") y el entreno de hoy se adapta al momento — y si hace falta, se recalcula en cascada el resto del plan para no perder progresión ni duplicar cargas duras. Si no haces check-in pero tu carga reciente ya muestra mucha fatiga acumulada, la app te avisa igualmente.
- Puedes pedir cambios en **lenguaje natural** ("esta semana solo puedo 3 días", "múdame la tirada larga al domingo") y la IA reorganiza el tramo del plan respetando tus sesiones bloqueadas y las reglas de un entrenador (nunca dos días duros seguidos, etc.).
- La pantalla **Hoy** te dice si vas "en camino" o llevas varios días flojeando (sesiones no hechas o muy recortadas), con un resumen de los últimos 30 días y tus próximos entrenos.
- Pones tu **objetivo de tiempo** para la carrera y la app te dice si es realista comparado con tu historial y el perfil de la carrera; cerca del día, genera un **plan de carrera** con el reparto de tiempo por tramo, avituallamientos y bases de vida, ritmo objetivo ajustado a cada subida/bajada, y hora estimada de paso por cada punto.
- Apartado de **nutrición**: registras qué tomaste en cada entreno (gel, minuto, cómo te sentó, con presets de marcas habituales) y la app te dice qué productos te funcionan y cuáles evitar de cara a la carrera, con objetivos de carbohidrato/sodio por hora según tu peso y la duración prevista.
- La **fuerza** se adapta a lo que prefieras: gimnasio, rocódromo/escalada, calistenia o circuito en casa — mismos objetivos (piernas de frenado, core, agarre), ejercicios distintos, con más peso en el control excéntrico y el trabajo a una pierna cuanto más cerca está la carrera.
- **Sincroniza con Strava**, automáticamente en segundo plano al abrir la app: importa tus actividades reales, las empareja con lo planificado y calcula tu carga de entrenamiento (Forma/CTL, Fatiga/ATL, Frescura/TSB — el mismo modelo que usan TrainingPeaks o el "Fitness & Freshness" de Strava). Como COROS y Suunto sincronizan de forma nativa con Strava, conectar solo Strava es suficiente para traer tus entrenos de esos relojes también.
- Estima tu **VO2max aproximado** a partir de tu mejor esfuerzo llano reciente (fórmulas de Jack Daniels y Jimmy Gilbert, las mismas detrás de las tablas VDOT).
- Foto de perfil real (no un icono), y funciona correctamente como PWA instalada en el móvil (el service worker se actualiza solo, sin tener que reinstalar la app a mano).
- Guardas tu **historial de carreras pasadas**, que se usa para estimar tu ritmo en la próxima.
- **Recuperación de contraseña** por email y **borrado de cuenta** (con todos sus datos) desde Ajustes → Cuenta, para cumplir con el derecho a la supresión de datos.

Las recomendaciones de nutrición, fuerza y metodología están basadas en guías con evidencia (citadas dentro de la propia app, en Nutrición, en Ajustes → fuerza, y en Análisis → "¿En qué se basa?").

## Antes de nada: pruébalo en local

```bash
npm install
node server/index.js
```

Abre `http://localhost:3000`, crea tu cuenta (email + contraseña) y añade tu primera carrera en la pestaña **Plan → Carreras**.

## Desplegarlo en un servidor propio (recomendado)

Necesitas un VPS pequeño (con 1 GB de RAM sobra; Hetzner CX22 ronda 4-5 €/mes) y un dominio o subdominio apuntando a su IP (un registro DNS tipo A). El despliegue usa Docker y Caddy, que gestiona el certificado HTTPS automáticamente.

1. **Alquila el servidor** (Hetzner, DigitalOcean...) con Ubuntu 22.04/24.04, e instala Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. **Apunta un dominio** a la IP del servidor: crea un subdominio, por ejemplo `trail.tudominio.com`, con un registro A hacia esa IP. Si no tienes dominio propio, puedes usar uno gratuito tipo DuckDNS.
3. **Copia este proyecto** al servidor (por ejemplo con `git` o `scp -r`).
4. **Configura las variables de entorno**:
   ```bash
   cp .env.example .env
   nano .env      # rellena DOMAIN, SESSION_SECRET, y lo opcional
   ```
   Genera un secreto de sesión con `openssl rand -hex 32`.
5. **Levanta todo**:
   ```bash
   docker compose up -d --build
   ```
   Caddy pedirá el certificado HTTPS automáticamente la primera vez (tarda unos segundos). A partir de ahí, `https://trail.tudominio.com` es tu app, accesible desde el ordenador y desde el móvil — y cada persona que quieras que la use crea su propia cuenta desde ahí.
6. **Instálala como app en el móvil**: abre esa URL en Chrome (Android) o Safari (iPhone) y usa "Añadir a pantalla de inicio" / "Instalar app". Queda como un icono más, sin barra de navegador.

Para actualizar tras un cambio: `git pull && docker compose up -d --build`.
Los datos viven en un volumen de Docker (`trailcoach-data`), así que sobreviven a los reinicios y actualizaciones.

## Conectar Strava

Cada usuario conecta su propia cuenta de Strava desde su perfil; los tokens se guardan por usuario, no son compartidos.

1. Entra en [strava.com/settings/api](https://www.strava.com/settings/api) y crea una aplicación:
   - **Nombre**: TrailCoach (o lo que quieras).
   - **Website**: `https://trail.tudominio.com`
   - **Authorization Callback Domain**: `trail.tudominio.com` (sin `https://`, sin barra al final).
2. Strava te da un **Client ID** y un **Client Secret**. Ponlos en tu `.env` (son de la app, no de cada usuario):
   ```
   STRAVA_CLIENT_ID=12345
   STRAVA_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   STRAVA_REDIRECT_URI=https://trail.tudominio.com/api/strava/callback
   ```
3. Reinicia (`docker compose up -d`), abre la app → pestaña **Historial** → **Conectar con Strava**, autoriza el acceso, y ya puedes sincronizar. A partir de ahí, la app sincroniza sola en segundo plano cada vez que la abres (como mucho cada 20 min), además del botón manual.

Se importan solo tus datos: distancia, tiempo, desnivel y frecuencia cardiaca media, para calcular tu carga de entrenamiento real y compararla con lo planificado. Como COROS y Suunto ya sincronizan de forma nativa con Strava, no hace falta una integración aparte para esos relojes.

## Activar los ajustes con IA (opcional pero recomendado)

Las reglas fijas del check-in (cansado / piernas pesadas / poco tiempo / enfermo) funcionan sin nada más. Si además quieres poder escribirle peticiones libres tipo "esta semana solo puedo entrenar 3 días" y que reorganice el plan con criterio:

1. Crea una cuenta en [console.anthropic.com](https://console.anthropic.com/) y genera una API key.
2. Añádela a tu `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Reinicia el contenedor.

El coste de uso personal (unos pocos mensajes al día, por usuario) suele ser de céntimos al mes.

## Activar la recuperación de contraseña por email (necesario antes de tener usuarios reales)

Sin esto configurado, "¿Olvidaste tu contraseña?" genera el enlace de recuperación pero **solo queda escrito en el
log del servidor** — no le llega el correo a nadie. Para que funcione de verdad:

1. Consigue credenciales SMTP de cualquier proveedor (Resend, Brevo, Amazon SES, o tu propio Gmail con una
   [contraseña de aplicación](https://myaccount.google.com/apppasswords)).
2. Rellena en tu `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
3. Reinicia (`docker compose up -d`).

## Activar cobros con Stripe (necesario antes de cobrar por la app)

Sin `STRIPE_SECRET_KEY` y `STRIPE_PRICE_MONTHLY` configurados, la app no exige pago a nadie: es el estado por
defecto, pensado para que puedas probarla o usarla tú mismo sin más pasos. En cuanto los configuras, cada cuenta
nueva arranca con **14 días de prueba gratuita** y, al terminar, necesita suscribirse para seguir entrenando (puede
seguir viendo su cuenta, suscribirse o borrarse, pero no usar el resto de la app). El cobro se hace con Stripe
Checkout y el Portal de cliente de Stripe — páginas alojadas por Stripe — así que el servidor nunca ve ni toca datos
de tarjeta.

1. Crea una cuenta en [Stripe](https://dashboard.stripe.com) (puedes probar todo esto en modo test primero).
2. En **Productos**, crea un producto "TrailCoach" con dos precios recurrentes:
   - Mensual: 9,99 € / mes
   - Anual: 99,90 € / año (equivale a 2 meses gratis frente al mensual)
   Copia el ID de cada precio (`price_...`).
3. En **Desarrolladores → Webhooks**, añade un endpoint apuntando a `https://tudominio.com/api/stripe/webhook`,
   escuchando al menos estos eventos: `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copia el "signing secret" (`whsec_...`).
4. Rellena en tu `.env`: `STRIPE_SECRET_KEY` (clave secreta, `sk_...`), `STRIPE_PRICE_MONTHLY`,
   `STRIPE_PRICE_YEARLY` y `STRIPE_WEBHOOK_SECRET`.
5. Reinicia (`docker compose up -d`). Prueba una suscripción de principio a fin con una
   [tarjeta de test de Stripe](https://docs.stripe.com/testing) antes de pasar a claves reales (`sk_live_...`).

## Antes de vender esto a otras personas

La app es funcionalmente sólida, pero "funciona bien" y "listo para cobrar por ello" no son lo mismo. Antes de
lanzarlo como producto de pago, revisa esto:

- [ ] **Pide a Strava aprobación como app multiusuario.** Su API limita cuántos atletas puede tener conectados una
  app sin revisar ("single-player"); pasado ese límite hay que solicitar aprobación en
  [strava.com/settings/api](https://www.strava.com/settings/api), que puede tardar. Pídelo con tiempo, antes de
  tener usuarios de pago esperando.
- [ ] **Configura SMTP** (ver arriba) — sin esto, nadie puede recuperar su contraseña.
- [ ] **Rellena `public/privacy.html` y `public/terms.html`** con tus datos reales (están marcados con
  `[TU NOMBRE/EMAIL]`) y haz que un abogado las revise, sobre todo por tratarse de datos de salud/actividad física
  bajo RGPD si vas a operar en la UE.
- [ ] **Prueba el registro/login/recuperación de contraseña en dispositivos reales** (iOS y Android), no solo en el
  navegador de escritorio.

Ya están cubiertos: cuentas por usuario con contraseña con hash, límite de intentos de login/registro (protección
básica contra fuerza bruta), recuperación de contraseña (con SMTP configurado), borrado de cuenta con todos sus
datos (derecho a la supresión), cobro con Stripe (prueba de 14 días + mensual/anual, ver arriba) y backups: si
despliegas en Render con disco persistente, ya hace snapshots diarios automáticos con 7 días de retención (panel
del disco → pestaña "Snapshots"); en otro proveedor, automatiza tú una copia periódica del SQLite (por ejemplo,
`sqlite3 .backup` a almacenamiento externo tipo S3/Backblaze).

## Estructura del proyecto

```
server/
  index.js      Rutas HTTP y autenticación (multiusuario: email + contraseña por cuenta)
  db.js         Esquema SQLite y acceso a datos
  methodology.js Selección de metodología: fase de temporada, polarizado/piramidal, nivel del
                atleta, énfasis de bajada/back-to-back, adaptación continua por fatiga real
  planner.js    Generador del plan semanal (a partir de lo que decide methodology.js)
  workouts.js   Traduce cada sesión a título + descripción + "por qué" para el atleta
  knowledge.js  Guías con evidencia: nutrición, fuerza, metodología, zonas de FC
  adjust.js     Motor de ajuste diario (check-in con reglas + IA) y recálculo en cascada
  load.js       Modelo de carga de entrenamiento (TRIMP de Banister → CTL/ATL/TSB)
  vo2.js        Estimación de VO2max a partir del mejor esfuerzo llano reciente
  gpx.js        Lectura de tracks GPX (distancia, desnivel, perfil, subidas/bajadas)
  pacing.js     Plan de carrera: ritmo por tramo, avituallamientos, hora estimada de paso
  nutrition.js  Registro y recomendaciones de nutrición en carrera
  adherence.js  Estado de "vas en camino" a partir del cumplimiento reciente del plan
  strava.js     Integración con Strava (por usuario) y sincronización automática en segundo plano
  claude.js     Cliente de la API de Claude para ajustes en lenguaje natural
  mailer.js     Envío de correo (recuperación de contraseña) vía SMTP
  billing.js    Suscripción con Stripe (Checkout + Portal de cliente + webhook)
public/       Frontend (PWA en JavaScript puro, sin frameworks)
```

## Notas sobre el motor de entrenamiento

- La carga de cada sesión se estima con el modelo TRIMP de Banister, usando tu FC media (real, de Strava) o una estimación por tipo de sesión cuando no hay dato. De ahí salen Forma (CTL, 42 días), Fatiga (ATL, 7 días) y Frescura (TSB = Forma − Fatiga).
- La fase de cada semana (Base/Construcción/Específico/Peak/Afinado/Carrera/Recuperación) se calcula sola a partir de cuánto falta para tu próxima carrera objetivo; dentro de cada fase, el modelo de distribución de intensidad cambia entre polarizado y piramidal según lo que la fase necesita (ver `intensityModel()` en `methodology.js`).
- Tu nivel (principiante/intermedio/avanzado) se infiere del historial real — volumen del último año, ultra más larga terminada, carreras pasadas registradas — no hace falta rellenarlo a mano.
- Si en el momento de generar o recalcular el plan tu Frescura está muy negativa de verdad (no solo porque el bloque tocase subir), esa semana se recorta automáticamente: es la diferencia entre un calendario fijo y un sistema que mira tus datos reales.
- La progresión semanal sube de forma gradual (limitada a tu disponibilidad y horas máximas configuradas) con una semana de descarga cada 4 semanas de carga.
- Las semanas de recuperación tras una carrera objetivo y el afinado antes de la siguiente se calculan automáticamente según la distancia/desnivel de cada carrera.
- Marca una sesión como **bloqueada** (🔒) para que ni el recálculo automático ni un ajuste por IA la toquen.
