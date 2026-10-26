/* ===== Inventario: aromas, envases nuevos, sobrantes y productos ===== */
'use strict';
(function (F) {
  let tab = 'aromas', filtroCat = 'todas', verInactivos = false, q = '';

  const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v}</option>`).join('');
  const catsObj = () => Object.fromEntries(F.CATS.map(k => [k, F.cat(k).nombre]));

  /* ---- Alta / edición de aroma ---- */
  F.editarAroma = (id, alGuardar) => {
    const a = id ? F.aroma(id) : { nombre: '', inspiracion: '', genero: 'dama', categoria: 'estandar', stockMl: 0, sobranteMl: 0, activo: true };
    const m = F.modal({
      titulo: id ? 'Editar aroma' : 'Nuevo aroma',
      cuerpo: `<label class="f">Nombre del aroma</label><input id="n" class="input" value="${F.esc(a.nombre)}" placeholder="Ej. el nombre FRAICHE">
        <label class="f">Inspiración / familia olfativa</label><input id="i" class="input" value="${F.esc(a.inspiracion)}" placeholder="Opcional">
        <div class="grid2"><div><label class="f">Género</label><select id="g" class="input">${opts(F.GENEROS, a.genero)}</select></div>
        <div><label class="f">Categoría</label><select id="c" class="input">${opts(catsObj(), a.categoria)}</select></div></div>
        <div class="grid2"><div><label class="f">Stock (ml)</label><input id="s" class="input num" type="number" inputmode="decimal" value="${a.stockMl}"></div>
        <div><label class="f">Sobrante (ml)</label><input id="so" class="input num" type="number" inputmode="decimal" value="${a.sobranteMl || 0}"></div></div>
        <label class="check"><input id="ac" type="checkbox" ${a.activo !== false ? 'checked' : ''}> Disponible para venta (desmarca si es de temporada y ya no está)</label>`,
      botones: `${id ? '<button class="btn danger" id="del">Eliminar</button><span class="grow"></span>' : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn primary" id="ok">Guardar</button>`
    });
    F.$('[data-cerrar]', F.$('.m-f', m)).onclick = () => m.close();
    F.$('#ok', m).onclick = () => {
      const nombre = F.$('#n', m).value.trim();
      if (!nombre) return F.toast('Escribe el nombre', 'bad');
      Object.assign(a, { nombre, inspiracion: F.$('#i', m).value.trim(), genero: F.$('#g', m).value, categoria: F.$('#c', m).value,
        stockMl: F.num(F.$('#s', m).value, 0), sobranteMl: Math.max(0, F.num(F.$('#so', m).value, 0)), activo: F.$('#ac', m).checked });
      if (!id) { a.id = F.uid(); a.creado = new Date().toISOString(); F.db.aromas.push(a); }
      F.guardar(); m.close(); F.toast('Aroma guardado'); alGuardar && alGuardar();
    };
    const del = F.$('#del', m);
    if (del) del.onclick = async () => {
      m.close();
      if (await F.confirmar(`¿Eliminar <b>${F.esc(a.nombre)}</b>? Las ventas pasadas se conservan. Si solo es de temporada, mejor desmárcalo como disponible.`, { si: 'Eliminar', peligro: true })) {
        F.db.aromas = F.db.aromas.filter(x => x.id !== a.id); F.guardar(); F.toast('Aroma eliminado'); alGuardar && alGuardar();
      }
    };
  };

  F.editarProducto = (id, alGuardar) => {
    const p = id ? F.producto(id) : { nombre: '', tipo: 'Body', costo: 0, precio: 0, stock: 0, activo: true };
    const m = F.modal({
      titulo: id ? 'Editar producto' : 'Nuevo producto',
      cuerpo: `<label class="f">Nombre</label><input id="n" class="input" value="${F.esc(p.nombre)}">
        <label class="f">Tipo</label><select id="t" class="input">${opts(Object.fromEntries(F.TIPOS_PRODUCTO.map(t => [t, t])), p.tipo)}</select>
        <div class="grid3"><div><label class="f">Costo</label><input id="c" class="input num" type="number" inputmode="decimal" value="${p.costo}"></div>
        <div><label class="f">Precio</label><input id="pr" class="input num" type="number" inputmode="decimal" value="${p.precio}"></div>
        <div><label class="f">Stock</label><input id="s" class="input num" type="number" value="${p.stock}"></div></div>
        <label class="check"><input id="ac" type="checkbox" ${p.activo !== false ? 'checked' : ''}> Disponible para venta</label>`,
      botones: `${id ? '<button class="btn danger" id="del">Eliminar</button><span class="grow"></span>' : ''}<button class="btn" id="cn">Cancelar</button><button class="btn primary" id="ok">Guardar</button>`
    });
    F.$('#cn', m).onclick = () => m.close();
    F.$('#ok', m).onclick = () => {
      const nombre = F.$('#n', m).value.trim(); if (!nombre) return F.toast('Escribe el nombre', 'bad');
      Object.assign(p, { nombre, tipo: F.$('#t', m).value, costo: F.num(F.$('#c', m).value), precio: F.num(F.$('#pr', m).value), stock: Math.round(F.num(F.$('#s', m).value)), activo: F.$('#ac', m).checked });
      if (!id) { p.id = F.uid(); F.db.productos.push(p); }
      F.guardar(); m.close(); F.toast('Producto guardado'); alGuardar && alGuardar();
    };
    const del = F.$('#del', m);
    if (del) del.onclick = async () => { m.close(); if (await F.confirmar(`¿Eliminar ${F.esc(p.nombre)}?`, { si: 'Eliminar', peligro: true })) { F.db.productos = F.db.productos.filter(x => x.id !== p.id); F.guardar(); alGuardar && alGuardar(); } };
  };

  F.vista('inventario', {
    titulo: 'Inventario',
    render(el) {
      el.innerHTML = `<div class="seg" id="tabs">${[['aromas', 'Aromas'], ['envases', 'Envases'], ['sobrantes', 'Sobrantes'], ['productos', 'Productos']]
        .map(([k, t]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('')}</div><div id="cont" style="margin-top:12px"></div>`;
      F.$$('#tabs button', el).forEach(b => b.onclick = () => { tab = b.dataset.t; F.refrescar(); });
      const c = F.$('#cont', el);
      ({ aromas, envases, sobrantes, productos })[tab](c);
    }
  });

  function aromas(c) {
    c.innerHTML = `<div class="row" style="margin-bottom:10px"><input id="q" class="input grow" type="search" placeholder="Buscar…" value="${F.esc(q)}"><button class="btn primary" id="nuevo">+ Aroma</button></div>
      <div class="chips" id="fc" style="margin-bottom:8px">${['todas', ...F.CATS].map(k => `<button class="chip ${k === filtroCat ? 'on' : ''}" data-k="${k}">${k === 'todas' ? 'Todas' : F.cat(k).nombre}</button>`).join('')}
      <button class="chip ${verInactivos ? 'on' : ''}" id="inact">Ver no disponibles</button></div>
      <div id="tot" class="small muted" style="margin:0 2px 8px"></div>
      <div class="card" id="lista" style="padding:4px 14px"></div>`;
    const dib = () => {
      const nq = F.norm(q);
      const lista = F.db.aromas.filter(a => (verInactivos || a.activo !== false) && (filtroCat === 'todas' || a.categoria === filtroCat) && (!nq || F.norm(a.nombre + ' ' + a.inspiracion).includes(nq)))
        .sort((x, y) => x.nombre.localeCompare(y.nombre));
      const min = F.db.config.alertas.stockMinMl;
      F.$('#tot', c).textContent = `${lista.length} aromas · ${F.ml(lista.reduce((s, a) => s + a.stockMl, 0))} en stock · ${F.ml(lista.reduce((s, a) => s + (a.sobranteMl || 0), 0))} en sobrantes`;
      F.$('#lista', c).innerHTML = lista.length ? lista.map(a => `<div class="item" data-id="${a.id}" style="cursor:pointer">
          <div class="grow"><div class="t">${F.esc(a.nombre)} ${a.activo === false ? '<span class="badge off">no disponible</span>' : ''}</div>
          <div class="s">${a.inspiracion ? F.esc(a.inspiracion) + ' · ' : ''}<span class="badge ${a.genero}">${F.GENEROS[a.genero]}</span> <span class="badge ${a.categoria}">${F.cat(a.categoria).nombre}</span></div></div>
          <div class="right"><b class="num ${a.stockMl < min ? 'warn' : ''}">${F.ml(a.stockMl)}</b>${a.sobranteMl > 0 ? `<div class="small warn">+${F.ml(a.sobranteMl)} sobr.</div>` : ''}</div></div>`).join('')
        : '<div class="empty">No hay aromas. Toca “+ Aroma” para agregar.</div>';
      F.$$('#lista .item', c).forEach(i => i.onclick = () => F.editarAroma(i.dataset.id, dib));
    };
    F.$('#q', c).oninput = e => { q = e.target.value; dib(); };
    F.$('#nuevo', c).onclick = () => F.editarAroma(null, dib);
    F.$$('#fc [data-k]', c).forEach(b => b.onclick = () => { filtroCat = b.dataset.k; F.refrescar(); });
    F.$('#inact', c).onclick = () => { verInactivos = !verInactivos; F.refrescar(); };
    dib();
  }

  function envases(c) {
    c.innerHTML = `<p class="small muted" style="margin:0 2px 10px">Envases vacíos para perfume nuevo. Se descuentan solos al vender y se suman al recibir un pedido.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tamaño</th><th>Dama</th><th>Caballero</th></tr></thead><tbody>
      ${F.TAMANOS_NUEVO.map(ml => `<tr><td><b>${ml} ml</b></td>${['dama', 'caballero'].map(g => `<td><input class="input num" type="number" data-k="${F.envKey(ml, g)}" value="${F.envStock(ml, g)}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div>`;
    F.$$('input[data-k]', c).forEach(i => i.onchange = () => { F.db.envases[i.dataset.k] = Math.round(F.num(i.value)); F.guardar(); F.toast('Envases actualizados'); });
  }

  function sobrantes(c) {
    const lista = F.db.aromas.filter(a => (a.sobranteMl || 0) > 0);
    c.innerHTML = `<p class="small muted" style="margin:0 2px 10px">Lo que sobra al preparar una base más grande que el envase del cliente. Al cobrar un relleno puedes tomar de aquí.</p>
      <div class="card" style="padding:4px 14px">${lista.length ? lista.map(a => `<div class="item"><div class="grow"><div class="t">${F.esc(a.nombre)}</div><div class="s">${F.cat(a.categoria).nombre}</div></div>
        <input class="input num" style="width:90px" type="number" inputmode="decimal" data-id="${a.id}" value="${a.sobranteMl}"><span class="small">ml</span>
        <button class="btn sm danger" data-x="${a.id}">Descartar</button></div>`).join('') : '<div class="empty">No hay sobrantes.</div>'}</div>
      <button class="btn block" id="add">+ Registrar sobrante</button>`;
    F.$$('input[data-id]', c).forEach(i => i.onchange = () => { F.aroma(i.dataset.id).sobranteMl = Math.max(0, F.num(i.value)); F.guardar(); F.toast('Sobrante actualizado'); });
    F.$$('[data-x]', c).forEach(b => b.onclick = async () => { if (await F.confirmar('¿Descartar este sobrante?', { si: 'Descartar', peligro: true })) { F.aroma(b.dataset.x).sobranteMl = 0; F.guardar(); F.refrescar(); } });
    F.$('#add', c).onclick = () => {
      const m = F.modal({
        titulo: 'Registrar sobrante',
        cuerpo: `<label class="f">Aroma</label><select id="a" class="input">${F.db.aromas.map(a => `<option value="${a.id}">${F.esc(a.nombre)}</option>`).join('')}</select>
          <label class="f">Mililitros</label><input id="ml" class="input num" type="number" inputmode="decimal">
          <label class="check"><input id="desc" type="checkbox" checked> Descontar estos ml del stock</label>`,
        botones: `<button class="btn" id="cn">Cancelar</button><button class="btn primary" id="ok">Guardar</button>`
      });
      F.$('#cn', m).onclick = () => m.close();
      F.$('#ok', m).onclick = () => {
        const a = F.aroma(F.$('#a', m).value), ml = F.num(F.$('#ml', m).value);
        if (!a || ml <= 0) return F.toast('Elige aroma y ml', 'bad');
        a.sobranteMl = F.r2((a.sobranteMl || 0) + ml); if (F.$('#desc', m).checked) a.stockMl = F.r2(a.stockMl - ml);
        F.guardar(); m.close(); F.refrescar();
      };
    };
  }

  function productos(c) {
    c.innerHTML = `<div class="row between" style="margin-bottom:10px"><span class="small muted">Bodys, veladoras, aromatizantes y más.</span><button class="btn primary" id="nuevo">+ Producto</button></div>
      <div class="card" style="padding:4px 14px">${F.db.productos.length ? F.db.productos.map(p => `<div class="item" data-id="${p.id}" style="cursor:pointer">
        <div class="grow"><div class="t">${F.esc(p.nombre)} ${p.activo === false ? '<span class="badge off">no disponible</span>' : ''}</div><div class="s">${F.esc(p.tipo)} · costo ${F.money(p.costo)} · precio ${F.money(p.precio)}</div></div>
        <b class="num ${p.stock < 2 ? 'warn' : ''}">${p.stock} pzas</b></div>`).join('') : '<div class="empty">Sin productos.</div>'}</div>`;
    F.$('#nuevo', c).onclick = () => F.editarProducto(null, F.refrescar);
    F.$$('.item[data-id]', c).forEach(i => i.onclick = () => F.editarProducto(i.dataset.id, F.refrescar));
  }
})(window.F);
