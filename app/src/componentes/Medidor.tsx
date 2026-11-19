import { View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { useTema } from '../estado/tema';
import { Fuente } from '../tema';

const CX = 110;
const CY = 112;
const R = 90;
/** Separación entre segmentos: 1.2 % del arco a cada lado. */
const HUECO = 0.012;

function punto(t: number): [number, number] {
  const a = Math.PI - t * Math.PI;
  return [CX + R * Math.cos(a), CY - R * Math.sin(a)];
}

/**
 * Medidor semicircular (§0.3): arco de 180°, radio 90, trazo 12, cinco
 * segmentos con los colores `lv` y un marcador en la posición que da
 * `posicionBarra()` (0–1). Sin posición (lectura desconocida) no se dibuja el
 * marcador.
 */
export function Medidor({
  posicion,
  valor,
  unidad,
  fin = '130+',
  extremos = true,
}: {
  posicion: number | null;
  valor: string;
  unidad: string;
  /** Rótulo del extremo derecho: "130+" (PM2.5), "16+" (CO)… */
  fin?: string;
  extremos?: boolean;
}) {
  const tema = useTema();
  const alto = extremos ? 136 : 128;
  const segmentos = [0, 1, 2, 3, 4].map((i) => {
    const [ax, ay] = punto(i / 5 + HUECO);
    const [bx, by] = punto((i + 1) / 5 - HUECO);
    return (
      <Path
        key={i}
        d={`M${ax.toFixed(1)} ${ay.toFixed(1)} A${R} ${R} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}`}
        stroke={tema.lv[i]}
        strokeWidth={12}
        strokeLinecap="round"
        fill="none"
      />
    );
  });
  const marcador = posicion === null ? null : punto(Math.min(1, Math.max(0, posicion)));

  return (
    <View
      style={{ width: '100%', maxWidth: 280, alignSelf: 'center', aspectRatio: 220 / alto }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Medidor: ${valor} ${unidad}`}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 220 ${alto}`}>
        {segmentos}
        {extremos ? (
          <>
            <SvgText x={20} y={133} textAnchor="middle" fontSize={10} fontFamily={Fuente.cifra} fill={tema.textoSuave}>
              0
            </SvgText>
            <SvgText x={200} y={133} textAnchor="middle" fontSize={10} fontFamily={Fuente.cifra} fill={tema.textoSuave}>
              {fin}
            </SvgText>
          </>
        ) : null}
        {marcador ? (
          <Circle cx={marcador[0]} cy={marcador[1]} r={10} fill={tema.superficie} stroke={tema.texto} strokeWidth={4} />
        ) : null}
        <SvgText x={110} y={92} textAnchor="middle" fontSize={40} fontFamily={Fuente.cifra} fill={tema.texto}>
          {valor}
        </SvgText>
        <SvgText x={110} y={114} textAnchor="middle" fontSize={11} fontFamily={Fuente.cifra} fill={tema.textoSuave}>
          {unidad}
        </SvgText>
      </Svg>
    </View>
  );
}
