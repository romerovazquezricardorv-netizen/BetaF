/* ===== Pedidos al proveedor: al recibirlos se suma al inventario ===== */
'use strict';
(function (F) {
  F.textoLineaPedido = it => {
    if (it.tipo === 'aroma') { const a = F.aroma(it.aromaId); return `${a ? a.nombre : it.nombre || 'Aroma'} ${F.ml(it.ml)}`; }
    if (it.tipo === 'envase') return `${it.cant} envases ${it.ml} ml ${F.GENEROS[it.genero]}`;
    const p = F.producto(it.productoId); return `${it.cant} × ${p ? p.nombre : it.nombre || 'Producto'}`;
  };

  function editarPedido(id, lineasIniciales) {
    const ped = id ? JSON.parse(JSON.stringify(F.db.pedidos.find(p => p.id === id)))
      : { proveedor: '', fecha: new Date().toISOString(), nota: '', items: lineasIniciales || [], estado: 'pendiente' };
    const m = F.modal({
      titulo: id ? 'Editar pedido' : 'Nuevo pedido',
      cuerpo: `<div class="grid2"><div><label class="f">Proveedor</label><input id="pv" class="input" value="${F.esc(ped.proveedor)}" placeholder="Ej. FRAICHE"></div>
        <div><label class="f">Fecha</label><input id="fe" class="input" type="date" value="${F.inputFecha(ped.fecha)}"></div></div>
        <div class="lbl">Contenido del pedido</div><div id="lineas"></div>
        <div class="row wrap" style="margin-top:8px"><button class="btn sm" data-add="aroma">+ Perfume (ml)</button><button class="btn sm" data-add="envase">+ Envases</button><button class="btn sm" data-add="producto">+ Producto</button></div>
        <label class="f">Nota</label><input id="no" class="input" value="${F.esc(ped.nota)}">
        <div class="summary"><div class="line big"><span>Total</span><span id="tot"></span></div></div>`,
      botones: `<button class="btn" id="cn">Cancelar</button><button class="btn primary" id="ok">Guardar pedido</button>`
    });
    const L = F.$('#lineas', m);
    const totalPed = () => F.r2(ped.items.reduce((s, i) => s + F.num(i.costo), 0));
    const dib = () => {
      L.innerHTML = ped.items.length ? ped.items.map((it, i) => {
        let campos = '';
        if (it.tipo === 'aroma') campos = `<select class="input" data-i="${i}" data-f="aromaId">${F.db.aromas.map(a => `<option value="${a.id}" ${a.id === it.aromaId ? 'selected' : ''}>${F.esc(a.nombre)}</option>`).join('')}</select>
          <div class="grid2" style="margin-top:6px"><input class="input num" type="number" inputmode="decimal" placeholder="ml" data-i="${i}" data-f="ml" value="${it.ml || ''}"><input class="input num" type="number" inputmode="decimal" placeholder="Costo $" data-i="${i}" data-f="costo" value="${it.costo || ''}"></div>`;
        else if (it.tipo === 'envase') campos = `<div class="grid3"><select class="input" data-i="${i}" data-f="ml">${F.TAMANOS_NUEVO.map(t => `<option value="${t}" ${t === it.ml ? 'selected' : ''}>${t} ml</option>`).join('')}</select>
          <select class="input" data-i="${i}" data-f="genero">${['dama', 'caballero'].map(g => `<option value="${g}" ${g === it.genero ? 'selected' : ''}>${F.GENEROS[g]}</option>`).join('')}</select>
          <input class="input num" type="number" placeholder="Cant." data-i="${i}" data-f="cant" value="${it.cant || ''}"></div>
          <input class="input num" style="margin-top:6px" type="number" inputmode="decimal" placeholder="Costo $" data-i="${i}" data-f="costo" value="${it.costo || ''}">`;
        else campos = `<select class="input" data-i="${i}" data-f="productoId">${F.db.productos.map(p => `<option value="${p.id}" ${p.id === it.productoId ? 'selected' : ''}>${F.esc(p.nombre)}</option>`).join('')}</select>
          <div class="grid2" style="margin-top:6px"><input class="input num" type="number" placeholder="Cantidad" data-i="${i}" data-f="cant" value="${it.cant || ''}"><input class="input num" type="number" inputmode="decimal" placeholder="Costo $" data-i="${i}" data-f="costo" value="${it.costo || ''}"></div>`;
        return `<div class="card" style="padding:10px;margin-bottom:8px"><div class="row between small muted" style="margin-bottom:6px"><b>${it.tipo === 'aroma' ? 'Perfume' : it.tipo === 'envase' ? 'Envases' : 'Producto'}</b><button class="x" data-q="${i}">×</button></div>${campos}</div>`;
      }).join('') : '<p class="small muted">Agrega lo que pediste.</p>';
      F.$('#tot', m).textContent = F.money(totalPed());
      F.$$('[data-f]', L).forEach(inp => inp.onchange = () => {
        const it = ped.items[+inp.dataset.i], f = inp.dataset.f;
        it[f] = ['ml', 'cant', 'costo'].includes(f) ? F.num(inp.value) : inp.value;
        if (it.tipo === 'aroma' && (f === 'ml' || f === 'aromaId') && !it.costoManual) {
          const a = F.aroma(it.aromaId);
          if (a) { it.costo = F.r2(it.ml * F.costoMl(a.categoria)); const ci = F.$(`[data-i="${inp.dataset.i}"][data-f="costo"]`, L); if (ci) ci.value = it.costo; }
        }
        if (f === 'costo') it.costoManual = true;
        F.$('#tot', m).textContent = F.money(totalPed());
      });
      F.$$('[data-q]', L).forEach(b => b.onclick = () => { ped.items.splice(+b.dataset.q, 1); dib(); });
    };
    F.$$('[data-add]', m).forEach(b => b.onclick = () => {
      const t = b.dataset.add;
      if (t === 'aroma') { if (!F.db.aromas.length) return F.toast('Primero agrega aromas', 'bad'); ped.items.push({ tipo: 'aroma', aromaId: F.db.aromas[0].id, ml: 0, costo: 0 }); }
      if (t === 'envase') ped.items.push({ tipo: 'envase', ml: 30, genero: 'dama', cant: 0, costo: 0 });
      if (t === 'producto') { if (!F.db.productos.length) return F.toast('Primero agrega productos', 'bad'); ped.items.push({ tipo: 'producto', productoId: F.db.productos[0].id, cant: 0, costo: 0 }); }
      dib();
    });
    F.$('#cn', m).onclick = () => m.close();
    F.$('#ok', m).onclick = () => {
      ped.items = ped.items.filter(i => (i.tipo === 'aroma' ? i.ml : i.cant) > 0);
      if (!ped.items.length) return F.toast('El pedido está vacío', 'bad');
      ped.proveedor = F.$('#pv', m).value.trim();
      ped.nota = F.$('#no', m).value.trim();
      const f = F.$('#fe', m).value; if (f) ped.fecha = new Date(f + 'T12:00:00').toISOString();
      ped.items.forEach(i => { if (i.tipo === 'aroma') { const a = F.aroma(i.aromaId); i.nombre = a && a.nombre; } if (i.tipo === 'producto') { const p = F.producto(i.productoId); i.nombre = p && p.nombre; } });
      ped.total = totalPed();
      if (id) { const k = F.db.pedidos.findIndex(p => p.id === id); F.db.pedidos[k] = ped; }
      else { ped.id = F.uid(); F.db.pedidos.push(ped); }
      F.guardar(); m.close(); F.toast('Pedido guardado'); F.ir('pedidos');
    };
    dib();
  }

  // Arma un pedido con lo que está bajo de stock
  function sugerir() {
    const al = F.alertas(), lineas = [];
    al.stockBajo.forEach(a => { const ml = 500; lineas.push({ tipo: 'aroma', aromaId: a.id, ml, costo: F.r2(ml * F.costoMl(a.categoria)) }); });
    al.envBajos.forEach(e => lineas.push({ tipo: 'envase', ml: e.ml, genero: e.g, cant: 10, costo: 0 }));
    F.db.productos.filter(p => p.activo !== false && p.stock < 2).forEach(p => lineas.push({ tipo: 'producto', productoId: p.id, cant: 5, costo: F.r2(p.costo * 5) }));
    if (!lineas.length) { F.toast('Todo tiene stock suficiente'); return; }
    editarPedido(null, lineas);
  }

  F.vista('pedidos', {
    titulo: 'Pedidos',
    render(el, arg) {
      const pend = F.db.pedidos.filter(p => p.estado === 'pendiente').sort((a, b) => b.fecha.localeCompare(a.fecha));
      const rec = F.db.pedidos.filter(p => p.estado === 'recibido').sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
      const card = p => `<div class="card"><div class="row between"><div><b>${F.esc(p.proveedor || 'Pedido')}</b> <span class="badge">${F.fecha(p.fecha)}</span></div><b class="num">${F.money(p.total)}</b></div>
        <div class="small muted" style="margin:8px 0">${p.items.map(i => F.esc(F.textoLineaPedido(i))).join('<br>')}</div>
        ${p.nota ? `<div class="small">${F.esc(p.nota)}</div>` : ''}
        <div class="row wrap" style="margin-top:8px">
        ${p.estado === 'pendiente' ? `<button class="btn sm gold" data-rec="${p.id}">Marcar recibido</button><button class="btn sm" data-ed="${p.id}">Editar</button>` : `<span class="small ok">Recibido ${F.fecha(p.recibido)}</span>`}
        <span class="grow"></span><button class="btn sm danger" data-del="${p.id}">Eliminar</button></div></div>`;
      el.innerHTML = `<div class="grid2" style="margin-bottom:12px"><button class="btn primary" id="nuevo">+ Nuevo pedido</button><button class="btn" id="sug">Sugerir (stock bajo)</button></div>
        <div class="sec-title">Pendientes por recibir</div>${pend.length ? pend.map(card).join('') : '<div class="card empty">No hay pedidos pendientes.</div>'}
        <div class="sec-title">Recibidos</div>${rec.length ? rec.map(card).join('') : '<div class="card empty">Aún no hay pedidos recibidos.</div>'}`;
      F.$('#nuevo', el).onclick = () => editarPedido(null);
      F.$('#sug', el).onclick = sugerir;
      F.$$('[data-ed]', el).forEach(b => b.onclick = () => editarPedido(b.dataset.ed));
      F.$$('[data-rec]', el).forEach(b => b.onclick = async () => {
        if (!(await F.confirmar('¿Ya llegó el pedido? Se sumará al inventario.', { si: 'Sí, recibido' }))) return;
        const p = F.db.pedidos.find(x => x.id === b.dataset.rec);
        F.aplicarPedido(F.db, p, +1); p.estado = 'recibido'; p.recibido = new Date().toISOString();
        F.guardar(); F.toast('Inventario actualizado'); F.refrescar();
      });
      F.$$('[data-del]', el).forEach(b => b.onclick = async () => {
        const p = F.db.pedidos.find(x => x.id === b.dataset.del);
        const msg = p.estado === 'recibido' ? '¿Eliminar este pedido? Lo que sumó al inventario se va a restar.' : '¿Eliminar este pedido?';
        if (!(await F.confirmar(msg, { si: 'Eliminar', peligro: true }))) return;
        if (p.estado === 'recibido') F.aplicarPedido(F.db, p, -1);
        F.db.pedidos = F.db.pedidos.filter(x => x.id !== p.id); F.guardar(); F.refrescar();
      });
      if (arg === 'sugerir') { history.replaceState(null, '', '#pedidos'); sugerir(); }
    }
  });
})(window.F);
