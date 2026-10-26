/* ===== Vender: perfume nuevo, relleno (con sobrantes) y productos ===== */
'use strict';
(function (F) {
  F.carrito = F.carrito || [];
  let pago = 'efectivo';

  // Lista de aromas para elegir (con buscador)
  function listaAromas(cont, aromas, selId, alElegir, extra) {
    cont.innerHTML = aromas.length ? aromas.map(a => `<button class="pick ${a.id === selId ? 'on' : ''}" data-id="${a.id}">
        <div class="grow"><div class="t">${F.esc(a.nombre)}</div>
        <div class="s">${a.inspiracion ? F.esc(a.inspiracion) + ' · ' : ''}<span class="badge ${a.genero}">${F.GENEROS[a.genero]}</span> <span class="badge ${a.categoria}">${F.cat(a.categoria).nombre}</span></div></div>
        <div class="right small">${extra ? extra(a) : ''}</div></button>`).join('')
      : '<div class="empty">No hay aromas que coincidan. Agrégalos en Inventario.</div>';
    F.$$('.pick', cont).forEach(b => b.onclick = () => alElegir(b.dataset.id));
  }
  const filtrar = (aromas, q) => { q = F.norm(q); return q ? aromas.filter(a => F.norm(a.nombre + ' ' + a.inspiracion).includes(q)) : aromas; };

  /* ---------- PERFUME NUEVO ---------- */
  function formNuevo(panel, listo) {
    const st = { g: 'dama', ml: null, id: null, q: '', precio: null };
    panel.innerHTML = `
      <div class="panel-h"><h3>Perfume nuevo</h3><button class="x" data-cerrar>×</button></div>
      <div class="lbl">¿Para quién?</div><div id="g" class="seg"></div>
      <div class="lbl">Tamaño</div><div id="sz" class="chips"></div>
      <div class="lbl">Aroma</div>
      <input id="q" class="input" type="search" placeholder="Buscar aroma o inspiración…">
      <div id="al" class="pick-list"></div>
      <div id="sum"></div>`;
    const dib = {
      g() {
        const c = F.$('#g', panel); c.className = 'seg ' + st.g;
        c.innerHTML = ['dama', 'caballero'].map(x => `<button data-g="${x}" class="${x === st.g ? 'on' : ''}">${F.GENEROS[x]}</button>`).join('');
        F.$$('button', c).forEach(b => b.onclick = () => { st.g = b.dataset.g; st.precio = null; const a = F.aroma(st.id); if (a && a.genero !== 'unisex' && a.genero !== st.g) st.id = null; todo(); });
      },
      sz() {
        const c = F.$('#sz', panel);
        c.innerHTML = F.TAMANOS_NUEVO.map(ml => `<button class="chip ${ml === st.ml ? 'on' : ''}" data-ml="${ml}">${ml} ml<small>${F.envStock(ml, st.g)} envases</small></button>`).join('');
        F.$$('button', c).forEach(b => b.onclick = () => { st.ml = +b.dataset.ml; st.precio = null; todo(); });
      },
      al() {
        const aromas = filtrar(F.db.aromas.filter(a => a.activo !== false && (a.genero === st.g || a.genero === 'unisex')), st.q);
        listaAromas(F.$('#al', panel), aromas, st.id, id => { st.id = id; st.precio = null; dib.al(); dib.sum(); },
          a => (st.ml ? `<b>${F.money(F.calcNuevo(st.ml, a.categoria).precio)}</b><br>` : '') + `<span class="${a.stockMl < (st.ml || 1) ? 'bad' : 'muted'}">${F.ml(a.stockMl)}</span>`);
      },
      sum() {
        const c = F.$('#sum', panel), a = F.aroma(st.id);
        if (!a || !st.ml) { c.innerHTML = `<p class="small muted" style="margin-top:12px">Elige tamaño y aroma.</p>`; return; }
        const calc = F.calcNuevo(st.ml, a.categoria);
        const precio = st.precio ?? calc.precio;
        const avisos = [];
        if (a.stockMl < st.ml) avisos.push(`Solo hay ${F.ml(a.stockMl)} de ${a.nombre}.`);
        if (F.envStock(st.ml, st.g) < 1) avisos.push(`No hay envases de ${st.ml} ml ${F.GENEROS[st.g].toLowerCase()} en inventario.`);
        c.innerHTML = `<div class="summary">
          <div class="line"><span>${F.esc(a.nombre)}</span><span>${st.ml} ml · ${F.GENEROS[st.g]}</span></div>
          <div class="line muted"><span>Categoría</span><span>${F.cat(a.categoria).nombre}</span></div>
          <div class="line muted"><span>Costo</span><span>${F.money(calc.costo)}</span></div>
          <div class="line"><span>Precio de lista</span><span>${F.money(calc.precio)}</span></div>
          <label class="f">Precio a cobrar (puedes ajustarlo)</label>
          <input id="pr" class="input num" type="number" inputmode="decimal" step="0.5" value="${precio}">
          ${avisos.map(t => `<div class="alert warn" style="margin-top:8px"><span class="dot"></span><div>${F.esc(t)}</div></div>`).join('')}
          <button id="add" class="btn primary block" style="margin-top:12px">Agregar a la venta</button></div>`;
        F.$('#pr', c).oninput = e => { st.precio = F.num(e.target.value, calc.precio); };
        F.$('#add', c).onclick = () => {
          const p = F.num(F.$('#pr', c).value, calc.precio);
          F.carrito.push({ tipo: 'nuevo', aromaId: a.id, nombre: a.nombre, categoria: a.categoria, genero: st.g, ml: st.ml, precio: p, costo: calc.costo });
          F.toast('Agregado: ' + a.nombre + ' ' + st.ml + ' ml'); listo();
        };
      }
    };
    const todo = () => { dib.g(); dib.sz(); dib.al(); dib.sum(); };
    F.$('#q', panel).oninput = e => { st.q = e.target.value; dib.al(); };
    todo();
  }

  /* ---------- RELLENO con apartado de sobrantes ---------- */
  function formRelleno(panel, listo) {
    const st = { id: null, ml: null, q: '', deSob: null, base: 0, precio: null };
    panel.innerHTML = `
      <div class="panel-h"><h3>Relleno</h3><button class="x" data-cerrar>×</button></div>
      <div id="sobs"></div>
      <div class="lbl">Aroma</div>
      <input id="q" class="input" type="search" placeholder="Buscar aroma o inspiración…">
      <div id="al" class="pick-list"></div>
      <div class="lbl">Mililitros a rellenar (envase del cliente)</div>
      <div id="envs" class="chips"></div>
      <input id="ml" class="input num" style="margin-top:8px" type="number" inputmode="decimal" min="1" max="250" placeholder="Otra cantidad (1 a 250 ml)">
      <div id="sum"></div>`;
    const dib = {
      sobs() {
        const lista = F.db.aromas.filter(a => (a.sobranteMl || 0) > 0);
        F.$('#sobs', panel).innerHTML = `<div class="sob-box"><h4>Sobrantes disponibles</h4>
          ${lista.length ? `<div class="chips">${lista.map(a => `<button class="chip sob ${a.id === st.id ? 'on' : ''}" data-id="${a.id}">${F.esc(a.nombre)}<small>${F.ml(a.sobranteMl)}</small></button>`).join('')}</div>
          <p class="small muted" style="margin:8px 0 0">Toca un sobrante para usarlo en este relleno.</p>`
          : '<p class="small muted" style="margin:0">No hay sobrantes guardados.</p>'}</div>`;
        F.$$('#sobs .chip', panel).forEach(b => b.onclick = () => { st.id = b.dataset.id; st.deSob = null; st.precio = null; todo(); });
      },
      al() {
        const aromas = filtrar(F.db.aromas.filter(a => a.activo !== false || a.id === st.id), st.q);
        listaAromas(F.$('#al', panel), aromas, st.id, id => { st.id = id; st.deSob = null; st.precio = null; dib.sobs(); dib.al(); dib.sum(); },
          a => `${(st.ml ? `<b>${F.money(F.calcRelleno(st.ml, a.categoria).precio)}</b><br>` : '')}<span class="muted">${F.ml(a.stockMl)}</span>${a.sobranteMl > 0 ? `<br><span class="warn">+${F.ml(a.sobranteMl)} sobr.</span>` : ''}`);
      },
      envs() {
        const c = F.$('#envs', panel);
        c.innerHTML = F.ENVASES_CLIENTE.map(ml => `<button class="chip ${ml === st.ml ? 'on' : ''}" data-ml="${ml}">${ml}</button>`).join('');
        F.$$('button', c).forEach(b => b.onclick = () => { st.ml = +b.dataset.ml; F.$('#ml', panel).value = ''; st.deSob = null; st.base = 0; st.precio = null; dib.envs(); dib.al(); dib.sum(); });
      },
      sum() {
        const c = F.$('#sum', panel), a = F.aroma(st.id);
        if (!a || !st.ml) { c.innerHTML = `<p class="small muted" style="margin-top:12px">Elige aroma y mililitros.</p>`; return; }
        const calc = F.calcRelleno(st.ml, a.categoria);
        const disp = Math.max(0, a.sobranteMl || 0);
        const maxSob = Math.min(disp, st.ml);
        const deSob = Math.min(maxSob, Math.max(0, st.deSob ?? maxSob));
        const deStock = F.r2(st.ml - deSob);
        const bases = F.TAMANOS_NUEVO.filter(b => b > deStock && deStock > 0);
        if (!bases.includes(st.base)) st.base = 0;
        const consumo = st.base || deStock;
        const sobGen = st.base ? F.r2(st.base - deStock) : 0;
        const precio = st.precio ?? calc.precio;
        c.innerHTML = `<div class="summary">
          <div class="line"><span>${F.esc(a.nombre)}</span><span>${F.ml(st.ml)}</span></div>
          <div class="line muted"><span>Categoría</span><span>${F.cat(a.categoria).nombre} · ${F.money(F.cat(a.categoria).precioMl)}/ml</span></div>
          <div class="line muted"><span>Costo</span><span>${F.money(calc.costo)}</span></div>
          <div class="line"><span>Precio de lista</span><span>${F.money(calc.precio)}</span></div>
          ${disp > 0 ? `<div class="sob-box"><h4>Usar sobrante de este aroma (hay ${F.ml(disp)})</h4>
            <div class="row"><input id="ds" class="input num grow" type="number" inputmode="decimal" min="0" max="${maxSob}" step="1" value="${deSob}"><span>ml</span>
            <button class="btn sm" id="dsmax">Todo</button><button class="btn sm" id="ds0">Nada</button></div></div>` : ''}
          <label class="f">¿Preparaste una base más grande? (lo que sobre se guarda en sobrantes)</label>
          <select id="base" class="input"><option value="0">No, cantidad exacta (${F.ml(deStock)})</option>
            ${bases.map(b => `<option value="${b}" ${b === st.base ? 'selected' : ''}>Base de ${b} ml → sobran ${F.ml(b - deStock)}</option>`).join('')}</select>
          <div class="line" style="margin-top:10px"><span>Se toma de sobrantes</span><b>${F.ml(deSob)}</b></div>
          <div class="line"><span>Se descuenta del stock</span><b>${F.ml(consumo)}</b></div>
          ${sobGen ? `<div class="line warn"><span>Nuevo sobrante guardado</span><b>+${F.ml(sobGen)}</b></div>` : ''}
          ${a.stockMl < consumo ? `<div class="alert warn" style="margin-top:8px"><span class="dot"></span><div>Solo hay ${F.ml(a.stockMl)} en stock.</div></div>` : ''}
          <label class="f">Precio a cobrar</label>
          <input id="pr" class="input num" type="number" inputmode="decimal" step="0.5" value="${precio}">
          <button id="add" class="btn primary block" style="margin-top:12px">Agregar a la venta</button></div>`;
        const ds = F.$('#ds', c);
        if (ds) {
          ds.onchange = e => { st.deSob = F.num(e.target.value, 0); dib.sum(); };
          F.$('#dsmax', c).onclick = () => { st.deSob = maxSob; dib.sum(); };
          F.$('#ds0', c).onclick = () => { st.deSob = 0; dib.sum(); };
        }
        F.$('#base', c).onchange = e => { st.base = +e.target.value; dib.sum(); };
        F.$('#pr', c).oninput = e => { st.precio = F.num(e.target.value, calc.precio); };
        F.$('#add', c).onclick = () => {
          F.carrito.push({ tipo: 'relleno', aromaId: a.id, nombre: a.nombre, categoria: a.categoria, ml: st.ml,
            deSobrante: deSob, consumoStock: consumo, base: st.base, sobranteGenerado: sobGen,
            precio: F.num(F.$('#pr', c).value, calc.precio), costo: calc.costo });
          F.toast('Agregado: relleno ' + a.nombre + ' ' + st.ml + ' ml'); listo();
        };
      }
    };
    const todo = () => { dib.sobs(); dib.al(); dib.envs(); dib.sum(); };
    F.$('#q', panel).oninput = e => { st.q = e.target.value; dib.al(); };
    F.$('#ml', panel).oninput = e => {
      const v = F.num(e.target.value, 0);
      st.ml = v > 0 ? Math.min(250, v) : null; st.deSob = null; st.base = 0; st.precio = null;
      dib.envs(); dib.al(); dib.sum();
    };
    todo();
  }

  /* ---------- PRODUCTO TERMINADO ---------- */
  function formProducto(panel, listo) {
    const st = { id: null, cant: 1, precio: null };
    panel.innerHTML = `<div class="panel-h"><h3>Producto terminado</h3><button class="x" data-cerrar>×</button></div>
      <div id="pl" class="pick-list"></div><div id="sum"></div>`;
    const dib = () => {
      const prods = F.db.productos.filter(p => p.activo !== false);
      F.$('#pl', panel).innerHTML = prods.length ? prods.map(p => `<button class="pick ${p.id === st.id ? 'on' : ''}" data-id="${p.id}">
          <div class="grow"><div class="t">${F.esc(p.nombre)}</div><div class="s">${F.esc(p.tipo)} · stock ${p.stock}</div></div><b>${F.money(p.precio)}</b></button>`).join('')
        : '<div class="empty">No hay productos. Agrégalos en Inventario → Productos.</div>';
      F.$$('#pl .pick', panel).forEach(b => b.onclick = () => { st.id = b.dataset.id; st.precio = null; dib(); });
      const p = F.producto(st.id), c = F.$('#sum', panel);
      if (!p) { c.innerHTML = ''; return; }
      const precio = st.precio ?? p.precio * st.cant;
      c.innerHTML = `<div class="summary">
        <div class="line"><span>${F.esc(p.nombre)}</span><span>${F.money(p.precio)} c/u</span></div>
        <label class="f">Cantidad</label>
        <div class="row"><button class="btn" id="m">−</button><input id="cant" class="input num grow" style="text-align:center" type="number" min="1" value="${st.cant}"><button class="btn" id="p">+</button></div>
        ${p.stock < st.cant ? `<div class="alert warn" style="margin-top:8px"><span class="dot"></span><div>Solo hay ${p.stock} en stock.</div></div>` : ''}
        <label class="f">Total a cobrar</label>
        <input id="pr" class="input num" type="number" inputmode="decimal" value="${precio}">
        <button id="add" class="btn primary block" style="margin-top:12px">Agregar a la venta</button></div>`;
      const setC = n => { st.cant = Math.max(1, n); st.precio = null; dib(); };
      F.$('#m', c).onclick = () => setC(st.cant - 1);
      F.$('#p', c).onclick = () => setC(st.cant + 1);
      F.$('#cant', c).onchange = e => setC(Math.round(F.num(e.target.value, 1)));
      F.$('#pr', c).oninput = e => { st.precio = F.num(e.target.value, p.precio * st.cant); };
      F.$('#add', c).onclick = () => {
        F.carrito.push({ tipo: 'producto', productoId: p.id, nombre: p.nombre, cant: st.cant, precio: F.num(F.$('#pr', c).value, p.precio * st.cant), costo: F.r2(p.costo * st.cant) });
        F.toast('Agregado: ' + p.nombre); listo();
      };
    };
    dib();
  }

  const FORMS = { nuevo: formNuevo, relleno: formRelleno, producto: formProducto };

  function detalle(it) {
    if (it.tipo === 'nuevo') return `Nuevo ${it.ml} ml · ${F.GENEROS[it.genero]}`;
    if (it.tipo === 'relleno') return `Relleno ${F.ml(it.ml)}${it.deSobrante ? ` (${F.ml(it.deSobrante)} de sobrante)` : ''}`;
    return `${it.cant} pza${it.cant > 1 ? 's' : ''}`;
  }
  F.detalleItem = detalle;

  /* ---------- Cobrar ---------- */
  async function cobrar(cliente) {
    if (!F.carrito.length) return;
    // Simula para avisar si algo queda en negativo
    const copia = JSON.parse(JSON.stringify(F.db));
    F.aplicarItems(copia, F.carrito, -1);
    const av = [];
    new Set(F.carrito.map(i => i.aromaId).filter(Boolean)).forEach(id => {
      const a = copia.aromas.find(x => x.id === id);
      if (a && a.stockMl < 0) av.push(`${a.nombre}: faltan ${F.ml(-a.stockMl)} en stock`);
      if (a && a.sobranteMl < 0) av.push(`${a.nombre}: no alcanza el sobrante`);
    });
    for (const k in copia.envases) if (copia.envases[k] < 0) av.push(`Envases ${k.replace('-', ' ml ')}: no hay suficientes`);
    copia.productos.forEach(p => { if (p.stock < 0) av.push(`${p.nombre}: no hay suficientes`); });
    if (av.length && !(await F.confirmar(`El inventario quedará en negativo:<br>• ${av.map(F.esc).join('<br>• ')}<br><br>¿Registrar la venta de todos modos?`, { si: 'Registrar' }))) return;

    const venta = {
      id: F.uid(), fecha: new Date().toISOString(), items: F.carrito.slice(),
      total: F.r2(F.carrito.reduce((s, i) => s + i.precio, 0)), costo: F.r2(F.carrito.reduce((s, i) => s + i.costo, 0)),
      pago, cliente: cliente || ''
    };
    F.aplicarItems(F.db, venta.items, -1);
    F.db.ventas.push(venta);
    F.guardar();
    F.carrito = [];
    F.toast('Venta registrada: ' + F.money(venta.total));
    F.ir('vender');
  }

  F.vista('vender', {
    titulo: 'Vender',
    render(el, arg) {
      el.innerHTML = `
        <div class="tiles3">
          <button class="tile" data-f="nuevo">${F.IC.vender}Perfume nuevo</button>
          <button class="tile" data-f="relleno"><svg viewBox="0 0 24 24"><path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/></svg>Relleno</button>
          <button class="tile" data-f="producto">${F.IC.inventario}Producto</button>
        </div>
        <section id="panel" class="card hidden"></section>
        <section id="ticket"></section>
        <div class="sec-title">Ventas de hoy</div>
        <section id="hoy" class="card"></section>`;
      const panel = F.$('#panel', el);
      const cerrar = () => { panel.classList.add('hidden'); panel.innerHTML = ''; F.$$('.tile', el).forEach(b => b.classList.remove('on')); };
      const abrir = f => {
        if (!FORMS[f]) return;
        F.$$('.tile', el).forEach(b => b.classList.toggle('on', b.dataset.f === f));
        panel.classList.remove('hidden');
        FORMS[f](panel, () => { cerrar(); ticket(); F.$('#ticket', el).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        F.$('[data-cerrar]', panel).onclick = cerrar;
      };
      F.$$('.tile', el).forEach(b => b.onclick = () => abrir(b.dataset.f));

      const ticket = () => {
        const c = F.$('#ticket', el);
        if (!F.carrito.length) { c.innerHTML = ''; return; }
        const total = F.carrito.reduce((s, i) => s + i.precio, 0);
        c.innerHTML = `<div class="card ticket"><h3>Venta actual</h3>
          ${F.carrito.map((it, i) => `<div class="item"><div class="grow"><div class="t">${F.esc(it.nombre)}</div><div class="s">${detalle(it)}</div></div>
            <b class="num">${F.money(it.precio)}</b><button class="x" data-del="${i}">×</button></div>`).join('')}
          <div class="row between" style="margin:12px 0"><span>Total</span><span class="total num">${F.money(total)}</span></div>
          <div class="seg" id="pago">${['efectivo', 'transferencia', 'tarjeta'].map(p => `<button data-p="${p}" class="${p === pago ? 'on' : ''}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>
          <input id="cli" class="input" style="margin-top:10px" placeholder="Cliente (opcional)">
          <button id="cobrar" class="btn gold block" style="margin-top:12px;font-size:17px">Cobrar ${F.money(total)}</button></div>`;
        F.$$('[data-del]', c).forEach(b => b.onclick = () => { F.carrito.splice(+b.dataset.del, 1); ticket(); });
        F.$$('#pago button', c).forEach(b => b.onclick = () => { pago = b.dataset.p; ticket(); });
        F.$('#cobrar', c).onclick = () => cobrar(F.$('#cli', c).value.trim());
      };

      const hoy = () => {
        const p = F.periodo('dia', new Date());
        const vs = F.ventasEntre(p.from, p.to).slice().reverse();
        const c = F.$('#hoy', el);
        c.innerHTML = vs.length ? vs.map(v => `<div class="item"><div class="grow"><div class="t">${v.items.map(i => F.esc(i.nombre)).join(', ')}</div>
            <div class="s">${F.hora(v.fecha)} · ${v.items.map(detalle).join(' / ')} · ${v.pago}${v.cliente ? ' · ' + F.esc(v.cliente) : ''}</div></div>
            <b class="num">${F.money(v.total)}</b><button class="x" title="Cancelar venta" data-v="${v.id}">×</button></div>`).join('')
          : '<div class="empty">Todavía no hay ventas hoy.</div>';
        F.$$('[data-v]', c).forEach(b => b.onclick = async () => {
          if (await F.confirmar('¿Cancelar esta venta? El inventario y los sobrantes se regresan.', { si: 'Cancelar venta', peligro: true })) {
            F.eliminarVenta(b.dataset.v); F.toast('Venta cancelada'); hoy();
          }
        });
      };
      ticket(); hoy();
      if (arg) abrir(arg);
    }
  });
})(window.F);
