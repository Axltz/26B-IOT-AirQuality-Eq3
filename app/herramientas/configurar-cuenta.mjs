// Prepara esta computadora para abrir Mi Entorno en el teléfono.
// Lo llama "Iniciar Mi Entorno.bat". La primera vez guía paso a paso:
//   1. Crear una cuenta gratis de Expo (si no tienes).
//   2. Iniciar sesión en esta computadora (queda guardada).
//   3. Registrar el proyecto en tu cuenta (Expo Go en iPhone lo exige).
// Las siguientes veces solo revisa que todo siga bien y termina en segundos.
//
// El registro escribe "owner" y "extra.eas.projectId" en app.json, así que
// esos dos datos son distintos en la computadora de cada quien. Es normal.

import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rutaAppJson = path.join(raiz, 'app.json');
const enWindows = process.platform === 'win32';

// En Windows los .cmd solo se pueden lanzar a través de la consola.
function npx(argumentos, opciones = {}) {
  return enWindows
    ? spawnSync(`npx.cmd ${argumentos}`, { cwd: raiz, shell: true, encoding: 'utf8', ...opciones })
    : spawnSync('npx', argumentos.split(' '), { cwd: raiz, encoding: 'utf8', ...opciones });
}

// Lee la cuenta del archivo donde Expo guarda la sesión (mucho más rápido que
// `npx expo whoami`). Solo se usa el nombre de usuario.
function cuentaActual() {
  const carpeta = process.env.__UNSAFE_EXPO_HOME_DIRECTORY || path.join(os.homedir(), '.expo');
  try {
    const { auth } = JSON.parse(readFileSync(path.join(carpeta, 'state.json'), 'utf8'));
    const nombre = auth?.sessionSecret ? auth.username : null;
    return /^[A-Za-z0-9_-]+$/.test(nombre ?? '') ? nombre : null;
  } catch {
    return null;
  }
}

// "Iniciar Mi Entorno.bat" usa esto para mostrar la cuenta en pantalla.
if (process.argv.includes('--cuenta')) {
  console.log(cuentaActual() ?? '');
  process.exit(0);
}

function abrirEnNavegador(url) {
  const [programa, args] = enWindows
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(programa, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

const leerApp = () => JSON.parse(readFileSync(rutaAppJson, 'utf8'));
const guardarApp = (app) => writeFileSync(rutaAppJson, JSON.stringify(app, null, 2) + '\n');

function titulo(texto) {
  console.log('');
  console.log('  ' + '='.repeat(62));
  console.log('   ' + texto);
  console.log('  ' + '='.repeat(62));
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const preguntar = async (texto) => (await rl.question(texto)).trim().toLowerCase();

// ---------------------------------------------------------------- sesión
let cuenta = cuentaActual();

if (!cuenta) {
  titulo('PRIMERA VEZ EN ESTA COMPUTADORA');
  console.log(`
   Para abrir la app en tu teléfono necesitas una cuenta de Expo (gratis).
   En iPhone es obligatoria; en Android es opcional.
   Solo se hace una vez: después esta ventana va directo al código QR.
`);
  const tiene = await preguntar('   ¿Ya tienes cuenta de Expo? (s/n): ');
  if (tiene.startsWith('n')) {
    console.log(`
   PASO 1 - Crear tu cuenta
   Se abrirá la página de Expo. Toca "Sign up", llena tus datos y
   confirma tu correo si te lo pide.
`);
    abrirEnNavegador('https://expo.dev/signup');
    await preguntar('   Cuando ya tengas tu cuenta, presiona Enter para seguir... ');
  }

  for (let intento = 1; intento <= 3 && !cuenta; intento++) {
    console.log(`
   PASO 2 - Iniciar sesión en esta computadora
   Se abrirá el navegador: inicia sesión con tu cuenta de Expo y espera a
   que la página diga que ya puedes cerrarla. Quedará guardada aquí.
`);
    const r = await preguntar('   Presiona Enter para abrir el navegador (o escribe omitir si usas Android): ');
    if (r === 'omitir') break;
    spawnSync(process.execPath, [path.join(raiz, 'herramientas', 'iniciar-sesion-expo.mjs')], {
      cwd: raiz,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    cuenta = cuentaActual();
    if (!cuenta) console.log('\n   El inicio de sesión no se completó. Intentemos otra vez.');
  }

  if (!cuenta) {
    console.log(`
   Seguimos sin cuenta: en Android y en el navegador la app funciona igual,
   en iPhone no abrirá. Para iniciar sesión, vuelve a abrir este archivo.
`);
    rl.close();
    process.exit(0);
  }
  console.log(`\n   Listo: sesión guardada en esta computadora como "${cuenta}".`);
}

// --------------------------------------------- proyecto registrado en la cuenta
const app = leerApp();
const dueno = app.expo.owner;
const idProyecto = app.expo.extra?.eas?.projectId;

if (dueno !== cuenta || !idProyecto) {
  console.log(`
   PASO 3 - Registrar el proyecto en tu cuenta (automático)
   Expo Go en iPhone solo abre proyectos de tu propia cuenta.
   Registrando "@${cuenta}/${app.expo.slug}"... la primera vez tarda un poco.
`);
  const respaldo = rutaAppJson + '.respaldo';
  copyFileSync(rutaAppJson, respaldo);
  const teniaRouter = Boolean(app.expo.extra?.router);

  // Se quitan los datos de otra cuenta para registrar el proyecto en la tuya.
  delete app.expo.owner;
  if (app.expo.extra?.eas) {
    delete app.expo.extra.eas.projectId;
    if (!Object.keys(app.expo.extra.eas).length) delete app.expo.extra.eas;
  }
  if (app.expo.extra && !Object.keys(app.expo.extra).length) delete app.expo.extra;
  guardarApp(app);

  const r = npx(`-y eas-cli@27 init --account ${cuenta} --non-interactive --force`, {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, EAS_NO_VCS: '1' },
  });

  let nuevo = null;
  try {
    nuevo = leerApp();
  } catch {}
  if (r.status === 0 && nuevo?.expo.owner === cuenta && nuevo.expo.extra?.eas?.projectId) {
    // eas init copia a app.json ajustes que el plugin de Expo Router ya pone solo.
    if (!teniaRouter && nuevo.expo.extra.router) {
      delete nuevo.expo.extra.router;
      guardarApp(nuevo);
    }
    rmSync(respaldo, { force: true });
    console.log(`\n   Listo: proyecto registrado como "@${cuenta}/${nuevo.expo.slug}".`);
  } else {
    copyFileSync(respaldo, rutaAppJson);
    rmSync(respaldo, { force: true });
    console.log(`
   No se pudo registrar el proyecto (¿sin internet?). En Android y en el
   navegador funciona igual; para iPhone vuelve a abrir este archivo.
`);
  }
}

rl.close();
