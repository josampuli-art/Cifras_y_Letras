/* =========================================================
   CIFRAS Y LETRAS · service worker
   Guarda la aplicación para que funcione sin conexión una vez
   instalada en el móvil.
   - Archivos propios: primero la red (así siempre ves la última
     versión publicada) y, si no hay conexión, la copia guardada.
   - Diccionario y tipografías: se guardan la primera vez y a
     partir de ahí se sirven desde la copia.
   Si cambias la lista de archivos, sube el número de VERSION.
   ========================================================= */
const VERSION = 'cyl-v1';
const EXTERNOS = 'cyl-externos-v1';

const NUCLEO = [
  './',
  'index.html',
  'cifras.html',
  'letras.html',
  'simulacion.html',
  'estilos.css',
  'comun.js',
  'cifras-motor.js',
  'letras-motor.js',
  'manifest.webmanifest',
  'icono-180.png',
  'icono-192.png',
  'icono-512.png',
];

const HOST_EXTERNO = /(^|\.)(unpkg\.com|jsdelivr\.net|googleapis\.com|gstatic\.com)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(NUCLEO))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION && k !== EXTERNOS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function redPrimero(peticion) {
  const cache = await caches.open(VERSION);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch (error) {
    const guardada = await cache.match(peticion, { ignoreSearch: true });
    if (guardada) return guardada;
    // Sin conexión y sin copia de esa página: se vuelve a la portada
    if (peticion.mode === 'navigate') {
      const portada = await cache.match('index.html');
      if (portada) return portada;
    }
    throw error;
  }
}

async function cachePrimero(peticion) {
  const cache = await caches.open(EXTERNOS);
  const guardada = await cache.match(peticion);
  if (guardada) return guardada;
  const respuesta = await fetch(peticion);
  if (respuesta.ok || respuesta.type === 'opaque') cache.put(peticion, respuesta.clone());
  return respuesta;
}

self.addEventListener('fetch', (e) => {
  const peticion = e.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin === self.location.origin) e.respondWith(redPrimero(peticion));
  else if (HOST_EXTERNO.test(url.hostname)) e.respondWith(cachePrimero(peticion));
});
