/* =========================================================
   CIFRAS · generador de partidas, resolvedor y tablero de juego
   (lo usan cifras.html y simulacion.html)
   ========================================================= */
(function () {
  'use strict';

  const SIMBOLO = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const FICHAS_DISPONIBLES = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,25,50,75,100];

  const textoPaso = (a, op, b, r) => `${a} ${SIMBOLO[op]} ${b} = ${r}`;

  /* =========================================================
     1. REGLAS: qué operaciones se pueden hacer con dos fichas
     ========================================================= */
  // Devuelve { ok, r, texto } o { ok:false, error }. Siempre opera mayor con menor.
  function operar(n1, n2, op) {
    const mayor = Math.max(n1, n2), menor = Math.min(n1, n2);
    let r;
    if (op === '+') {
      r = mayor + menor;
    } else if (op === '-') {
      if (mayor === menor) return { ok: false, error: 'No puedes restar dos números iguales: el resultado sería 0.' };
      r = mayor - menor;
    } else if (op === '*') {
      if (menor === 1) return { ok: false, error: 'Multiplicar por 1 no cambia nada. Elige otra combinación.' };
      r = mayor * menor;
    } else if (op === '/') {
      if (menor === 1) return { ok: false, error: 'Dividir entre 1 no cambia nada. Elige otra combinación.' };
      if (mayor % menor !== 0) return { ok: false, error: `${mayor} no es divisible entre ${menor}: la división tiene que ser exacta.` };
      r = mayor / menor;
    } else {
      return { ok: false, error: 'Operación desconocida.' };
    }
    return { ok: true, r, mayor, menor, texto: textoPaso(mayor, op, menor, r) };
  }

  /* =========================================================
     2. GENERADOR
     ========================================================= */
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function muestraSinReemplazo(arr, n) {
    const pool = arr.slice();
    const elegidos = [];
    for (let k = 0; k < n; k++) {
      const idx = Math.floor(Math.random() * pool.length);
      elegidos.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return elegidos;
  }

  function elegirDosIndices(longitud) {
    const i = Math.floor(Math.random() * longitud);
    let j = Math.floor(Math.random() * longitud);
    while (j === i) j = Math.floor(Math.random() * longitud);
    return [i, j];
  }

  // Partida clásica: 6 fichas del mazo y un objetivo construido operando con ellas.
  // El 95 % de las veces el objetivo es exactamente alcanzable; el resto se desplaza
  // hasta 15 unidades para que haya partidas en las que toque aproximarse.
  function generarPartida() {
    const TOPE_INTENTOS = 3000;

    for (let intento = 0; intento < TOPE_INTENTOS; intento++) {
      const fichasIniciales = muestraSinReemplazo(FICHAS_DISPONIBLES, 6);
      const maxFicha = Math.max(...fichasIniciales);

      // Cada ficha de trabajo recuerda los pasos que la han producido. Así la
      // solución que se enseña solo contiene los pasos que llevan al resultado.
      let trabajo = fichasIniciales.map(v => ({ v, pasos: [] }));
      let operacionesRestantes = randInt(3, 5);
      let ultimo = null;
      let guardia = 0;

      while (operacionesRestantes > 0 && trabajo.length >= 2 && guardia++ < 200) {
        const [i, j] = elegirDosIndices(trabajo.length);
        const res = operar(trabajo[i].v, trabajo[j].v, '+-*/'[randInt(0, 3)]);
        if (!res.ok) continue;
        const nodo = { v: res.r, pasos: trabajo[i].pasos.concat(trabajo[j].pasos, [res.texto]) };
        trabajo = trabajo.filter((_, k) => k !== i && k !== j);
        trabajo.push(nodo);
        ultimo = nodo;
        operacionesRestantes--;
      }

      // Se descartan las partidas que se resolverían con una sola operación
      if (!ultimo || ultimo.pasos.length < 2) continue;

      const c = Math.random() < 0.95 ? 0 : randInt(1, 15) * (Math.random() < 0.5 ? -1 : 1);
      const objetivoFinal = ultimo.v + c;

      if (objetivoFinal > maxFicha && objetivoFinal >= 100 && objetivoFinal <= 1500) {
        return { fichasIniciales, objetivoFinal, historialPasos: ultimo.pasos, c, resultadoExacto: ultimo.v, modo: 'clasico' };
      }
    }
    // Reserva extremadamente improbable
    return {
      fichasIniciales: [10, 5, 2, 7, 3, 1], objetivoFinal: 107,
      historialPasos: ['10 × 5 = 50', '50 × 2 = 100', '100 + 7 = 107'],
      c: 0, resultadoExacto: 107, modo: 'clasico',
    };
  }

  // Partida "+": números del 1 al 100 con la misma probabilidad y objetivo de 201 a 2500
  function generarPartidaPlus() {
    const fichasIniciales = [];
    for (let i = 0; i < 6; i++) fichasIniciales.push(randInt(1, 100));
    return { fichasIniciales, objetivoFinal: randInt(201, 2500), historialPasos: [], c: null, resultadoExacto: null, modo: 'plus' };
  }

  /* =========================================================
     3. RESOLVEDOR
     Explora todas las combinaciones. Cada número intermedio es un nodo que
     recuerda de qué dos números sale, de modo que una solución solo incluye
     los pasos que de verdad se usan para llegar al objetivo.
     ========================================================= */
  function resolver(numerosIniciales, objetivo) {
    const LIMITE = Number.MAX_SAFE_INTEGER;
    const hojas = numerosIniciales.map(v => ({ v, a: null, b: null, op: '', k: 0 }));

    let mejorDif = Infinity;
    let mejorNodo = null;
    for (const h of hojas) {
      const d = Math.abs(h.v - objetivo);
      if (d < mejorDif) { mejorDif = d; mejorNodo = h; }
    }
    const fichaDirecta = mejorDif === 0;
    const unicas = new Map();

    function pasosDe(nodo, salida = []) {
      if (!nodo.a) return salida;
      pasosDe(nodo.a, salida);
      pasosDe(nodo.b, salida);
      salida.push(textoPaso(nodo.a.v, nodo.op, nodo.b.v, nodo.v));
      return salida;
    }

    function probar(r, op, x, y, resto, n) {
      const d = r > objetivo ? r - objetivo : objetivo - r;
      const k = x.k + y.k + 1;
      let nodo = null;
      // A igual distancia se prefiere el camino con menos pasos
      if (d < mejorDif || (d === mejorDif && k < mejorNodo.k)) {
        nodo = { v: r, a: x, b: y, op, k };
        mejorDif = d;
        mejorNodo = nodo;
      }
      if (d === 0) {
        const pasos = pasosDe(nodo || { v: r, a: x, b: y, op, k });
        const clave = pasos.slice().sort().join('|');
        if (!unicas.has(clave)) unicas.set(clave, pasos);
        return;
      }
      if (n > 2) {
        resto[n - 2] = nodo || { v: r, a: x, b: y, op, k };
        dfs(resto, n - 1);
      }
    }

    function dfs(lista, n) {
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          let x = lista[i], y = lista[j];
          if (x.v < y.v) { const t = x; x = y; y = t; }
          const a = x.v, b = y.v;

          let resto = null;
          if (n > 2) {
            resto = new Array(n - 1);
            let p = 0;
            for (let m = 0; m < n; m++) if (m !== i && m !== j) resto[p++] = lista[m];
          }

          probar(a + b, '+', x, y, resto, n);
          // Se descartan los pasos que devuelven un número que ya se tenía (8 − 4 = 4, 9 ÷ 3 = 3)
          if (a !== b && a - b !== b) probar(a - b, '-', x, y, resto, n);
          if (b > 1) {
            if (a * b <= LIMITE) probar(a * b, '*', x, y, resto, n);
            if (a % b === 0 && a / b !== b) probar(a / b, '/', x, y, resto, n);
          }
        }
      }
    }

    if (!fichaDirecta) dfs(hojas, hojas.length);

    const soluciones = Array.from(unicas.values()).sort((p, q) => p.length - q.length);
    return {
      soluciones,              // listas de pasos, de la más corta a la más larga
      fichaDirecta,            // true si una de las fichas ya era el objetivo
      mejorAproximacion: mejorNodo.v,
      mejorDiferencia: mejorDif,
      mejorCamino: pasosDe(mejorNodo),
    };
  }

  /* =========================================================
     4. TABLERO: fichas clicables + operadores + lista de pasos
     ========================================================= */
  class Tablero {
    constructor(raiz, { alCambiar = () => {} } = {}) {
      this.raiz = raiz;
      this.alCambiar = alCambiar;
      this.objetivo = null;
      this.iniciales = [];
      this.fichas = [];       // { id, v, res } — res = es resultado de una operación
      this.seleccion = [];    // ids de las fichas elegidas (máximo 2)
      this.pasos = [];
      this.historial = [];    // copias para poder deshacer
      this.bloqueado = false;
      this._siguienteId = 0;

      raiz.classList.add('tablero');
      raiz.innerHTML = `
        <div class="fichas" data-t="fichas" role="group" aria-label="Fichas disponibles"></div>
        <div class="operadores" data-t="ops" role="group" aria-label="Operaciones">
          <button type="button" class="operador" data-op="+" aria-label="Sumar">+</button>
          <button type="button" class="operador" data-op="-" aria-label="Restar">−</button>
          <button type="button" class="operador" data-op="*" aria-label="Multiplicar">×</button>
          <button type="button" class="operador" data-op="/" aria-label="Dividir">÷</button>
        </div>
        <p class="tablero-ayuda" data-t="ayuda" aria-live="polite"></p>
        <div class="tablero-error" data-t="error" role="alert"></div>
        <ol class="pasos" data-t="pasos" aria-label="Pasos realizados"></ol>`;
      const parte = (nombre) => raiz.querySelector(`[data-t="${nombre}"]`);
      this.elFichas = parte('fichas');
      this.elOps = parte('ops');
      this.elAyuda = parte('ayuda');
      this.elError = parte('error');
      this.elPasos = parte('pasos');

      this.elFichas.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-id]');
        if (b) this.alternar(Number(b.dataset.id));
      });
      this.elOps.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-op]');
        if (b) this.aplicar(b.dataset.op);
      });
      // Atajos de teclado: con dos fichas elegidas, + - * / aplican la operación
      document.addEventListener('keydown', (e) => {
        if (this.bloqueado || this.seleccion.length !== 2 || !this.raiz.offsetParent) return;
        if (e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('calc-abierta')) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        const op = { '+': '+', '-': '-', '*': '*', 'x': '*', 'X': '*', '/': '/' }[e.key];
        if (op) { e.preventDefault(); this.aplicar(op); }
      });
    }

    /* ----- Estado que consultan las páginas ----- */
    get valores() { return this.fichas.map(f => f.v); }
    get puedeDeshacer() { return this.historial.length > 0; }
    get exacto() { return this.fichas.some(f => f.v === this.objetivo); }
    get masCercana() {
      let valor = null, diferencia = Infinity;
      for (const f of this.fichas) {
        const d = Math.abs(f.v - this.objetivo);
        if (d < diferencia) { diferencia = d; valor = f.v; }
      }
      return { valor, diferencia };
    }

    /* ----- Acciones ----- */
    iniciar(numeros, objetivo, { repartir = true } = {}) {
      this.objetivo = objetivo;
      this.iniciales = numeros.slice();
      this.fichas = numeros.map(v => ({ id: this._siguienteId++, v, res: false }));
      this.seleccion = [];
      this.pasos = [];
      this.historial = [];
      this.bloqueado = false;
      this._error('');
      this._pintar({ repartir });
      this.alCambiar(this);
    }

    reiniciar() { this.iniciar(this.iniciales, this.objetivo, { repartir: false }); }

    bloquear(si) {
      this.bloqueado = si;
      this.seleccion = [];
      this._error('');
      this._pintar();
    }

    alternar(id) {
      if (this.bloqueado) return;
      this._error('');
      if (this.seleccion.includes(id)) this.seleccion = this.seleccion.filter(x => x !== id);
      else if (this.seleccion.length < 2) this.seleccion.push(id);
      else this.seleccion = [id];
      this._pintar({ foco: id });
    }

    aplicar(op) {
      if (this.bloqueado || this.seleccion.length !== 2) return;
      const [f1, f2] = this.seleccion.map(id => this.fichas.find(f => f.id === id));
      const res = operar(f1.v, f2.v, op);
      if (!res.ok) { this._error(res.error); return; }

      this.historial.push({ fichas: this.fichas.slice(), pasos: this.pasos.slice() });
      const nueva = { id: this._siguienteId++, v: res.r, res: true };
      this.fichas = this.fichas.filter(f => f !== f1 && f !== f2).concat(nueva);
      this.pasos.push(res.texto);
      this.seleccion = [];
      this._error('');
      this._pintar({ nace: nueva.id, foco: nueva.id });
      this.alCambiar(this);
    }

    deshacer() {
      const previo = this.historial.pop();
      if (!previo) return;
      this.fichas = previo.fichas;
      this.pasos = previo.pasos;
      this.seleccion = [];
      this.bloqueado = false;
      this._error('');
      this._pintar();
      this.alCambiar(this);
    }

    /* ----- Pintado ----- */
    _error(mensaje) {
      this.elError.replaceChildren();
      this.elError.classList.remove('tiembla');
      if (!mensaje) return;
      const caja = document.createElement('div');
      caja.className = 'aviso es-mal';
      caja.textContent = mensaje;
      this.elError.append(caja);
      void this.elError.offsetWidth;   // reinicia la animación si se repite el error
      this.elError.classList.add('tiembla');
    }

    _pintar({ repartir = false, nace = null, foco = null } = {}) {
      const teniaFoco = this.raiz.contains(document.activeElement);

      this.elFichas.replaceChildren(...this.fichas.map((f, i) => {
        const elegida = this.seleccion.includes(f.id);
        const texto = String(f.v);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ficha'
          + (f.res ? ' es-resultado' : '')
          + (elegida ? ' es-seleccionada' : '')
          + (f.v === this.objetivo ? ' es-diana' : '')
          + (texto.length >= 7 ? ' es-muy-larga' : texto.length >= 5 ? ' es-larga' : '')
          + (repartir ? ' entra' : '')
          + (f.id === nace ? ' nace' : '');
        b.dataset.id = f.id;
        b.textContent = texto;
        b.disabled = this.bloqueado;
        b.setAttribute('aria-pressed', String(elegida));
        if (repartir) b.style.setProperty('--i', i);
        return b;
      }));

      const listo = !this.bloqueado && this.seleccion.length === 2;
      this.raiz.classList.toggle('listo', listo);
      for (const b of this.elOps.children) b.disabled = !listo;

      let ayuda = '';
      if (!this.bloqueado) {
        if (this.fichas.length < 2) ayuda = 'Solo queda una ficha.';
        else if (this.seleccion.length === 0) ayuda = 'Elige dos fichas para combinarlas.';
        else if (this.seleccion.length === 1) ayuda = 'Elige una segunda ficha.';
        else {
          const [x, y] = this.seleccion.map(id => this.fichas.find(f => f.id === id).v);
          ayuda = `Elige la operación para ${Math.max(x, y)} y ${Math.min(x, y)}.`;
        }
      }
      this.elAyuda.textContent = ayuda;

      this.elPasos.replaceChildren(...this.pasos.map(p => {
        const li = document.createElement('li');
        li.textContent = p;
        return li;
      }));

      // Al repintar se pierde el foco del teclado: se devuelve a la ficha que toca
      if (teniaFoco && foco !== null && !this.bloqueado) {
        const destino = this.elFichas.querySelector(`[data-id="${foco}"]`);
        if (destino) destino.focus({ preventScroll: true });
      }
    }
  }

  window.Cifras = { SIMBOLO, operar, generarPartida, generarPartidaPlus, resolver, Tablero, randInt, textoPaso };
})();
