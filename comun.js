/* =========================================================
   CIFRAS Y LETRAS · código compartido por todas las páginas
   1. Utilidades          2. Iconos            3. Menús flotantes
   4. Tema                5. Pestañas          6. Avisos y destello
   7. Barra de herramientas   8. Temporizador  9. Calculadora
   ========================================================= */
(function () {
  'use strict';

  /* =========================================================
     1. UTILIDADES
     ========================================================= */
  const $ = (selector, raiz = document) => raiz.querySelector(selector);
  const $$ = (selector, raiz = document) => Array.from(raiz.querySelectorAll(selector));

  // Crea un elemento: crear('button', { class:'btn', text:'Hola', onclick: fn }, hijo1, hijo2)
  function crear(etiqueta, props = {}, ...hijos) {
    const el = document.createElement(etiqueta);
    for (const [clave, valor] of Object.entries(props)) {
      if (valor == null || valor === false) continue;
      if (clave === 'class') el.className = valor;
      else if (clave === 'text') el.textContent = valor;
      else if (clave === 'html') el.innerHTML = valor;
      else if (clave.startsWith('on')) el.addEventListener(clave.slice(2), valor);
      else el.setAttribute(clave, valor === true ? '' : valor);
    }
    for (const hijo of hijos.flat()) {
      if (hijo != null && hijo !== false) el.append(hijo);
    }
    return el;
  }

  function leer(clave, porDefecto = null) {
    try {
      const valor = localStorage.getItem(clave);
      return valor === null ? porDefecto : valor;
    } catch (e) { return porDefecto; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, valor); } catch (e) {}
  }
  function leerJSON(clave, porDefecto) {
    try {
      const valor = JSON.parse(localStorage.getItem(clave));
      return valor == null ? porDefecto : valor;
    } catch (e) { return porDefecto; }
  }

  const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

  function formatearTiempo(totalSegundos) {
    const m = Math.floor(totalSegundos / 60);
    const s = totalSegundos % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function enCampoDeTexto(el) {
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }

  /* =========================================================
     2. ICONOS (trazos sencillos, heredan el color del texto)
     ========================================================= */
  const ICONOS = {
    tema: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
    reloj: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>',
    calculadora: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    deshacer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    reiniciar: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    barajar: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h2a4 4 0 0 0 3.3-1.7l5.4-8.6A4 4 0 0 1 16 6h6"/><path d="M2 6h2a4 4 0 0 1 3.5 2.1"/><path d="M22 18h-6a4 4 0 0 1-3.3-1.8l-.4-.5"/>',
    borrar: '<path d="M10 5a2 2 0 0 0-1.3.5l-6.4 5.8a1 1 0 0 0 0 1.4l6.4 5.8A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6M18 9l-6 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    rayo: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  };
  function icono(nombre, tam = 20) {
    return `<svg class="icono" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre] || ''}</svg>`;
  }

  /* =========================================================
     3. MENÚS FLOTANTES (se cierran al pulsar fuera o con Escape)
     ========================================================= */
  const flotantesAbiertos = new Set();

  function flotante(boton, panel) {
    const api = {
      abrir() {
        for (const otro of [...flotantesAbiertos]) otro.cerrar();
        panel.hidden = false;
        boton.setAttribute('aria-expanded', 'true');
        flotantesAbiertos.add(api);
      },
      cerrar() {
        panel.hidden = true;
        boton.setAttribute('aria-expanded', 'false');
        flotantesAbiertos.delete(api);
      },
      alternar() { panel.hidden ? api.abrir() : api.cerrar(); },
      contiene(nodo) { return panel.contains(nodo) || boton.contains(nodo); },
    };
    boton.addEventListener('click', () => api.alternar());
    return api;
  }
  document.addEventListener('click', (e) => {
    for (const f of [...flotantesAbiertos]) if (!f.contiene(e.target)) f.cerrar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') for (const f of [...flotantesAbiertos]) f.cerrar();
  });

  /* =========================================================
     4. TEMA (compartido entre páginas mediante localStorage)
     ========================================================= */
  const CLAVE_TEMA = 'cifrasYLetrasTema';
  const TEMAS = [
    { id: 'clasico',   nombre: 'Clásico',   m1: '#2F6BFF', m2: '#FFD23F', barra: '#04051A' },
    { id: 'dia',       nombre: 'Día',       m1: '#FFFFFF', m2: '#2B5BFF', barra: '#EEF2FF' },
    { id: 'noche',     nombre: 'Noche',     m1: '#070A22', m2: '#2A4A9E', barra: '#020208' },
    { id: 'elegancia', nombre: 'Elegancia', m1: '#0B1226', m2: '#D9A441', barra: '#05070F' },
  ];
  const temaValido = (id) => TEMAS.some(t => t.id === id);

  function aplicarTema(id, recordar = true) {
    if (!temaValido(id)) id = 'clasico';
    document.documentElement.dataset.tema = id;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', TEMAS.find(t => t.id === id).barra);
    $$('#menu-tema button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.tema === id)));
    if (recordar) guardar(CLAVE_TEMA, id);
  }

  function iniciarTema() {
    const boton = $('#btn-tema');
    const menu = $('#menu-tema');
    if (boton && menu) {
      const menuTema = flotante(boton, menu);
      for (const t of TEMAS) {
        menu.append(crear('button', {
          type: 'button', role: 'menuitemradio', 'data-tema': t.id,
          style: `--m1:${t.m1}; --m2:${t.m2}`,
          html: `<span class="muestra"></span>${t.nombre}${icono('check', 16)}`,
          onclick: () => { aplicarTema(t.id); menuTema.cerrar(); },
        }));
      }
    }
    aplicarTema(leer(CLAVE_TEMA, 'clasico'), false);
    // Si el tema cambia en otra pestaña del navegador, se refleja aquí al instante
    window.addEventListener('storage', (e) => {
      if (e.key === CLAVE_TEMA && e.newValue) aplicarTema(e.newValue, false);
    });
  }

  /* =========================================================
     5. PESTAÑAS (botones role="tab" que muestran su aria-controls)
     ========================================================= */
  function pestanas(lista) {
    const tabs = $$('[role="tab"]', lista);
    function activar(tab, darFoco = false) {
      for (const t of tabs) {
        const elegida = t === tab;
        t.setAttribute('aria-selected', String(elegida));
        t.tabIndex = elegida ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !elegida;
      }
      if (darFoco) tab.focus();
    }
    lista.addEventListener('click', (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (tab) activar(tab);
    });
    lista.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i === -1) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); activar(tabs[(i + 1) % tabs.length], true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); activar(tabs[(i - 1 + tabs.length) % tabs.length], true); }
    });
    activar(tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0]);
  }

  /* =========================================================
     6. AVISOS, LISTAS DE PASOS Y DESTELLO DE FIN DE TIEMPO
     ========================================================= */
  function aviso(tipo, titulo, texto) {
    const nombreIcono = { ok: 'check', mal: 'x', info: 'info' }[tipo] || 'info';
    const cuerpo = crear('div', {},
      titulo ? crear('strong', { text: titulo }) : null,
      texto ? crear('span', { text: texto }) : null);
    return crear('div', { class: `aviso es-${tipo}`, html: icono(nombreIcono) }, cuerpo);
  }

  function listaPasos(pasos) {
    return crear('ol', { class: 'pasos' }, pasos.map(p => crear('li', { text: p })));
  }

  let regionViva = null;
  function anunciar(texto) {
    if (!regionViva) {
      regionViva = crear('div', { class: 'solo-lectores', 'aria-live': 'assertive' });
      document.body.append(regionViva);
    }
    regionViva.textContent = '';
    setTimeout(() => { regionViva.textContent = texto; }, 30);
  }

  function destello() {
    const capa = crear('div', { class: 'destello', 'aria-hidden': 'true' });
    document.body.append(capa);
    setTimeout(() => capa.remove(), 1000);
  }

  // Lluvia de confeti para celebrar un acierto (no se lanza si el usuario pide menos movimiento)
  function confeti({ cantidad = 130, x = 0.5, y = 0.38 } = {}) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lienzo = crear('canvas', { class: 'confeti', 'aria-hidden': 'true' });
    document.body.append(lienzo);
    const ctx = lienzo.getContext('2d');
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    const ancho = window.innerWidth, alto = window.innerHeight;
    lienzo.width = ancho * escala;
    lienzo.height = alto * escala;
    ctx.scale(escala, escala);

    const COLORES = ['#FFD23F', '#FF2E57', '#5CE5FF', '#FFFFFF', '#3D7BFF', '#FF9F1C'];
    const DURACION = 2400;
    const piezas = Array.from({ length: cantidad }, () => {
      const angulo = Math.random() * Math.PI * 2;
      const fuerza = 5 + Math.random() * 13;
      return {
        x: ancho * x, y: alto * y,
        vx: Math.cos(angulo) * fuerza, vy: Math.sin(angulo) * fuerza - 7,
        ancho: 7 + Math.random() * 8, alto: 4 + Math.random() * 6,
        giro: Math.random() * Math.PI, vGiro: (Math.random() - 0.5) * 0.5,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
      };
    });

    const inicio = performance.now();
    function cuadro(ahora) {
      const t = ahora - inicio;
      ctx.clearRect(0, 0, ancho, alto);
      ctx.globalAlpha = Math.max(0, 1 - Math.pow(t / DURACION, 3));
      for (const p of piezas) {
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.34;
        p.x += p.vx; p.y += p.vy; p.giro += p.vGiro;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto * Math.abs(Math.cos(p.giro * 2)) + 1);
        ctx.restore();
      }
      if (t < DURACION) requestAnimationFrame(cuadro);
      else lienzo.remove();
    }
    requestAnimationFrame(cuadro);
    setTimeout(() => lienzo.remove(), DURACION + 1500);   // por si la pestaña estaba en segundo plano
  }

  // Hace subir un número desde 0 hasta su valor, como un marcador
  function contarHasta(el, valor, duracion = 900) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || valor <= 0) { el.textContent = valor; return; }
    const inicio = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - inicio) / duracion);
      el.textContent = Math.round(valor * (1 - Math.pow(1 - t, 3)));
      if (t >= 1) clearInterval(id);
    }, 30);
  }

  /* =========================================================
     7. BARRA DE HERRAMIENTAS FLOTANTE (abajo a la derecha)
     ========================================================= */
  let elDock = null;
  function dock() {
    if (!elDock) {
      elDock = crear('div', { class: 'dock', role: 'toolbar', 'aria-label': 'Herramientas' });
      document.body.append(elDock);
    }
    return elDock;
  }
  function actualizarDock() {
    if (!elDock) return;
    const visible = Array.from(elDock.children).some(c => !c.hidden);
    elDock.hidden = !visible;
    document.body.classList.toggle('con-dock', visible);
  }

  /* =========================================================
     8. TEMPORIZADOR
     Se arma con el interruptor y arranca cuando la página llama a iniciar().
     Cuenta contra la hora real, así no se retrasa si la pestaña queda en segundo plano.
     ========================================================= */
  function crearTemporizador({ clave, segundosPorDefecto = 30, nota = 'Se pone en marcha al generar una partida.', alTerminar = () => {} } = {}) {
    const CLAVE = `cifrasYLetrasTemporizador:${clave}`;
    const previo = leerJSON(CLAVE, {});
    let activo = previo.activo === true;
    let duracion = limitar(parseInt(previo.segundos, 10) || segundosPorDefecto, 5, 3599);
    let restante = duracion;
    let fin = 0;
    let intervalo = null;
    let agotado = false;

    const elTiempo = crear('span');
    const boton = crear('button', { class: 'dock-btn', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', html: icono('reloj') }, elTiempo);
    const elLed = crear('output', { class: 'led es-chico' });
    const chk = crear('input', { type: 'checkbox', 'aria-label': 'Activar el temporizador' });
    const inMin = crear('input', { type: 'number', id: 'temp-min', min: '0', max: '59', inputmode: 'numeric' });
    const inSeg = crear('input', { type: 'number', id: 'temp-seg', min: '0', max: '59', inputmode: 'numeric' });
    const presets = [30, 45, 60, 120].map(s => crear('button', {
      class: 'chip', type: 'button', 'data-seg': s,
      text: s < 60 ? `${s} s` : `${s / 60} min`,
    }));

    const panel = crear('div', { class: 'flotante arriba panel-tiempo', role: 'dialog', 'aria-label': 'Temporizador', hidden: true },
      crear('div', { class: 'panel-tiempo-cab' },
        crear('h3', { text: 'Temporizador' }),
        crear('label', { class: 'interruptor' }, chk, crear('span'))),
      elLed,
      crear('div', { class: 'tiempo-campos' },
        crear('div', {}, crear('label', { class: 'etiqueta', for: 'temp-min', text: 'Min' }), inMin),
        crear('div', {}, crear('label', { class: 'etiqueta', for: 'temp-seg', text: 'Seg' }), inSeg)),
      crear('div', { class: 'chips' }, presets),
      crear('p', { class: 'nota', text: nota }));

    dock().prepend(crear('div', { class: 'dock-grupo' }, boton, panel));
    flotante(boton, panel);
    actualizarDock();

    function recordar() { guardar(CLAVE, JSON.stringify({ activo, segundos: duracion })); }

    function pintar() {
      const corriendo = intervalo !== null;
      elTiempo.textContent = activo ? formatearTiempo(restante) : 'OFF';
      elLed.textContent = formatearTiempo(restante);
      boton.classList.toggle('es-apagado', !activo);
      boton.classList.toggle('es-urgente', corriendo && restante <= 10);
      boton.classList.toggle('es-agotado', agotado);
      boton.setAttribute('aria-label', activo ? `Temporizador: ${formatearTiempo(restante)}` : 'Temporizador apagado');
      chk.checked = activo;
      inMin.disabled = inSeg.disabled = corriendo;
      if (document.activeElement !== inMin) inMin.value = Math.floor(duracion / 60);
      if (document.activeElement !== inSeg) inSeg.value = duracion % 60;
      for (const p of presets) {
        p.setAttribute('aria-pressed', String(Number(p.dataset.seg) === duracion));
        p.disabled = corriendo;
      }
    }

    function parar() {
      if (intervalo !== null) { clearInterval(intervalo); intervalo = null; }
    }

    function tic() {
      const r = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      if (r === restante) return;
      restante = r;
      if (r === 0) {
        parar();
        agotado = true;
        pintar();
        destello();
        anunciar('¡Tiempo!');
        alTerminar();
        return;
      }
      pintar();
    }

    function fijarDuracion(segundos) {
      duracion = limitar(segundos, 5, 3599);
      if (intervalo === null) { restante = duracion; agotado = false; }
      recordar();
      pintar();
    }

    chk.addEventListener('change', () => {
      activo = chk.checked;
      parar();
      agotado = false;
      restante = duracion;
      recordar();
      pintar();
    });
    const alCambiarCampos = () => {
      const min = limitar(parseInt(inMin.value, 10) || 0, 0, 59);
      const seg = limitar(parseInt(inSeg.value, 10) || 0, 0, 59);
      fijarDuracion(min * 60 + seg);
    };
    inMin.addEventListener('change', alCambiarCampos);
    inSeg.addEventListener('change', alCambiarCampos);
    for (const p of presets) p.addEventListener('click', () => fijarDuracion(Number(p.dataset.seg)));

    pintar();

    return {
      get activo() { return activo; },
      get corriendo() { return intervalo !== null; },
      // Arranca la cuenta atrás (solo si el interruptor está encendido)
      iniciar() {
        parar();
        agotado = false;
        restante = duracion;
        if (activo) {
          fin = Date.now() + duracion * 1000;
          intervalo = setInterval(tic, 200);
        }
        pintar();
        return activo;
      },
      // Congela la cuenta donde esté (por ejemplo, al acertar)
      pausar() { parar(); pintar(); },
      // Detiene y vuelve a la duración configurada
      detener() { parar(); agotado = false; restante = duracion; pintar(); },
    };
  }

  /* =========================================================
     9. CALCULADORA AUXILIAR
     ========================================================= */
  // Evalúa + − × ÷ con paréntesis y signo negativo, sin recurrir a eval()
  function evaluarExpresion(texto) {
    const s = texto.replace(/\s+/g, '');
    let i = 0;

    function numero() {
      const inicio = i;
      while (i < s.length && /[0-9.]/.test(s[i])) i++;
      const trozo = s.slice(inicio, i);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(trozo)) throw new Error('sintaxis');
      return parseFloat(trozo);
    }
    function factor() {
      if (s[i] === '-') { i++; return -factor(); }
      if (s[i] === '+') { i++; return factor(); }
      if (s[i] === '(') {
        i++;
        const valor = expresion();
        if (s[i] !== ')') throw new Error('sintaxis');
        i++;
        return valor;
      }
      return numero();
    }
    function termino() {
      let valor = factor();
      while (s[i] === '*' || s[i] === '/') {
        const op = s[i++];
        const otro = factor();
        if (op === '/' && otro === 0) throw new Error('cero');
        valor = op === '*' ? valor * otro : valor / otro;
      }
      return valor;
    }
    function expresion() {
      let valor = termino();
      while (s[i] === '+' || s[i] === '-') {
        const op = s[i++];
        const otro = termino();
        valor = op === '+' ? valor + otro : valor - otro;
      }
      return valor;
    }

    const resultado = expresion();
    if (i !== s.length || !isFinite(resultado)) throw new Error('sintaxis');
    return resultado;
  }

  function crearCalculadora() {
    const BONITO = { '*': '×', '/': '÷', '-': '−' };
    const bonito = (t) => t.replace(/[*/-]/g, c => BONITO[c]);
    const MAX_HISTORIAL = 6;

    let expr = '';
    let ans = 0;
    let evaluado = false;
    let historial = [];

    const elPantalla = crear('output', { class: 'calc-pantalla' });
    const elError = crear('p', { class: 'calc-error', role: 'alert' });
    const elAns = crear('span', { text: '0' });
    const elHistorial = crear('div');

    const TECLAS = [
      ['7'], ['8'], ['9'], ['(', 'es-op'], [')', 'es-op'],
      ['4'], ['5'], ['6'], ['*', 'es-op', 'Multiplicar'], ['/', 'es-op', 'Dividir'],
      ['1'], ['2'], ['3'], ['+', 'es-op', 'Sumar'], ['-', 'es-op', 'Restar'],
      ['0'], ['.'], ['ANS', 'es-fn', 'Último resultado'], ['C', 'es-fn', 'Borrar todo'], ['⌫', 'es-fn', 'Borrar el último carácter'],
      ['=', 'es-igual', 'Calcular'],
    ];
    const teclado = crear('div', { class: 'calc-teclado' }, TECLAS.map(([tecla, clase, etiqueta]) => {
      const b = crear('button', { type: 'button', class: clase, 'data-tecla': tecla, 'aria-label': etiqueta });
      if (tecla === '⌫') b.innerHTML = icono('borrar', 18);
      else b.textContent = BONITO[tecla] || tecla;
      return b;
    }));

    const btnCerrar = crear('button', { class: 'btn-icono es-chico', type: 'button', 'aria-label': 'Cerrar la calculadora', html: icono('x', 16) });
    const panel = crear('aside', { class: 'calc', 'aria-label': 'Calculadora' },
      crear('div', { class: 'calc-cab' }, crear('h3', { text: 'Calculadora' }), btnCerrar),
      elPantalla, elError,
      crear('p', { class: 'calc-ans' }, 'Último resultado (ANS): ', elAns),
      teclado,
      crear('div', { class: 'calc-historial' }, crear('h4', { class: 'etiqueta', text: `Últimas ${MAX_HISTORIAL} cuentas` }), elHistorial));
    document.body.append(panel);

    const boton = crear('button', { class: 'dock-btn', type: 'button', 'aria-label': 'Calculadora', 'aria-expanded': 'false', html: icono('calculadora', 22) });
    const grupo = crear('div', { class: 'dock-grupo' }, boton);
    dock().append(grupo);
    actualizarDock();

    function pintar() {
      elPantalla.textContent = expr ? bonito(expr) : '0';
      elAns.textContent = ans;
      elHistorial.replaceChildren(...(historial.length
        ? historial.map(h => crear('button', {
            type: 'button', text: `${bonito(h.expr)} = ${h.resultado}`,
            title: 'Usar este resultado',
            onclick: () => pulsar(String(h.resultado)),
          }))
        : [crear('p', { text: 'Aún no hay operaciones guardadas.' })]));
    }

    function pulsar(simbolo) {
      elError.textContent = '';
      if (evaluado) {
        // Tras un resultado, un operador continúa la cuenta y un número empieza otra
        expr = '+-*/'.includes(simbolo) ? expr + simbolo : simbolo;
        evaluado = false;
      } else {
        expr += simbolo;
      }
      pintar();
    }
    function borrarTodo() { expr = ''; evaluado = false; elError.textContent = ''; pintar(); }
    function borrarUltimo() { expr = expr.slice(0, -1); evaluado = false; elError.textContent = ''; pintar(); }

    function calcular() {
      elError.textContent = '';
      if (!expr.trim()) return;
      try {
        const resultado = Math.round(evaluarExpresion(expr) * 1e6) / 1e6;
        historial.unshift({ expr, resultado });
        historial = historial.slice(0, MAX_HISTORIAL);
        ans = resultado;
        expr = String(resultado);
        evaluado = true;
        pintar();
      } catch (e) {
        elError.textContent = e.message === 'cero' ? 'No se puede dividir entre cero.' : 'Operación no válida.';
      }
    }

    function accionar(tecla) {
      if (tecla === '=') calcular();
      else if (tecla === 'C') borrarTodo();
      else if (tecla === '⌫') borrarUltimo();
      else if (tecla === 'ANS') pulsar(String(ans));
      else pulsar(tecla);
    }

    const abierta = () => panel.classList.contains('abierta');
    function abrir() {
      panel.classList.add('abierta');
      document.body.classList.add('calc-abierta');
      boton.setAttribute('aria-expanded', 'true');
    }
    function cerrar() {
      panel.classList.remove('abierta');
      document.body.classList.remove('calc-abierta');
      boton.setAttribute('aria-expanded', 'false');
    }

    teclado.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tecla]');
      if (b) accionar(b.dataset.tecla);
    });
    boton.addEventListener('click', () => (abierta() ? cerrar() : abrir()));
    btnCerrar.addEventListener('click', () => { cerrar(); boton.focus(); });

    // Con la calculadora abierta también se puede teclear
    document.addEventListener('keydown', (e) => {
      if (!abierta() || e.ctrlKey || e.metaKey || e.altKey || enCampoDeTexto(e.target)) return;
      const k = e.key;
      if (/^[0-9.+\-*/()]$/.test(k)) accionar(k);
      else if (k === ',') accionar('.');
      else if (k === 'x' || k === 'X') accionar('*');
      else if (k === 'Enter' || k === '=') accionar('=');
      else if (k === 'Backspace') accionar('⌫');
      else if (k === 'Delete') accionar('C');
      else if (k === 'Escape') cerrar();
      else return;
      e.preventDefault();
    });

    pintar();

    return {
      abrir, cerrar,
      // Muestra u oculta el botón de la calculadora (la simulación solo la permite en Cifras)
      disponible(si) {
        grupo.hidden = !si;
        if (!si) cerrar();
        actualizarDock();
      },
    };
  }

  /* ========================================================= */
  window.CyL = {
    $, $$, crear, leer, guardar, leerJSON, limitar, formatearTiempo, enCampoDeTexto,
    icono, flotante, aplicarTema, pestanas, aviso, listaPasos, anunciar, destello, confeti, contarHasta,
    crearTemporizador, crearCalculadora, evaluarExpresion,
  };

  /* =========================================================
     10. APLICACIÓN INSTALABLE (iPhone y Android)
     ========================================================= */
  // El service worker guarda la app para usarla sin conexión (solo en la web publicada, por https)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(e => console.warn('Sin modo sin conexión:', e));
    });
  }

  // En iPhone no existe botón de instalar: se explica una vez cómo añadirla a la pantalla de inicio
  function avisoInstalacion() {
    const CLAVE = 'cifrasYLetrasAvisoInstalar';
    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const yaInstalada = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    if (!esIOS || yaInstalada || leer(CLAVE)) return;

    const cerrar = crear('button', { class: 'btn-icono es-chico', type: 'button', 'aria-label': 'Cerrar', html: icono('x', 16) });
    const banda = crear('aside', { class: 'instalar', 'aria-label': 'Instalar la aplicación' },
      crear('img', { src: 'icono-180.png', alt: '', width: '44', height: '44' }),
      crear('p', {}, crear('strong', { text: 'Instálala como app' }),
        'Pulsa Compartir y elige «Añadir a pantalla de inicio».'),
      cerrar);
    cerrar.addEventListener('click', () => { guardar(CLAVE, '1'); banda.remove(); });
    document.body.append(banda);
  }

  iniciarTema();
  avisoInstalacion();
})();
