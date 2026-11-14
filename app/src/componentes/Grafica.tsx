import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { METRICAS, type Metrica, type PuntoGrafica } from '../logica/historial';
import { Fuente, Paleta } from '../tema';

const IZQ = 10;
const DER = 18;
const ARRIBA = 26;
const ABAJO = 24;

/** Gráfica de línea de "Últimas horas". Toca o desliza para ver cada valor. */
export function Grafica({
  puntos,
  metrica,
  color,
  alto = 150,
}: {
  puntos: PuntoGrafica[];
  metrica: Metrica;
  color: string;
  alto?: number;
}) {
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const soltar = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSel(null), [metrica]);
  useEffect(() => () => {
    if (soltar.current) clearTimeout(soltar.current);
  }, []);

  const n = puntos.length;
  const x = (i: number) => (n <= 1 ? ancho - DER : IZQ + ((ancho - IZQ - DER) * i) / (n - 1));
  const base = alto - ABAJO;
  const altoUtil = alto - ARRIBA - ABAJO;

  const elegir = (e: GestureResponderEvent) => {
    const px = e.nativeEvent.locationX;
    let mejor: number | null = null;
    let distancia = Infinity;
    puntos.forEach((p, i) => {
      if (p.valor === undefined) return;
      const d = Math.abs(x(i) - px);
      if (d < distancia) {
        distancia = d;
        mejor = i;
      }
    });
    if (soltar.current) clearTimeout(soltar.current);
    setSel(mejor);
  };
  const liberar = () => {
    if (soltar.current) clearTimeout(soltar.current);
    soltar.current = setTimeout(() => setSel(null), 2000);
  };

  const valores = puntos.map((p) => p.valor).filter((v): v is number => v !== undefined);
  let minimo = valores.length ? Math.min(...valores) : 0;
  let maximo = valores.length ? Math.max(...valores) : 1;
  const rango = maximo - minimo;
  const rangoMin = METRICAS[metrica].rangoMinimo;
  if (rango < rangoMin) {
    const centro = (maximo + minimo) / 2;
    minimo = centro - rangoMin / 2;
    maximo = centro + rangoMin / 2;
  } else {
    minimo -= rango * 0.15;
    maximo += rango * 0.15;
  }
  const y = (v: number) => ARRIBA + altoUtil * (1 - (v - minimo) / (maximo - minimo));

  // Segmentos continuos (los huecos sin datos cortan la línea).
  const segmentos: { x: number; y: number }[][] = [];
  let actual: { x: number; y: number }[] = [];
  puntos.forEach((p, i) => {
    if (p.valor === undefined) {
      if (actual.length) segmentos.push(actual);
      actual = [];
    } else {
      actual.push({ x: x(i), y: y(p.valor) });
    }
  });
  if (actual.length) segmentos.push(actual);

  const curva = (s: { x: number; y: number }[]) => {
    let d = `M${s[0].x},${s[0].y}`;
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1];
      const b = s[i];
      const dx = (b.x - a.x) / 2.4;
      d += ` C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
    }
    return d;
  };

  let ultimo: number | null = null;
  puntos.forEach((p, i) => {
    if (p.valor !== undefined) ultimo = i;
  });
  const mostrar = sel ?? ultimo;
  const fmt = METRICAS[metrica].formato;

  return (
    <View
      style={{ height: alto }}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={elegir}
      onResponderMove={elegir}
      onResponderRelease={liberar}
      onResponderTerminate={liberar}
      accessibilityLabel={`Gráfica de ${METRICAS[metrica].titulo.toLowerCase()} de las últimas horas`}
    >
      {ancho > 0 ? (
        <Svg width={ancho} height={alto}>
          <Defs>
            <LinearGradient id="relleno" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          <Line x1={IZQ - 4} y1={base + 0.5} x2={ancho - DER + 4} y2={base + 0.5} stroke={Paleta.borde} strokeWidth={1} />

          {valores.length === 0 ? (
            <SvgText
              x={ancho / 2}
              y={ARRIBA + altoUtil / 2}
              fontSize={11}
              fontFamily={Fuente.media}
              fill={Paleta.textoTenue}
              textAnchor="middle"
            >
              Reuniendo datos…
            </SvgText>
          ) : null}

          {segmentos.map((s, i) =>
            s.length > 1 ? (
              <Path key={`a${i}`} d={`${curva(s)} L${s[s.length - 1].x},${base} L${s[0].x},${base} Z`} fill="url(#relleno)" />
            ) : null,
          )}
          {segmentos.map((s, i) => (
            <Path
              key={`l${i}`}
              d={curva(s)}
              stroke={color}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}

          {sel !== null && puntos[sel]?.valor !== undefined ? (
            <Line
              x1={x(sel)}
              y1={ARRIBA - 4}
              x2={x(sel)}
              y2={base}
              stroke={color}
              strokeOpacity={0.35}
              strokeDasharray="3,3"
            />
          ) : null}

          {puntos.map((p, i) => {
            if (p.valor === undefined) return null;
            const destacado = i === ultimo || i === sel;
            const r = destacado ? 4.8 : 3;
            return (
              <Circle
                key={`p${i}`}
                cx={x(i)}
                cy={y(p.valor)}
                r={r}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={destacado ? 2.4 : 1.8}
              />
            );
          })}

          {mostrar !== null && puntos[mostrar]?.valor !== undefined ? (
            <SvgText
              x={Math.min(Math.max(x(mostrar), 14), ancho - 14)}
              y={y(puntos[mostrar].valor!) - 11}
              fontSize={10}
              fontFamily={Fuente.extra}
              fill={Paleta.texto}
              textAnchor="middle"
            >
              {fmt(puntos[mostrar].valor!)}
            </SvgText>
          ) : null}

          {puntos.map((p, i) => (
            <SvgText
              key={`e${i}`}
              x={Math.min(Math.max(x(i), 14), ancho - 14)}
              y={alto - 6}
              fontSize={8.5}
              fontFamily={Fuente.seminegrita}
              fill={p.esAhora ? Paleta.textoSuave : Paleta.textoTenue}
              textAnchor="middle"
            >
              {p.etiqueta}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
