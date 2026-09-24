# TrailCoach

Tu entrenador personal de ultra trail. Web app privada (funciona como app instalable en el móvil, PWA) pensada para preparar la **CDH 110K (Val d'Aran by UTMB, 9 de julio de 2027)** y el **UTMB**. Los datos se guardan en tu propio servidor, en una base de datos SQLite — nada en la nube de terceros salvo lo que tú conectes (Strava, y opcionalmente la IA de Claude).

## Qué hace

- Generas un **plan de entrenamiento periodizado** (base → construcción → específico → afinado → carrera → recuperación) a partir de tus carreras objetivo, con tiradas largas, días de doble tirada (back-to-back), desnivel, series, fuerza y descansos.
- Cargas el **track GPX** de una carrera y calcula distancia, desnivel positivo/negativo, perfil y las subidas/bajadas principales.
- Cada día haces un **check-in** ("estoy cansado", "me pesan las piernas", "solo tengo 1 hora") y el entreno de hoy se adapta al momento — y si hace falta, se recalcula en cascada el resto del plan para no perder progresión ni duplicar cargas duras.
- Puedes pedir cambios en **lenguaje natural** ("esta semana solo puedo 3 días", "múdame la tirada larga al domingo") y la IA reorganiza el tramo del plan respetando tus sesiones bloqueadas y las reglas de un entrenador (nunca dos días duros seguidos, etc.).
- La pantalla **Hoy** te dice si vas "en camino" o llevas varios días flojeando (sesiones no hechas o muy recortadas), con un resumen de los últimos 30 días y tus próximos entrenos.
- Pones tu **objetivo de tiempo** para la carrera y la app te dice si es realista comparado con tu historial y el perfil de la carrera; cerca del día, genera un **plan de carrera** con el reparto de tiempo por tramo, avituallamientos y bases de vida, ritmo objetivo ajustado a cada subida/bajada, y hora estimada de paso por cada punto.
- Apartado de **nutrición**: registras qué tomaste en cada entreno (gel, minuto, cómo te sentó) y la app te dice qué productos te funcionan y cuáles evitar de cara a la carrera, con objetivos de carbohidrato/sodio por hora según tu peso y la duración prevista.
- La **fuerza** se adapta a lo que prefieras: gimnasio, rocódromo/escalada, calistenia o circuito en casa — mismos objetivos (piernas de frenado, core, agarre), ejercicios distintos.
- **Sincroniza con Strava**: importa tus actividades reales, las empareja con lo planificado y calcula tu carga de entrenamiento (Forma/CTL, Fatiga/ATL, Frescura/TSB — el mismo modelo que usan TrainingPeaks o Strava's Fitness & Freshness).
- Guardas tu **historial de carreras pasadas**, que se usa para estimar tu ritmo en la próxima.

Las recomendaciones de nutrición y fuerza están basadas en guías con evidencia (citadas dentro de la propia app, en Nutrición y en Ajustes → fuerza).

## Antes de nada: pruébalo en local

```bash
npm install
APP_PASSWORD=tuclave node server/index.js
```

Abre `http://localhost:3000`, entra con la contraseña que hayas puesto y añade tu primera carrera en la pestaña **Carreras**. Sin `APP_PASSWORD` la app arranca sin login (solo recomendable en local).

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
   nano .env      # rellena DOMAIN, APP_PASSWORD, SESSION_SECRET, y lo opcional
   ```
   Genera un secreto de sesión con `openssl rand -hex 32`.
5. **Levanta todo**:
   ```bash
   docker compose up -d --build
   ```
   Caddy pedirá el certificado HTTPS automáticamente la primera vez (tarda unos segundos). A partir de ahí, `https://trail.tudominio.com` es tu app, accesible desde el ordenador y desde el móvil.
6. **Instálala como app en el móvil**: abre esa URL en Chrome (Android) o Safari (iPhone) y usa "Añadir a pantalla de inicio" / "Instalar app". Queda como un icono más, sin barra de navegador.

Para actualizar tras un cambio: `git pull && docker compose up -d --build`.
Los datos viven en un volumen de Docker (`trailcoach-data`), así que sobreviven a los reinicios y actualizaciones.

## Conectar Strava

1. Entra en [strava.com/settings/api](https://www.strava.com/settings/api) y crea una aplicación:
   - **Nombre**: TrailCoach (o lo que quieras).
   - **Website**: `https://trail.tudominio.com`
   - **Authorization Callback Domain**: `trail.tudominio.com` (sin `https://`, sin barra al final).
2. Strava te da un **Client ID** y un **Client Secret**. Ponlos en tu `.env`:
   ```
   STRAVA_CLIENT_ID=12345
   STRAVA_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   STRAVA_REDIRECT_URI=https://trail.tudominio.com/api/strava/callback
   ```
3. Reinicia (`docker compose up -d`), abre la app → pestaña **Historial** → **Conectar con Strava**, autoriza el acceso, y ya puedes sincronizar tus actividades con el botón correspondiente.

Se importan solo tus datos: distancia, tiempo, desnivel y frecuencia cardiaca media, para calcular tu carga de entrenamiento real y compararla con lo planificado.

## Activar los ajustes con IA (opcional pero recomendado)

Las reglas fijas del check-in (cansado / piernas pesadas / poco tiempo / enfermo) funcionan sin nada más. Si además quieres poder escribirle peticiones libres tipo "esta semana solo puedo entrenar 3 días" y que reorganice el plan con criterio:

1. Crea una cuenta en [console.anthropic.com](https://console.anthropic.com/) y genera una API key.
2. Añádela a tu `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Reinicia el contenedor.

El coste de uso personal (unos pocos mensajes al día) suele ser de céntimos al mes.

## Estructura del proyecto

```
server/       Backend (Node + Express + SQLite nativo, sin dependencias pesadas)
  planner.js    Generador del plan periodizado
  adjust.js     Motor de ajuste diario (reglas + IA)
  load.js       Modelo de carga de entrenamiento (CTL/ATL/TSB)
  gpx.js        Lectura de tracks GPX
  strava.js     Integración con Strava
  claude.js     Cliente de la API de Claude para ajustes en lenguaje natural
public/       Frontend (PWA en JavaScript puro, sin frameworks)
```

## Notas sobre el modelo de entrenamiento

- La carga de cada sesión se estima con el modelo TRIMP de Banister, usando tu FC media (real, de Strava) o una estimación por tipo de sesión cuando no hay dato.
- La progresión semanal sube de forma gradual (limitada a tu disponibilidad y horas máximas configuradas) con una semana de asimilación cada 4 semanas de carga.
- Las semanas de descarga tras una carrera objetivo y el afinado antes de la siguiente se calculan automáticamente según la distancia/desnivel de cada carrera.
- Marca una sesión como **bloqueada** (🔒) para que ni el recálculo automático ni un ajuste por IA la toquen.
