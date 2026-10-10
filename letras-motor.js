/* =========================================================
   LETRAS · bolsa de letras, diccionario y atril de juego
   (lo usan letras.html y simulacion.html)
   ========================================================= */
(function () {
  'use strict';

  const VOCALES = ['A','E','I','O','U'];
  const PESOS_VOCALES = [12.53, 13.68, 6.25, 8.68, 3.93];
  const CONSONANTES = ['B','C','D','F','G','H','J','L','M','N','Ñ','P','Q','R','S','T','V','X','Y','Z'];
  const PESOS_CONSONANTES = [1.42,4.68,5.86,0.69,1.01,0.70,0.44,4.97,3.15,6.71,0.31,2.51,0.88,6.87,7.98,4.63,0.90,0.22,0.90,0.52];

  const LONGITUD_MIN = 2;
  const LONGITUD_MAX = 10;
  // Mismo diccionario en dos CDN distintas: si una falla se prueba con la otra
  const FUENTES = [
    'https://unpkg.com/an-array-of-spanish-words@2.0.0/index.json',
    'https://cdn.jsdelivr.net/npm/an-array-of-spanish-words@2.0.0/index.json',
  ];

  /* =========================================================
     1. BOLSA DE LETRAS
     ========================================================= */
  // Elige k elementos según su peso (frecuencia aproximada de cada letra en español)
  function pesoAleatorio(items, pesos, k) {
    const total = pesos.reduce((a, b) => a + b, 0);
    const acumulado = [];
    let s = 0;
    for (const p of pesos) { s += p; acumulado.push(s); }
    const salida = [];
    for (let i = 0; i < k; i++) {
      const r = Math.random() * total;
      let idx = acumulado.findIndex(c => r <= c);
      if (idx === -1) idx = items.length - 1;
      salida.push(items[idx]);
    }
    return salida;
  }

  function barajar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generarBolsa(numVocales, total = 10) {
    const vocales = pesoAleatorio(VOCALES, PESOS_VOCALES, numVocales);
    const consonantes = pesoAleatorio(CONSONANTES, PESOS_CONSONANTES, total - numVocales);
    return barajar(vocales.concat(consonantes));
  }

  const SIN_TILDE = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U' };
  // Mayúsculas y sin tildes ni diéresis (la Ñ se conserva)
  function normalizar(palabra) {
    return palabra.normalize('NFC').trim().toUpperCase().replace(/[ÁÉÍÓÚÜ]/g, c => SIN_TILDE[c]);
  }

  // ¿Se puede escribir la palabra (ya normalizada) usando cada letra de la bolsa una sola vez?
  function sePuedeFormar(palabraNorm, bolsa) {
    const disponibles = bolsa.slice();
    for (const letra of palabraNorm) {
      const idx = disponibles.indexOf(letra);
      if (idx === -1) return false;
      disponibles.splice(idx, 1);
    }
    return true;
  }

  /* =========================================================
     2. DICCIONARIO
     ========================================================= */
  let estado = 'inactivo';     // 'cargando' | 'listo' | 'error'
  let promesa = null;
  let conjunto = null;         // Set con todas las palabras normalizadas
  let porLongitud = [];        // porLongitud[L] = { norm: [...], vista: [...] }
  let total = 0;
  const oyentes = new Set();

  const info = () => ({ estado, total });
  function avisar() { for (const fn of oyentes) fn(info()); }

  // Registra una función que recibe { estado, total } ahora y cada vez que cambie
  function alCambiarEstado(fn) {
    oyentes.add(fn);
    fn(info());
  }

  // Cede el turno al navegador para no congelar la página mientras se procesa
  const ceder = () => new Promise(resolve => {
    const canal = new MessageChannel();
    canal.port1.onmessage = () => resolve();
    canal.port2.postMessage(0);
  });

  async function descargar() {
    let ultimoError = null;
    for (const url of FUENTES) {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } catch (e) { ultimoError = e; }
    }
    throw ultimoError;
  }

  async function procesar(lista) {
    const set = new Set();
    const grupos = [];
    for (let L = LONGITUD_MIN; L <= LONGITUD_MAX; L++) grupos[L] = { norm: [], vista: [] };
    const soloLetras = /^[a-zñáéíóúü]+$/;
    const conTilde = /[áéíóúü]/;
    const TROZO = 60000;

    for (let i = 0; i < lista.length; i++) {
      const palabra = lista[i];
      const L = palabra.length;
      if (L >= LONGITUD_MIN && L <= LONGITUD_MAX && soloLetras.test(palabra)) {
        const mayus = palabra.toUpperCase();
        const norm = conTilde.test(palabra) ? normalizar(palabra) : mayus;
        if (!set.has(norm)) {
          set.add(norm);
          grupos[L].norm.push(norm);
          grupos[L].vista.push(mayus);
        }
      }
      if (i % TROZO === TROZO - 1) await ceder();
    }
    conjunto = set;
    porLongitud = grupos;
    total = set.size;
  }

  // Descarga y prepara el diccionario (una sola vez). Devuelve true si queda listo.
  function cargar() {
    if (promesa) return promesa;
    estado = 'cargando';
    avisar();
    promesa = descargar().then(procesar).then(() => {
      estado = 'listo';
      avisar();
      return true;
    }).catch((e) => {
      console.error('No se pudo cargar el diccionario:', e);
      estado = 'error';
      promesa = null;   // permite reintentar
      avisar();
      return false;
    });
    return promesa;
  }

  function existe(palabraNorm) {
    return estado === 'listo' && conjunto.has(palabraNorm);
  }

  // Todas las palabras que se pueden formar con la bolsa: resultado[L] = [palabras de L letras]
  function buscar(bolsa) {
    const resultado = [];
    if (estado !== 'listo') return resultado;
    const cuenta = new Int8Array(256);
    for (const letra of bolsa) cuenta[letra.charCodeAt(0)]++;

    for (let L = Math.min(LONGITUD_MAX, bolsa.length); L >= LONGITUD_MIN; L--) {
      const grupo = porLongitud[L];
      const encontradas = [];
      for (let w = 0; w < grupo.norm.length; w++) {
        const palabra = grupo.norm[w];
        // Se van gastando las letras de la bolsa; si alguna falta, la palabra no vale
        let i = 0, vale = true;
        for (; i < L; i++) {
          if (--cuenta[palabra.charCodeAt(i)] < 0) { vale = false; i++; break; }
        }
        while (i-- > 0) cuenta[palabra.charCodeAt(i)]++;   // se devuelven las letras gastadas
        if (vale) encontradas.push(grupo.vista[w]);
      }
      resultado[L] = encontradas;
    }
    return resultado;
  }

  // La palabra más larga posible (o null)
  function mejorPalabra(bolsa) {
    const resultado = buscar(bolsa);
    for (let L = LONGITUD_MAX; L >= LONGITUD_MIN; L--) {
      if (resultado[L] && resultado[L].length) return resultado[L][0];
    }
    return null;
  }

  /* =========================================================
     3. ATRIL: fichas de letras enlazadas con el campo de texto
     Se puede escribir o pulsar las fichas; las letras usadas se atenúan.
     ========================================================= */
  class Atril {
    constructor({ fichas, entrada, ayuda = null, alCambiar = () => {} }) {
      this.elFichas = fichas;
      this.entrada = entrada;
      this.elAyuda = ayuda;
      this.alCambiar = alCambiar;
      this.bolsa = [];
      this.usadas = [];
      this.sobrantes = [];
      this.bloqueado = false;

      entrada.addEventListener('input', () => {
        const limpio = entrada.value.toUpperCase().replace(/[^A-ZÑÁÉÍÓÚÜ]/g, '').slice(0, LONGITUD_MAX);
        if (limpio !== entrada.value) entrada.value = limpio;
        this._actualizar();
      });
      fichas.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-i]');
        if (b && !this.bloqueado) this._pulsar(Number(b.dataset.i));
      });
    }

    get palabra() { return this.entrada.value.trim(); }
    get norm() { return normalizar(this.entrada.value); }

    repartir(bolsa) {
      this.bolsa = bolsa.slice();
      this.entrada.value = '';
      this._pintar(true);
      this._actualizar();
    }

    barajar() {
      barajar(this.bolsa);
      this._pintar(false);
      this._actualizar();
    }

    limpiar() {
      this.entrada.value = '';
      this._actualizar();
    }

    bloquear(si) {
      this.bloqueado = si;
      this.entrada.disabled = si;
      for (const b of this.elFichas.children) b.disabled = si;
    }

    _pulsar(i) {
      const letra = this.bolsa[i];
      if (this.usadas[i]) {
        // Quita del texto la última aparición de esa letra
        const texto = this.entrada.value;
        for (let p = texto.length - 1; p >= 0; p--) {
          if (normalizar(texto[p]) === letra) {
            this.entrada.value = texto.slice(0, p) + texto.slice(p + 1);
            break;
          }
        }
      } else if (this.entrada.value.length < LONGITUD_MAX) {
        this.entrada.value += letra;
      }
      this._actualizar();
    }

    _pintar(repartir) {
      this.elFichas.replaceChildren(...this.bolsa.map((letra, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ficha es-letra' + (VOCALES.includes(letra) ? ' es-vocal' : '') + (repartir ? ' entra' : '');
        b.dataset.i = i;
        b.textContent = letra;
        b.disabled = this.bloqueado;
        if (repartir) b.style.setProperty('--i', i);
        return b;
      }));
    }

    // Marca qué fichas gasta el texto escrito y qué letras no están en la bolsa
    _actualizar() {
      const usadas = new Array(this.bolsa.length).fill(false);
      const sobrantes = [];
      for (const letra of this.norm) {
        const idx = this.bolsa.findIndex((l, i) => l === letra && !usadas[i]);
        if (idx === -1) sobrantes.push(letra);
        else usadas[idx] = true;
      }
      this.usadas = usadas;
      this.sobrantes = sobrantes;

      Array.from(this.elFichas.children).forEach((b, i) => {
        b.classList.toggle('usada', usadas[i]);
        b.setAttribute('aria-pressed', String(usadas[i]));
      });
      this.entrada.setAttribute('aria-invalid', String(sobrantes.length > 0));

      if (this.elAyuda) {
        const n = this.norm.length;
        this.elAyuda.classList.toggle('es-mal', sobrantes.length > 0);
        if (sobrantes.length) {
          this.elAyuda.textContent = `No disponible en tu bolsa: ${sobrantes.join(', ')}`;
        } else {
          this.elAyuda.textContent = n ? `${n} ${n === 1 ? 'letra' : 'letras'}` : '';
        }
      }
      this.alCambiar(this);
    }
  }

  window.Letras = {
    VOCALES, LONGITUD_MIN, LONGITUD_MAX,
    generarBolsa, barajar, normalizar, sePuedeFormar,
    cargar, alCambiarEstado, existe, buscar, mejorPalabra, Atril,
    get listo() { return estado === 'listo'; },
    get estado() { return estado; },
    get total() { return total; },
  };
})();
