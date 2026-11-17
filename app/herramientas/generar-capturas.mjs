// Genera capturas reales de la app web para la documentación.
//
// Requisitos:
//   1. La app corriendo en http://localhost:8081  (npm run web)
//   2. Microsoft Edge o Google Chrome instalado
//   3. puppeteer-core instalado:  npm install --no-save puppeteer-core
//
// Uso:
//   npm run capturas
//
// Salida: docs/app/capturas/01_dashboard_principal.png
//         docs/app/capturas/02_pantalla_ajustes.png
//         docs/app/capturas/03_panel_admin.png

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.AURA_URL ?? 'http://localhost:8081';
const DIR_CAPTURAS = path.join(__dirname, '..', '..', 'docs', 'app', 'capturas');

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('Falta puppeteer-core. Instálalo con:');
  console.error('  cd app && npm install --no-save puppeteer-core');
  process.exit(1);
}

function rutaNavegador() {
  const candidatos = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const encontrado = candidatos.find((p) => fs.existsSync(p));
  if (!encontrado) throw new Error('No se encontró Edge ni Chrome instalado.');
  return encontrado;
}

async function esperar(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function clicPorTexto(page, texto) {
  const hecho = await page.evaluate((t) => {
    const nodos = [...document.querySelectorAll('*')];
    const el = nodos.find((e) => e.children.length === 0 && e.textContent?.trim() === t);
    if (!el) return false;
    const clickable = el.closest('[role="button"], button, a');
    (clickable ?? el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, texto);
  return hecho;
}

async function capturar(page, nombre) {
  await page.screenshot({ path: path.join(DIR_CAPTURAS, nombre) });
  console.log(`✓ ${nombre}`);
}

/**
 * La primera conexión MQTT por WebSockets puede tardar varios segundos.
 * Espera a que el dashboard muestre una lectura real ("ÍNDICE OFICIAL")
 * en vez de "SIN SEÑAL", para que la captura no salga vacía.
 */
async function esperarTexto(page, fragmento, maxMs = 12_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < maxMs) {
    const texto = await page.evaluate(() => document.body.innerText);
    if (texto.includes(fragmento)) return true;
    await esperar(500);
  }
  return false;
}

async function esperarDatosEnVivo(page, maxMs = 25_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < maxMs) {
    const texto = await page.evaluate(() => document.body.innerText);
    if (texto.includes('ÍNDICE OFICIAL') && !texto.includes('SIN SEÑAL')) return true;
    await esperar(1000);
  }
  console.warn('⚠ No llegó telemetría MQTT; la captura puede mostrar "Sin señal".');
  return false;
}

async function main() {
  fs.mkdirSync(DIR_CAPTURAS, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: rutaNavegador(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

    console.log('Capturando 01_dashboard_principal.png…');
    await page.goto(`${APP_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await esperarDatosEnVivo(page);
    await esperar(800);
    await capturar(page, '01_dashboard_principal.png');

    console.log('Capturando 02_pantalla_ajustes.png…');
    await page.goto(`${APP_URL}/ajustes`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await esperar(2500);
    await capturar(page, '02_pantalla_ajustes.png');

    console.log('Capturando 03_panel_admin.png…');
    await clicPorTexto(page, 'Acceso de Administrador');
    await esperar(900);
    await clicPorTexto(page, 'Iniciar Sesión');
    await esperarTexto(page, 'RESUMEN DE LA RED');
    await esperar(700);
    await capturar(page, '03_panel_admin.png');
  } finally {
    await browser.close();
  }

  console.log(`\n✅ Capturas actualizadas en ${DIR_CAPTURAS}`);
}

main().catch((e) => {
  console.error('Error generando capturas:', e.message);
  process.exit(1);
});
