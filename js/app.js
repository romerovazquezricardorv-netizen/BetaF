/* ===== Arranque, navegación y acceso con PIN ===== */
'use strict';
(function (F) {
  const vistas = {};
  F.vista = (nombre, def) => { vistas[nombre] = def; };

  const IC = {
    inicio: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    vender: '<svg viewBox="0 0 24 24"><path d="M6 2h12l1 5H5z"/><path d="M5 7h14v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M9 12h6"/></svg>',
    tabla: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
    inventario: '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    pedidos: '<svg viewBox="0 0 24 24"><path d="M1 4h13v12H1zM14 8h4l4 4v4h-8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>',
    reportes: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/></svg>'
  };
  F.IC = IC;
  const NAV = [['inicio', 'Inicio'], ['vender', 'Vender'], ['tabla', 'Tabla'], ['inventario', 'Inventario'], ['pedidos', 'Pedidos'], ['reportes', 'Reportes']];

  F.ir = ruta => { if (location.hash === '#' + ruta) mostrar(); else location.hash = '#' + ruta; };

  function mostrar() {
    const [nombre, arg] = (location.hash.slice(1) || 'inicio').split('/');
    const v = vistas[nombre] || vistas.inicio;
    F.$('#title').textContent = v.titulo;
    F.$$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.v === nombre));
    const el = F.$('#view');
    el.innerHTML = '';
    v.render(el, arg);
    window.scrollTo(0, 0);
  }
  F.refrescar = mostrar;

  /* ---- PIN ---- */
  async function hashPin(pin) {
    const txt = 'fraiche:' + pin;
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (const c of txt) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return 'h' + h;
  }
  F.hashPin = hashPin;

  function bloqueo() {
    const lock = F.$('#lock'), crear = !F.db.config.pinHash;
    const p1 = F.$('#lock-pin'), p2 = F.$('#lock-pin2');
    lock.classList.remove('hidden');
    F.$('#lock-msg').textContent = crear ? 'Crea un PIN de 4 a 8 números para proteger tus datos' : 'Ingresa tu PIN';
    p2.classList.toggle('hidden', !crear); p2.required = crear;
    setTimeout(() => p1.focus(), 100);
    F.$('#lock-form').onsubmit = async e => {
      e.preventDefault();
      const pin = p1.value.trim();
      if (!/^\d{4,8}$/.test(pin)) return F.toast('El PIN debe tener de 4 a 8 números', 'bad');
      if (crear) {
        if (pin !== p2.value.trim()) return F.toast('Los PIN no coinciden', 'bad');
        F.db.config.pinHash = await hashPin(pin); F.guardar();
      } else if (await hashPin(pin) !== F.db.config.pinHash) {
        p1.value = ''; return F.toast('PIN incorrecto', 'bad');
      }
      sessionStorage.setItem('fraiche_ok', '1');
      p1.value = p2.value = '';
      lock.classList.add('hidden');
      mostrar();
    };
  }
  F.bloquear = () => { sessionStorage.removeItem('fraiche_ok'); bloqueo(); };

  F.iniciar = () => {
    F.cargar();
    F.$('#nav').innerHTML = NAV.map(([v, t]) => `<a href="#${v}" data-v="${v}">${IC[v]}<span>${t}</span></a>`).join('');
    window.addEventListener('hashchange', mostrar);
    if (sessionStorage.getItem('fraiche_ok') === '1' && F.db.config.pinHash) mostrar();
    else bloqueo();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  };
})(window.F);
