/**
 * Credenciales de administrador sin servidor: la app nunca guarda contraseñas,
 * solo una sal aleatoria y el hash derivado (SHA-256 iterado). Todo en
 * TypeScript puro para no depender de módulos nativos.
 */

/** Rondas de SHA-256 al derivar el hash: encarecen probar contraseñas a ciegas. */
// (1000 rondas tardan ~40 ms en Node y unos cientos de ms en Hermes, sin JIT.)
export const RONDAS_HASH = 1000;

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]);

/** Texto → bytes UTF-8 (sin depender de TextEncoder, que no siempre existe en Hermes). */
function utf8(texto: string): number[] {
  const bytes: number[] = [];
  for (const caracter of texto) {
    const c = caracter.codePointAt(0)!;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return bytes;
}

/** SHA-256 de un texto (UTF-8), en hexadecimal. */
export function sha256(texto: string): string {
  const datos = utf8(texto);
  const largoBits = datos.length * 8;
  datos.push(0x80);
  while (datos.length % 64 !== 56) datos.push(0);
  // Largo en bits como entero de 64 bits big-endian.
  const alto = Math.floor(largoBits / 0x100000000);
  datos.push((alto >>> 24) & 255, (alto >>> 16) & 255, (alto >>> 8) & 255, alto & 255);
  datos.push((largoBits >>> 24) & 255, (largoBits >>> 16) & 255, (largoBits >>> 8) & 255, largoBits & 255);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < datos.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      const j = i + t * 4;
      w[t] = (datos[j] << 24) | (datos[j + 1] << 16) | (datos[j + 2] << 8) | datos[j + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = w[t - 16] + s0 + w[t - 7] + s1;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}

/** Hash que se guarda para una contraseña: SHA-256 iterado sobre sal + contraseña. */
export function derivarHash(contrasena: string, sal: string, rondas = RONDAS_HASH): string {
  let hash = sha256(`${sal}:${contrasena}`);
  for (let i = 1; i < rondas; i++) hash = sha256(hash + contrasena);
  return hash;
}

/** Sal aleatoria de 16 bytes en hexadecimal (no es secreta, solo debe ser única). */
export function generarSal(): string {
  const bytes = new Uint8Array(16);
  const cripto = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cripto?.getRandomValues) cripto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** true si la contraseña corresponde a la sal y el hash guardados. */
export function verificarContrasena(contrasena: string, sal: string, hash: string): boolean {
  if (!sal || !hash) return false;
  const calculado = derivarHash(contrasena, sal);
  // Comparación de tiempo constante (sin salir al primer carácter distinto).
  if (calculado.length !== hash.length) return false;
  let diferencia = 0;
  for (let i = 0; i < calculado.length; i++) diferencia |= calculado.charCodeAt(i) ^ hash.charCodeAt(i);
  return diferencia === 0;
}

/** Longitud mínima para contraseñas de administrador nuevas. */
export const LARGO_MINIMO_CONTRASENA = 8;

/** Sal y hash nuevos para una contraseña, o el motivo por el que no es válida. */
export function nuevaCredencial(contrasena: string): { sal: string; hash: string } | { error: string } {
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return { error: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres` };
  }
  const sal = generarSal();
  return { sal, hash: derivarHash(contrasena, sal) };
}
