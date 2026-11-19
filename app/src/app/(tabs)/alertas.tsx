import { Pantalla } from '../../componentes/Pantalla';
import { VistaNotificacion } from '../../componentes/VistaNotificacion';
import { useTema } from '../../estado/tema';
import { fondoPastel } from '../../tema';

/** Alertas: fondo azul pastel fijo (sin degradado). */
export default function Alertas() {
  const tema = useTema();
  const fondo = fondoPastel(tema, 'azul');
  return (
    <Pantalla fondo={fondo}>
      <VistaNotificacion fondo={fondo} />
    </Pantalla>
  );
}
