# AURA-172 · Sistema de diseño

Propuestas de identidad visual para la app móvil (Expo / React Native).
Vista interactiva de las cuatro propuestas: [`propuestas.html`](./propuestas.html).

- **Color primario:** `#BCE954` (lima)
- **Color secundario:** `#00D0F0` (cian)
- **Referencias:** diseño actual de la app (`app/src/tema.ts`) y el portal SIMAJ (aire.jalisco.gob.mx).

---

## 0. Propuesta elegida: Atmósfera (v2)

Se trabaja sobre **P2 · Atmósfera** con tres cambios respecto a la versión inicial.

### 0.1 Fondo a pantalla completa
El degradado del nivel cubre **toda la pantalla, hasta abajo**, y queda fijo mientras el contenido se desplaza encima (en RN: `LinearGradient` con `StyleSheet.absoluteFill` detrás del `ScrollView`). Ya no hay cabecera redondeada.

| Nivel | Degradado (155°) | Texto sobre el fondo |
|---|---|---|
| Buena | `#7FD98F` → `#BCE954` → `#00D0F0` (marca) | `#0F2A2F` |
| Aceptable | `#FBE27A` → `#F2C230` | `#0F2A2F` |
| Mala | `#F9C35A` → `#F28A2E` | `#0F2A2F` |
| Muy mala | `#A3261A` → `#E04A3A` | `#FFFFFF` |
| Extremadamente mala | `#55215A` → `#8E3B8C` | `#FFFFFF` |

Texto secundario sobre el fondo: `rgba(15,42,47,.72)` en niveles claros y `rgba(255,255,255,.82)` en Muy mala y Extremadamente mala.
Las tarjetas son blancas, sin borde, con sombra `0 12 26 -18 rgba(0,0,0,.45)` (en Android, `elevation: 4`).
Botón principal: fondo `#0F2A2F` con texto lima `#BCE954`, para que no se pierda sobre el degradado. Botón secundario: blanco.

**Solo Inicio y Contaminantes cambian de fondo según el nivel.** Alerta, Ajustes y Administración usan un fondo fijo y **sólido** (sin degradado), en pastel de los colores de marca.

| Vista | Fondo |
|---|---|
| Inicio, Contaminantes | Degradado del nivel (tabla anterior) |
| Alerta | Azul pastel `#CFF5FA` (cian `#00D0F0` al ~20 % sobre blanco) |
| Ajustes | Verde pastel `#EEF9D4` (lima `#BCE954` al ~25 % sobre blanco) |
| Administración | Azul pastel `#CFF5FA` |

En los fondos pastel, el texto principal es `#0F2A2F` y el secundario `rgba(15,42,47,.68)`.

En Alerta, con el fondo pastel, la palabra del nivel y el indicador de 1 a 5 usan el color de texto del nivel (`lt`), y el anillo del rostro usa el color de relleno (`lv`) al 35 %.

### 0.2 Mensaje de nivel protagonista
Componente `MensajeNivel`, usado en Inicio y en Alerta:
1. **Rostro**: círculo blanco de 54 px con un anillo translúcido de 6 px. Los ojos y la boca usan el color de texto del nivel (`lt`). La boca va de sonrisa amplia (Buena) a ceño fruncido con cejas (Extremadamente mala).
2. Eyebrow ("Calidad del aire ahora" / "El aire empeoró a" / "El aire mejoró a") y riesgo en 13.5 px / 700.
3. **Palabra del nivel** en Sora 800, 46 px, interlineado 0.92 y espaciado −0.04 em. "Extremadamente mala" va en 28 px y ocupa dos líneas.
4. **Indicador de 1 a 5**: cinco barras de 18 px de ancho con alturas de 6 a 14 px; las barras hasta el nivel actual van opacas y las demás al 28 %. Al lado: "Nivel N de 5 · NOM-172".
5. Animación de entrada al cambiar de nivel: el rostro hace *pop* (escala 0.6 → 1, 600 ms) y la palabra sube 6 px (450 ms). Se desactiva con "reducir movimiento".

En las tarjetas de contaminante se usa la versión compacta, `FranjaNivel`: una franja superior con el color de relleno del nivel, un rostro de 28 px, el nombre del nivel y el riesgo alineado a la derecha.

### 0.3 Medidor semicircular (tomado de Nocturno)
Reemplaza la barra de 5 tramos en Inicio, Contaminantes (PM2.5 y CO) y Alerta.
- Arco de 180°, radio 90, trazo de 12 px con extremos redondeados; 5 segmentos con los colores `lv` y separación de 1.2 % entre ellos.
- Marcador: círculo de radio 10, relleno de superficie y borde de 4 px en `texto`.
- Al centro, la cifra en Sora 600 de 40 px; debajo, la unidad.
- Extremos rotulados: `0` y `130+` (PM2.5) o `16+` (CO).
- La posición del marcador usa `posicionBarra()` de `calidadAire.ts`, sin cambios.
- En RN: `react-native-svg` (ya instalado).

### 0.4 Barra de navegación inferior
Barra flotante presente en todas las vistas, fija a 10 px del borde inferior y con 12 px de margen lateral.

| Pestaña | Ícono | Vistas |
|---|---|---|
| Inicio | casa | Inicio |
| Contaminantes | pulso | Contaminantes |
| Alertas | campana | Alerta |
| Ajustes | engrane | Ajustes, Administración (se abre desde Ajustes) |

- Contenedor: blanco al 94 % con desenfoque de 10 px, radio 24, padding 6, sombra `0 14 30 -14 rgba(0,0,0,.45)`.
- Pestaña: ícono de 19 px y etiqueta DM Sans 600 de 9 px, sin salto de línea; inactiva en `#58706F`.
- Ancho: las pestañas se reparten el espacio con `flex: 1`, salvo **Contaminantes**, que lleva `flex: 1.55` para que su etiqueta (~69 px) quepa completa. En un teléfono de 300 px de ancho queda en ~78 px y las demás en ~52 px.
- Pestaña activa: píldora de radio 18 con fondo `#0F2A2F` e ícono y texto en lima `#BCE954`, igual que el botón principal.
- En RN: `Tabs` de expo-router con un `tabBar` propio (posición absoluta y `insets.bottom` de `react-native-safe-area-context`). Hay que sumar la altura de la barra (~64 px) al `paddingBottom` de cada `ScrollView`.

### 0.5 Modo oscuro
Mismo esqueleto y mismas reglas: el fondo cambia según el nivel solo en Inicio y Contaminantes.

**Fondos**
| Vista | Claro | Oscuro |
|---|---|---|
| Inicio, Contaminantes · Buena | `#7FD98F → #BCE954 → #00D0F0` | `160deg, mix(#BCE954 34%, #0B1A1F) → mix(#00D0F0 20%, #0B1A1F)` |
| Inicio, Contaminantes · otros niveles | Degradado del nivel (0.1) | `160deg, mix(lv 40%, #0B1A1F) → mix(lv 10%, #0B1A1F)` |
| Alerta, Administración | `#CFF5FA` | `#0B323B` (azul profundo) |
| Ajustes | `#EEF9D4` | `#213625` (verde profundo) |

En oscuro, el texto sobre el fondo es `#EAF4F2` en todos los niveles y el secundario `rgba(234,244,242,.72)`.

**Tokens**
| Token | Claro | Oscuro |
|---|---|---|
| superficie (tarjetas) | `#FFFFFF` | `#13292F` |
| superficie2 / relleno | `#EEF3E7` | `#1B353C` |
| texto | `#0F2A2F` | `#E8F3F1` |
| textoSuave | `#58706F` | `#8FA4AA` |
| borde | `#E1E9DA` | `#22414A` |
| botón principal | fondo `#0F2A2F`, texto `#BCE954` | fondo `#BCE954`, texto `#0C1E24` |
| chip / segmento activo | `#0F2A2F` / `#FFFFFF` | `#BCE954` / `#0C1E24` |
| toggle activo | pista `#0F2A2F`, perilla `#BCE954` | pista `#BCE954`, perilla `#0C1E24` |
| accionTexto (lima) | `#4E6B0F` | `#BCE954` |
| sistemaTexto (cian) | `#00748A` | `#3FDDF5` |
| accionSuave / sistemaSuave | `#EEF9D2` / `#DDF7FC` | `#1F3A2A` / `#0E3A45` |
| peligro / peligroSuave | `#B32A1D` / `#FCE6E2` | `#FF7A6B` / `#3A1F22` |
| rostro (fondo del círculo) | `#FFFFFF` | `#13292F` |
| franja de nivel (texto) | `#0F2A2F` (Muy mala y Extrema: `#FFFFFF`) | `#0C1E24` en todos |
| barra inferior | `rgba(255,255,255,.94)`, inactiva `#58706F` | `rgba(19,41,47,.92)`, inactiva `#8FA4AA` |
| pestaña activa | `#0F2A2F` / `#BCE954` | `#BCE954` / `#0C1E24` |
| sombra de tarjeta | `0 12 26 -18 rgba(0,0,0,.45)` | `0 14 30 -16 rgba(0,0,0,.75)` |

**Semáforo en oscuro** (relleno y texto): `#4ED07A`, `#F5CF3A`, `#FF9A3D`, `#FF5C4D`, `#C77DCA` (texto de Extremadamente mala: `#D79BDA`).

**Contraste medido (WCAG):** texto sobre los degradados de nivel ≥ 5.5:1; sobre `#0B323B` 12.2:1 y sobre `#213625` 11.6:1; texto suave ≥ 5.0:1; colores del semáforo sobre las tarjetas ≥ 5.0:1.

En RN, el modo sigue `useColorScheme()`, con el selector Claro / Oscuro / Sistema de Ajustes.

---

## 1. Diagnóstico

### App actual
| Aspecto | Estado |
|---|---|
| Tipografía | Manrope 400–800, una sola familia |
| Fondo / superficie | `#F4F5F0` / `#FFFFFF` |
| Marca | Verde salvia `#4E9D66` y verde oscuro `#2F5A45` |
| Acentos | Coral, azul y ámbar sin un rol definido |
| Problema principal | `Paleta.verde` cumple dos funciones (marca y nivel **Buena**): aparece 37 veces en el código. Cuando el aire está bien, la pantalla entera es verde y el índice pierde fuerza. |
| Ausente | Modo oscuro, navegación inferior |

### SIMAJ (aire.jalisco.gob.mx)
El contenido real se sirve en un iframe desde `airejalisco.digital`.

| Aspecto | Valor medido |
|---|---|
| Tipografía | Montserrat (800 en titulares, ~38 px), Helvetica Neue en el mapa |
| Tinta principal | `#173D4C` / `#183946` (azul petróleo) |
| Texto | `#252B2E`, secundario `#566166` |
| Acento | Turquesa `#00C4B4`, teal oscuro `#006F68` |
| Logo | Naranja `#FF8300` + turquesa |
| Fondo | Gris azulado `#E3E9EC`, tarjetas blancas muy redondeadas |
| Patrones | Navegación en píldoras, mapa con nubes coloreadas por nivel, ficha de estación tipo tabla (calidad, riesgo, contaminante determinante), recomendaciones con iconos |

### Colores de marca: contraste (WCAG 2.1)
| Combinación | Contraste | Veredicto |
|---|---|---|
| `#BCE954` sobre blanco | 1.41:1 | Falla. Solo decorativo |
| `#00D0F0` sobre blanco | 1.86:1 | Falla. Solo decorativo |
| `#13313A` sobre `#BCE954` | 9.76:1 | AAA |
| `#13313A` sobre `#00D0F0` | 7.38:1 | AAA |
| `#4E6B0F` (lima 700) sobre blanco | 6.12:1 | AA |
| `#00748A` (cian 700) sobre blanco | 5.43:1 | AA |
| `#BCE954` sobre `#0C1E24` | 12.16:1 | AAA |
| `#00D0F0` sobre `#0C1E24` | 9.20:1 | AAA |

**Conclusión:** los dos colores de marca se usan como **relleno con texto oscuro** o como **texto sobre fondo oscuro**. En temas claros, el texto usa los tonos 700.

---

## 2. Reglas de color (comunes a las cuatro propuestas)

| Familia | Rol | Ejemplos |
|---|---|---|
| **Lima** | Acción y selección | Botón principal, chip/segmento activo, opción elegida, toggle activo (en Nocturno) |
| **Cian** | Sistema y datos | "En vivo", estado de conexión MQTT/ESP32, enlaces, ubicación del usuario en el mapa, humedad |
| **Semáforo NOM-172** | Calidad del aire, en exclusiva | Palabra del índice, barra de 5 tramos, marcadores del mapa, alertas |
| **Gradiente lima→cian** | Firma de marca | Splash, ícono, cabecera de bienvenida (Atmósfera). Nunca representa un nivel |

Reglas:
1. Nunca texto blanco sobre lima o cian.
2. Nunca lima ni cian como texto sobre fondos claros (usar 700).
3. El verde de **Buena** (`#34B45A`) se separa del lima de marca: más oscuro y más azulado, para que no se confundan.
4. El texto de nivel en temas claros usa la variante oscura (`lt*`); el relleno usa la variante brillante (`lv*`).

### Escalas
| Paso | Lima | Cian | Tinta |
|---|---|---|---|
| 50 | `#F6FCE6` | `#ECFCFE` | `#F2F7F7` |
| 100 | `#EEF9D2` | `#DDF7FC` | `#E3ECEC` |
| 300 | `#D6F28F` | `#7FE8F8` | `#A9BCC0` |
| 400 **base** | `#BCE954` | `#00D0F0` | — |
| 500 | — | — | `#5C6F75` |
| 600 | `#8DB82A` | `#00A3BD` | — |
| 700 | `#4E6B0F` | `#00748A` | `#2A4851` |
| 800 | — | — | `#13313A` **base** |
| 900 | `#2A3A08` | `#003C48` | `#0C1E24` |

### Semáforo NOM-172-SEMARNAT-2023 (Índice AIRE Y SALUD)
| Nivel | Relleno claro `lv` | Texto claro `lt` | Oscuro (relleno y texto) | Riesgo |
|---|---|---|---|---|
| Buena | `#34B45A` | `#1F7A39` | `#4ED07A` | Bajo |
| Aceptable | `#F2C230` | `#8A6A00` | `#F5CF3A` | Moderado |
| Mala | `#F28A2E` | `#B4520C` | `#FF9A3D` | Alto |
| Muy mala | `#E04A3A` | `#B32A1D` | `#FF5C4D` | Muy alto |
| Extremadamente mala | `#8E3B8C` | `#7A2F78` | `#C77DCA` (texto `#D79BDA`) | Extremadamente alto |

La propuesta **Cívico** usa rellenos más saturados, cercanos a SIMAJ: `#2DBE4B`, `#F4D21F`, `#F57F17`, `#E53935`, `#8E3B8C`.

Cortes PM2.5 (µg/m³): 0 · 15 · 33 · 79 · 130. CO (ppm): 0 · 5 · 9 · 12 · 16. Ya están en `app/src/logica/calidadAire.ts`.

### Fondo según la calidad del aire
El fondo de la app se tiñe con el color de relleno (`lv`) del nivel actual. Cada propuesta lo aplica de forma distinta; la proporción de mezcla está pensada para que el texto conserve su contraste.

| Propuesta | Cómo cambia el fondo | Valores |
|---|---|---|
| Brisa | Lavado vertical: fuerte arriba, suave abajo; el halo del índice toma el mismo tono | `linear-gradient(180deg, mix(lv 22%, #F2F7F7) 0, mix(lv 6%, #F2F7F7) 420px)` |
| Atmósfera | La cabecera cambia de gradiente por nivel; el resto del fondo, tinte leve | Fondo `mix(lv 9%, #F6F9F1)`. Cabecera: Buena `#7FD98F→#BCE954→#00D0F0` · Aceptable `#FBE27A→#F2C230` · Mala `#F9C35A→#F28A2E` · Muy mala `#A3261A→#E04A3A` · Extrema `#55215A→#8E3B8C`. Texto de cabecera blanco en Muy mala y Extrema |
| Nocturno | Resplandor radial del nivel en la parte superior | `radial-gradient(140% 46% at 50% 0%, mix(lv 34%, transparente), transparente 72%)` sobre `mix(lv 6%, #0C1E24)` |
| Cívico | La banda azul petróleo se funde hacia el nivel en su borde inferior; fondo con tinte | Fondo `mix(lv 15%, #E6EDEF)`. Banda `#173D4C` 0–48 % → `mix(lv 36%, #173D4C)` 100 % |

`mix(a p%, b)` equivale a `color-mix(in srgb, a p%, b)`. En React Native se calcula con la función `mezclar(hex, fondo, a)` que ya existe en `tema.ts`, y los gradientes con `expo-linear-gradient`.

Reglas:
- Las tarjetas (`superficie`) **no** se tiñen: siguen blancas (u oscuras en Nocturno) para que el contenido se lea igual en cualquier nivel.
- La transición entre niveles dura ~400 ms, para que el cambio se note sin sobresaltar.
- En Ajustes se agrega el interruptor **"Fondo según la calidad del aire"** para quien prefiera un fondo neutro.

---

## 3. Propuestas

### P1 · Brisa (claro y aireado)
Evolución de la app actual. Mismo esqueleto de tarjetas, fondo frío casi blanco, tinta azul petróleo. Lima y cian aparecen como halos suaves detrás del índice.

| Token | Valor |
|---|---|
| fondo | `#F2F7F7` |
| superficie | `#FFFFFF` |
| superficie2 / relleno | `#EAF1F1` |
| borde | `#DEE8E8` |
| texto | `#13313A` |
| textoSuave | `#5C6F75` |
| accion (lima) / sobreAccion | `#BCE954` / `#13313A` |
| accionTexto (lima 700) | `#4E6B0F` |
| accionSuave | `#EEF9D2` |
| sistema (cian) / sistemaTexto | `#00D0F0` / `#00748A` |
| sistemaSuave | `#DDF7FC` |
| chip activo | fondo `#13313A`, texto `#BCE954` |
| toggle activo | `#00C2E0` |
| peligro / peligroSuave | `#B32A1D` / `#FCE6E2` |

- **Tipografía:** Plus Jakarta Sans 400 · 500 · 600 · 700 · 800 (una familia).
- **Radios:** tarjeta 22 · tile 16 · botón/segmento 14 · píldora 999.
- **Índice:** palabra del nivel en 34 px / 800, mayúsculas, centrada, con halo `accionSuave` arriba y `sistemaSuave` abajo.

### P2 · Atmósfera (gradiente expresivo)
Cabecera con gradiente `155deg, #BCE954 0% → #86E39A 46% → #00D0F0 100%` y la cifra de PM2.5 en 64 px. Las tarjetas suben 46 px sobre la cabecera. En una alerta, la cabecera cambia al color del nivel (`lv2 → #F6C04A` para Mala).

| Token | Valor |
|---|---|
| fondo | `#F6F9F1` |
| superficie | `#FFFFFF` |
| relleno | `#EEF3E7` |
| borde | `#E1E9DA` |
| texto | `#0F2A2F` |
| textoSuave | `#58706F` |
| chip activo | fondo `#0F2A2F`, texto `#FFFFFF` |
| toggle activo | pista `#0F2A2F`, perilla `#BCE954` |

- **Tipografía:** Sora 600 · 700 · 800 (títulos y cifras) + DM Sans 400 · 500 · 700 (texto).
- **Radios:** tarjeta 26 · botones en píldora (999).
- **Implementación:** `expo-linear-gradient` (ya instalado).

### P3 · Nocturno (modo oscuro de sensor)
Instrumento técnico: fondo azul petróleo profundo, medidor semicircular con los 5 tramos, cifras monoespaciadas.

| Token | Valor |
|---|---|
| fondo | `#0C1E24` |
| superficie | `#13292F` |
| superficie2 | `#1B353C` |
| borde | `#22414A` |
| texto | `#E8F3F1` |
| textoSuave | `#8FA4AA` |
| accion / accionTexto | `#BCE954` / `#BCE954` |
| accionSuave | `#1F3A2A` |
| sistema / sistemaTexto | `#00D0F0` / `#3FDDF5` |
| sistemaSuave | `#0E3A45` |
| chip activo | fondo `#BCE954`, texto `#0C1E24` |
| peligro / peligroSuave | `#FF7A6B` / `#3A1F22` |

- **Tipografía:** Space Grotesk 400 · 500 · 600 · 700 + IBM Plex Mono 400 · 500 · 600 (lecturas, horas, tópicos MQTT).
- **Radios:** tarjeta 18 · botón 12.
- **Medidor:** arco de 180°, trazo 12, 5 segmentos con separación de 1.2 %, marcador circular con borde de 4 px en `texto`.

### P4 · Cívico (alineado con SIMAJ)
Banda superior azul petróleo `#173D4C`, ficha de estación tipo tabla, mapa de nodos y navegación inferior (Inicio · Mapa · Historial · Ajustes).

| Token | Valor |
|---|---|
| fondo | `#E6EDEF` |
| superficie | `#FFFFFF` |
| relleno | `#EEF3F4` |
| borde | `#D7E1E4` |
| texto / banda | `#173D4C` |
| textoSuave | `#566A72` |
| texto secundario en banda | `#9FC3CF` / `#CFE3EA` |
| acento en banda | cian `#00D0F0` (palabra destacada), lima `#BCE954` (logotipo "172") |
| chip activo | fondo `#173D4C`, texto `#FFFFFF` |
| toggle activo | pista `#173D4C`, perilla `#BCE954` |

- **Tipografía:** Montserrat 600 · 700 · 800 (títulos y cifras) + Source Sans 3 400 · 600 · 700 (texto).
- **Radios:** tarjeta 16 · botón 10.

---

## 4. Tipografía: escala común (px)

| Rol | Tamaño / peso | Uso |
|---|---|---|
| Índice | 34 / 800 (P2: 64 / 700) | Palabra o cifra principal |
| Título pantalla | 20 / 800 | "Ajustes", "Zona Centro" |
| Título tarjeta | 15 / 700 | "Últimas 12 h" |
| Cifra | 30 / 700 | Lecturas |
| Cuerpo | 13 / 400–500 | Descripciones |
| Secundario | 11 / 500 | Ayudas, unidades |
| Eyebrow | 9.5 / 700, mayúsculas, espaciado 0.13 em | "SENSOR LÁSER PMS5003" |

Las cifras usan `fontVariant: ['tabular-nums']` para que no "bailen" al actualizarse.

## 5. Espaciado
Base 4. Márgenes laterales 16 · separación entre tarjetas 12 · padding de tarjeta 14 · separación de tiles 8.

---

## 6. Recomendación inicial

> Ya no aplica: se eligió **Atmósfera** (ver sección 0). Se conserva como referencia y por el ejemplo de `tema.ts`; los nombres de los roles de color sirven igual para Atmósfera.

**Brisa como tema claro + Nocturno como tema oscuro**, con tokens de rol compartidos:

1. El cambio se concentra en `src/tema.ts` y `src/app/_layout.tsx` (fuentes).
2. El gradiente de **Atmósfera** se usa solo en splash, ícono y bienvenida.
3. La ficha de estación y el mapa de **Cívico** quedan para una futura pestaña "Mapa" con varios nodos.

### Paquetes de fuentes
```bash
npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/ibm-plex-mono
```
(Otras propuestas: `@expo-google-fonts/sora`, `@expo-google-fonts/dm-sans`, `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/montserrat`, `@expo-google-fonts/source-sans-3`.)

### `tema.ts` propuesto (Brisa + Nocturno)
Mantiene los nombres actuales de `Paleta` para no romper pantallas, y agrega los nuevos roles. La migración consiste en sustituir los usos de `Paleta.verde` que son **acción** por `Paleta.accion` / `Paleta.accionTexto`, y dejar `verde` solo para el nivel Buena.

```ts
const claro = {
  fondo: '#F2F7F7',
  superficie: '#FFFFFF',
  borde: '#DEE8E8',
  texto: '#13313A',
  textoSuave: '#5C6F75',
  textoTenue: '#8FA0A5',
  relleno: '#EAF1F1',

  // Roles nuevos
  accion: '#BCE954',        // relleno de botones / selección
  sobreAccion: '#13313A',   // texto encima de accion
  accionTexto: '#4E6B0F',   // lima legible sobre claro
  accionSuave: '#EEF9D2',
  sistema: '#00D0F0',
  sistemaTexto: '#00748A',
  sistemaSuave: '#DDF7FC',

  // Semáforo NOM-172 (relleno)
  verde: '#34B45A',
  amarillo: '#F2C230',
  naranja: '#F28A2E',
  rojo: '#E04A3A',
  morado: '#8E3B8C',
  // Semáforo NOM-172 (texto)
  verdeTexto: '#1F7A39',
  amarilloTexto: '#8A6A00',
  naranjaTexto: '#B4520C',
  rojoTexto: '#B32A1D',
  moradoTexto: '#7A2F78',

  // Compatibilidad con nombres actuales
  verdeSuave: '#E3F4E6',
  verdeBorde: '#BFE3C8',
  verdeAlerta: '#E3F4E6',
  verdeOscuro: '#13313A',   // antes: chip activo → ahora tinta
  coral: '#B32A1D',
  coralSuave: '#FCE6E2',
  azul: '#00748A',
  azulSuave: '#DDF7FC',
  ambar: '#8A6A00',
  rojoSuave: '#FCE6E2',
  vino: '#7A2334',
} as const;

const oscuro: typeof claro = {
  ...claro,
  fondo: '#0C1E24',
  superficie: '#13292F',
  borde: '#22414A',
  texto: '#E8F3F1',
  textoSuave: '#8FA4AA',
  textoTenue: '#6B8389',
  relleno: '#1B353C',
  sobreAccion: '#0C1E24',
  accionTexto: '#BCE954',
  accionSuave: '#1F3A2A',
  sistemaTexto: '#3FDDF5',
  sistemaSuave: '#0E3A45',
  verde: '#4ED07A', amarillo: '#F5CF3A', naranja: '#FF9A3D', rojo: '#FF5C4D', morado: '#C77DCA',
  verdeTexto: '#4ED07A', amarilloTexto: '#F5CF3A', naranjaTexto: '#FF9A3D', rojoTexto: '#FF5C4D', moradoTexto: '#D79BDA',
  verdeSuave: '#173A28', verdeBorde: '#245A3A', verdeAlerta: '#173A28', verdeOscuro: '#BCE954',
  coral: '#FF7A6B', coralSuave: '#3A1F22', azul: '#3FDDF5', azulSuave: '#0E3A45',
  ambar: '#F5CF3A', rojoSuave: '#3A1F22',
} as any;

export const Temas = { claro, oscuro };
export const Paleta = claro; // mientras se agrega el selector Claro / Oscuro / Sistema

export const Fuente = {
  regular: 'PlusJakartaSans_400Regular',
  media: 'PlusJakartaSans_500Medium',
  seminegrita: 'PlusJakartaSans_600SemiBold',
  negrita: 'PlusJakartaSans_700Bold',
  extra: 'PlusJakartaSans_800ExtraBold',
  mono: 'IBMPlexMono_500Medium',
} as const;
```

> Nota: `oscuro` está tipado con `as any` solo para el ejemplo; al implementarlo conviene definir un tipo `PaletaTema` con valores `string`.

### Pasos de migración
1. Instalar fuentes y cargarlas en `src/app/_layout.tsx`.
2. Reemplazar `tema.ts` con los tokens anteriores.
3. Revisar los 37 usos de `Paleta.verde`: los que marcan selección o acción pasan a `accion` / `accionTexto`; los que pintan el nivel Buena se quedan.
4. Cambiar el texto de nivel en `calidadAire.ts` para que use la variante `*Texto`.
5. Agregar el selector Claro / Oscuro / Sistema en Ajustes (`useColorScheme`).
