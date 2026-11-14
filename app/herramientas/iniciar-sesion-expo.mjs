// Inicia sesión en Expo (se hace una sola vez por computadora).
//
//   npm run iniciar-sesion
//
// En Windows, `npx expo login` abre el navegador con `cmd /c start <dirección>`;
// cmd corta la dirección en cada "&", el navegador abre una página incompleta
// y el comando termina con error antes de recibir la sesión. Aquí se ejecuta
// con BROWSER=none (Expo solo muestra la dirección y se queda esperando) y la
// dirección completa se abre directamente con Windows.

import { spawn } from 'node:child_process';

const enWindows = process.platform === 'win32';
// En Windows los .cmd solo se pueden lanzar a través de la consola (shell).
const hijo = enWindows
  ? spawn('npx.cmd expo login --browser', { env: { ...process.env, BROWSER: 'none' }, stdio: ['inherit', 'pipe', 'inherit'], shell: true })
  : spawn('npx', ['expo', 'login', '--browser'], { env: { ...process.env, BROWSER: 'none' }, stdio: ['inherit', 'pipe', 'inherit'] });

let texto = '';
let abierta = false;

hijo.stdout.on('data', (datos) => {
  process.stdout.write(datos);
  if (abierta) return;
  texto += datos.toString();
  const url = texto.match(/https:\/\/expo\.dev\/login\?\S+/)?.[0];
  if (!url) return;
  abierta = true;
  console.log('\nAbriendo el navegador. Inicia sesion ahi y espera a que la pagina diga que ya puedes cerrarla.\n');
  const comando = enWindows
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(comando[0], comando[1], { stdio: 'ignore', detached: true }).on('error', () => {
    console.log('No se pudo abrir el navegador. Copia la direccion de arriba y pegala en tu navegador.');
  }).unref();
});

hijo.on('exit', (codigo) => process.exit(codigo ?? 1));
