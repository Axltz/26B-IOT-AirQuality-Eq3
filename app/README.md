# AURA-172 · Aplicación (React Native + Expo)

Cliente web/móvil de **AURA-172 (Alerta Urbana de Riesgo Ambiental)**. Consume por MQTT/WebSockets la telemetría de los nodos ESP32, clasifica el riesgo con la **NOM-172-SEMARNAT-2023** y traduce el dato técnico en colores, mensajes y recomendaciones.

## Requisitos

- Node.js 22.13 o superior (Expo SDK 58).
- Dependencias: `npm install`.

## Comandos

```bash
npm start          # Expo (offline)
npm run web        # versión web
npm test           # pruebas de la lógica
npm run typecheck  # verificación de tipos
npm run iniciar-sesion  # iniciar sesión en Expo (si tu cuenta lo requiere)
```

## Histórico en Supabase

1. Copia `.env.example` como `.env.local` y pon la Project URL y la clave **publicable** (`sb_publishable_…`). Reinicia Expo para que tome los valores. Sin estas variables la app funciona igual, solo con el historial local.
2. Para el APK, `.env.local` no se sube a EAS (está en `.gitignore`). Da de alta las variables en el entorno de EAS que usa cada perfil (`eas.json` → `environment`):

   ```bash
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://TU_PROYECTO.supabase.co --visibility plaintext
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --visibility plaintext
   ```

   Repite con `--environment development` o `production` si usas esos perfiles.

La tabla y sus permisos están en `supabase/migrations/`; el envío desde el ESP32 se configura en `firmware/MiEntorno_ESP32/secretos.h` (ver el README principal).

## Cuenta de Expo del equipo

El proyecto vive en la organización de Expo **`amiguelv05s-team`** (`owner` y
`extra.eas.projectId` en `app.json`). Ambos valores son los mismos para todo el
equipo: **no los cambies ni corras `eas init`**.

1. Crea tu cuenta gratis en [expo.dev](https://expo.dev) y pide que te agreguen
   como miembro de la organización (expo.dev → organización → *Members*).
2. Inicia sesión en tu computadora: `npm run iniciar-sesion`.
3. Comprueba el acceso: `node herramientas/configurar-cuenta.mjs` debe decir
   *"tiene acceso al proyecto @amiguelv05s-team/mi-entorno"*.
4. En el iPhone, inicia sesión en Expo Go con tu cuenta para abrir el proyecto.

Para generar el APK con EAS Build:

```bash
npm run build:android
```

## Flujo de datos

1. El PMS5003 mide PM1, PM2.5 y PM10 (µg/m³); el firmware publica esas tres fracciones cada 2 segundos en `colectivo/aire/<NODO_ID>` usando `broker.hivemq.com`.
2. La app se suscribe por WebSockets (puerto 8884) y actualiza la pantalla en vivo.
3. El payload incluye `pm1`, `pm25`, `pm10`, `co`, `temp`, `hum`, `nivel_pm25`, `nivel_pm10`, `nivel_co`, `nivel_general`, `dominante` y `estado`.
4. Cada ESP32 guarda además una muestra por minuto en la tabla `lecturas` de Supabase. Al abrirse (y al volver del segundo plano), la app trae de ahí lo que pasó mientras estaba cerrada y lo fusiona con su historial local (una muestra por minuto, últimas 26 h, guardado en el teléfono).
5. Si no hay telemetría, la app muestra **SIN SEÑAL**: nunca asume un estado verde falso.

## Pantallas principales

- **Resumen**: estado de riesgo, contaminante dominante, parámetros y tendencia reciente.
- **Ajustes**: umbrales de alerta, grupos vulnerables y notificaciones.
- **Panel de Administración**: alta, edición, activación y baja de nodos (nombre, tópico, broker, zona y coordenadas).

## Estructura

```text
src/app/          pantallas (Expo Router)
src/componentes/  encabezado, resumen, gráfica, hojas y panel admin
src/estado/       monitor ambiental y sesión de administración
src/logica/       NOM-172, confort, alertas y grupos vulnerables
src/modelos/      lecturas, ajustes y estaciones
src/servicios/    cliente MQTT, histórico en Supabase, almacenamiento y notificaciones
pruebas/          suite de pruebas de la lógica
herramientas/     configuración de cuenta e inicio de sesión de Expo
```

El firmware correspondiente está en `firmware/MiEntorno_ESP32/MiEntorno_ESP32.ino`. La guía de demos con nodos reales está en `docs/demos/GUIA_DEMOS.md`.
