# 🎬 Guía de Demos AURA-172

Esta guía reúne todas las formas de demostrar el sistema: con hardware real, con
ESP32 virtuales por MQTT, con el simulador HTTP legado y con la app móvil/web.

---

## 0. Verificación previa del sistema

```bash
cd app
npm test          # 12 pruebas de lógica NOM-172, JSON, alertas e historial
npm run typecheck # verificación de TypeScript sin errores
```

Resultado esperado: `tests 12 · pass 12 · fail 0` y `tsc --noEmit` sin salida.

---

## 1. Demo con hardware real (ESP32 + sensores)

1. En `firmware/MiEntorno_ESP32/MiEntorno_ESP32.ino` elige el ID del nodo:
   ```cpp
   const char* NODO_ID = "nodo1";   // nodo2, nodo3… para cada ESP32 nuevo
   ```
2. Carga el firmware en el ESP32 desde Arduino IDE.
3. Alimenta el nodo y conéctate desde el celular a `ESP32_Aire_Config` si es la
   primera vez. Captura el SSID y la contraseña del Wi-Fi.
4. El nodo publicará cada 2 segundos en `colectivo/aire/nodo1` con este formato:
   ```json
   {
     "pm1": 8.2, "pm25": 14.5, "pm10": 22.1, "co": 1.8,
     "temp": 24.5, "hum": 58.0,
     "nivel_pm25": 0, "nivel_pm10": 0, "nivel_co": 0,
     "nivel_general": 0, "dominante": "PM2.5", "estado": "BUENA"
   }
   ```
5. En la app, la estación `Estación X` debe pasar a **En vivo** y mostrar los
   valores del sensor en el dashboard.

**Qué observar:** hero con el nivel NOM-172, tarjetas de PM2.5/PM10/CO,
temperatura/humedad, gráfica en vivo y LEDs/LCD del prototipo físico.

---

## 2. Demo multinodo sin hardware (recomendada)

Publica tres ESP32 virtuales en el broker público de HiveMQ con el mismo JSON
del firmware.

```bash
cd app
npm run demo:multinodo
```

Salida esperada (cada 2 segundos):

```text
[MQTT] Conectado al broker. Publicando telemetría…
colectivo/aire/nodo1 · PM2.5 11.0 · PM10 20.5 · CO 0.26 · BUENA
colectivo/aire/nodo2 · PM2.5 13.7 · PM10 24.5 · CO 0.25 · BUENA
colectivo/aire/nodo3 · PM2.5 70.2 · PM10 101.3 · CO 10.60 · MALA
```

- `nodo1` = **Estación X** (aire estable).
- `nodo2` = **Estación Norte** (tráfico medio).
- `nodo3` = **Estación Sur** (episodio de aire malo 20 s cada minuto).

### Registrar los nodos en la app

1. Abre la app → **Ajustes** → **Panel de Administración**.
2. Inicia sesión (`axelmtz9880@gmail.com` / `admin123`).
3. Toca **+ Agregar Nodo** y registra:
   | Nombre | Tópico MQTT | Broker |
   | :--- | :--- | :--- |
   | Estación Norte | `colectivo/aire/nodo2` | `broker.hivemq.com` |
   | Estación Sur | `colectivo/aire/nodo3` | `broker.hivemq.com` |
4. Usa **Activar** en la tarjeta del nodo para que la app se suscriba a él.
5. El dashboard debe mostrar la telemetría del nodo seleccionado en 2–5 s.

### Forzar una alerta

```bash
# Todos los nodos en aire MALO
node herramientas/demo-multinodo.mjs --malo

# Un solo nodo
node herramientas/demo-multinodo.mjs --solo nodo3 --malo
```

Con el umbral de alertas en **Mala**, la app debe abrir la vista de notificación
y mostrar el aviso de riesgo. Al detener el comando (`Ctrl + C`) y volver a
iniciar sin `--malo`, llegará el aviso de mejora.

---

## 3. Demo del simulador HTTP legado

Útil para probar la app sin internet, apuntando un nodo a la IP local de la PC.

```bash
cd app
npm run esp32-simulado        # puerto 8090
# o: node herramientas/esp32-simulado.mjs 8091
```

En la app, agrega un nodo con broker/dirección:

- En navegador: `localhost:8090`
- En teléfono en la misma Wi-Fi: `192.168.x.x:8090`

Rutas de prueba:

| Ruta | Efecto |
| :--- | :--- |
| `GET /api/lecturas` | Lectura actual en JSON |
| `GET /api/historial` | Últimas 24 h de muestras |
| `GET /simular/malo` | PM2.5 = 68 µg/m³ (Mala) |
| `GET /simular/normal` | Vuelve a aire normal |

---

## 4. Demo del Panel de Administración

1. Ajustes → Panel de Administración → login.
2. Observa el **Resumen de la red**: estaciones, admins y última muestra.
3. Revisa el **Diagnóstico de 3 capas**: ESP32, broker MQTT y aplicación.
4. **Agregar Nodo**: nombre, tópico, zona, broker y coordenadas.
5. **Editar**: cambia el nombre o el tópico de una estación existente.
6. **Activar**: haz que la app se suscriba a esa estación.
7. **Eliminar**: retira un nodo (siempre queda al menos uno).
8. **Nuevo Admin**: registra otro correo con acceso al panel.

---

## 5. Demo de alertas y grupos vulnerables

1. Ajustes → **Notificaciones y alertas de riesgo**.
2. Activa “Notificar si el aire empeora” y elige el nivel **Mala**.
3. Activa “Avisar cuando mejore”.
4. Activa **Población sensible** y elige un grupo (niños, adultos mayores, etc.).
5. Ejecuta `node herramientas/demo-multinodo.mjs --malo`.
6. La app abre la pestaña **Notificación** con el aviso correspondiente.

---

## 6. Capturas de pantalla

Con la app web corriendo en `http://localhost:8081`:

```bash
cd app
npm install --no-save puppeteer-core
npm run capturas
```

Genera:

- `docs/app/capturas/01_dashboard_principal.png`
- `docs/app/capturas/02_pantalla_ajustes.png`
- `docs/app/capturas/03_panel_admin.png`

Requiere Microsoft Edge o Google Chrome instalado y la app corriendo en
`http://localhost:8081`.

---

## 7. Checklist rápido de la demo

- [ ] `npm test` y `npm run typecheck` sin errores.
- [ ] Firmware compila con el `NODO_ID` correcto para cada ESP32.
- [ ] El nodo real publica en `colectivo/aire/nodoX`.
- [ ] La app muestra **En vivo** y el nivel NOM-172 correcto.
- [ ] El admin puede agregar, editar y activar un nodo nuevo.
- [ ] La demo multinodo publica en nodo1, nodo2 y nodo3.
- [ ] El modo “Estación más cercana” enlaza por GPS usando las coordenadas.
- [ ] Las alertas de empeoramiento y mejora se disparan con el umbral elegido.
