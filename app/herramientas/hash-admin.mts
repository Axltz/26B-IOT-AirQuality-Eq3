// Genera la sal y el hash de la contraseña del administrador principal.
// Uso: npm run hash-admin  → escribe la contraseña (no se muestra) y pega las
// dos constantes que imprime en src/estado/admin.tsx. La contraseña nunca se
// guarda en el código ni en el repositorio.

import { createInterface } from 'node:readline';

import { derivarHash, generarSal, LARGO_MINIMO_CONTRASENA } from '../src/logica/credenciales';

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
// Mientras se escribe la contraseña no se repite nada en pantalla.
let silenciar = false;
const conSalida = rl as unknown as { _writeToOutput: (s: string) => void };
conSalida._writeToOutput = (s: string) => {
  if (!silenciar) process.stdout.write(s);
};

// Líneas ya leídas (con entrada por tubería pueden llegar todas juntas).
const lineas: string[] = [];
let esperando: ((linea: string) => void) | null = null;
rl.on('line', (linea) => {
  if (esperando) {
    const r = esperando;
    esperando = null;
    r(linea);
  } else lineas.push(linea);
});

function leerOculto(pregunta: string): Promise<string> {
  process.stdout.write(pregunta);
  silenciar = true;
  return new Promise((resolve) => {
    const fin = (linea: string) => {
      silenciar = false;
      process.stdout.write('\n');
      resolve(linea);
    };
    const lista = lineas.shift();
    if (lista !== undefined) fin(lista);
    else esperando = fin;
  });
}

const contrasena = await leerOculto('Contraseña del administrador principal: ');
const confirmacion = await leerOculto('Repítela: ');
rl.close();

if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
  console.error(`La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`);
  process.exit(1);
}
if (confirmacion !== contrasena) {
  console.error('Las contraseñas no coinciden.');
  process.exit(1);
}

const sal = generarSal();
console.log('\nPega estas dos líneas en src/estado/admin.tsx:\n');
console.log(`const ADMIN_ROOT_SAL = '${sal}';`);
console.log(`const ADMIN_ROOT_HASH = '${derivarHash(contrasena, sal)}';`);
