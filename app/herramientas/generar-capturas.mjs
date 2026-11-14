const fs = require('fs');
const path = require('path');
const puppeteer = require('./node_modules/puppeteer-core');

async function tomarCapturas() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const execPath = fs.existsSync(edgePath) ? edgePath : chromePath;

  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const dirCapturas = path.join(__dirname, '..', 'docs', 'app', 'capturas');
  if (!fs.existsSync(dirCapturas)) fs.mkdirSync(dirCapturas, { recursive: true });

  console.log('Capturando 01_dashboard_principal.png...');
  await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(dirCapturas, '01_dashboard_principal.png') });

  console.log('Capturando 02_pantalla_ajustes.png...');
  await page.goto('http://localhost:8081/ajustes', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(dirCapturas, '02_pantalla_ajustes.png') });

  await browser.close();
  console.log('✅ Capturas actualizadas correctamente en docs/app/capturas/');
}

tomarCapturas().catch((e) => {
  console.error('Error generando capturas:', e.message);
  process.exit(1);
});
