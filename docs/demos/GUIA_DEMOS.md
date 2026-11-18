# Guía de demos de AURA-172

Demostraciones del sistema con nodos reales: verificación de la lógica, puesta en marcha del ESP32, administración de estaciones y alertas.

---

## 0. Verificación previa

```bash
cd app
npm test          # pruebas de lógica NOM-172, payload, alertas e historial
npm run typecheck # verificación de TypeScript
```

Resultado esperado: pruebas en verde y `tsc --noEmit` sin salida.

---

## 1. Demo con hardware real

1. En `firmware/MiEntorno_ESP32/MiEntorno_ESP32.ino` elige el identificador del nodo:

   ```cpp
   const char* NODO_ID = "nodo1";   // nodo2, nodo3… para cada ESP32 nuevo
   ```

2. Carga el firmware en el ESP32 desde Arduino IDE.
3. Alimenta el nodo y, si es la primera vez, conéctate desde el celular a `ESP32_Aire_Config` para capturar el SSID y la contraseña del Wi-Fi.
4. El nodo publica cada 2 segundos en `colectivo/aire/nodo1` con este formato:

   ```json
   {
     "pm1": 8.2, "pm25": 14.5, "pm10": 22.1, "co": 1.8,
     "temp": 24.5, "hum": 58.0,
     "nivel_pm25": 0, "nivel_pm10": 0, "nivel_co": 0,
     "nivel_general": 0, "dominante": "PM2.5", "estado": "BUENA"
   }
   ```

5. En la app, la estación activa debe pasar a **En vivo** y mostrar los valores del sensor.

El PMS5003 entrega **PM1, PM2.5 y PM10**; la NOM-172 clasifica PM2.5 y PM10, mientras que PM1 se muestra como dato complementario.

**Qué observar:** el semáforo físico y la app coinciden en los cinco estados de la NOM-172; el hero jerarquiza el contaminante dominante; la gráfica muestra la tendencia de la sesión; la LCD alterna riesgo y microclima.

### Histórico con la app cerrada

Con `secretos.h` configurado (ver README, sección 2), el nodo guarda una fila por minuto en Supabase:

1. Cierra la app y deja el nodo encendido unos minutos.
2. En el Monitor Serial debe aparecer `[SUPABASE] Lectura guardada en el histórico.` cada minuto.
3. Abre la app: la gráfica **Últimas 12 h** ya incluye esos minutos, aunque la app no estuvo abierta.

---

## 2. Sumar un nodo desde la app

1. Abre **Ajustes → Panel de Administración** e inicia sesión.
2. Toca **+ Agregar Nodo** y registra nombre, tópico (`colectivo/aire/nodo2`), broker (`broker.hivemq.com`), zona y coordenadas.
3. Usa **Activar** en la tarjeta del nodo para suscribirte a él.
4. Verifica que el dashboard muestre la telemetría del nodo seleccionado en unos segundos.

El panel también permite editar, dar de baja nodos y registrar administradores.

---

## 3. Demo de alertas y grupos vulnerables

1. Ajustes → **Notificaciones y alertas de riesgo**.
2. Activa “Notificar si el aire empeora” y elige el umbral (por ejemplo, **Mala**).
3. Activa “Avisar cuando mejore” y selecciona un grupo de población sensible.
4. Genera una incidencia real en el entorno del nodo (por ejemplo, acercarlo a una fuente de humo) y observa el cambio de nivel.
5. La app abre la pestaña **Notificación** con el aviso correspondiente; al volver a un nivel seguro, llega el aviso de mejora.

---

## 4. Checklist rápido

- [ ] `npm test` y `npm run typecheck` sin errores.
- [ ] Firmware compilado con el `NODO_ID` correcto para cada ESP32.
- [ ] El nodo publica en `colectivo/aire/nodoX`.
- [ ] La app muestra **En vivo** y el nivel NOM-172 correcto.
- [ ] Llegan filas nuevas a **Table Editor → lecturas** de Supabase cada minuto.
- [ ] Semáforo físico, LCD y app coinciden en los cinco estados.
- [ ] El administrador puede agregar, editar y activar un nodo nuevo.
- [ ] Las alertas de empeoramiento y mejora se disparan con el umbral elegido.

> Nota: la arquitectura está preparada para 1, 10 o 20 nodos. El consumo de datos abiertos del SIMAJ y el enlace LoRaWAN forman parte de la hoja de ruta, no del estado actual.
