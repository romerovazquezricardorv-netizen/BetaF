/* ===== Inicio: resumen del día y alertas ===== */
'use strict';
(function (F) {
  F.resumen = ventas => {
    const r = { total: 0, costo: 0, n: ventas.length, ml: 0, tipos: {}, cats: {}, pagos: {}, aromas: {} };
    for (const v of ventas) {
      r.total += v.total; r.costo += v.costo;
      r.pagos[v.pago] = (r.pagos[v.pago] || 0) + v.total;
      for (const it of v.items) {
        const t = r.tipos[it.tipo] || (r.tipos[it.tipo] = { n: 0, total: 0 });
        t.n += it.cant || 1; t.total += it.precio;
        if (it.ml && it.tipo !== 'producto') r.ml += it.ml;
        if (it.categoria) r.cats[it.categoria] = (r.cats[it.categoria] || 0) + it.precio;
        if (it.aromaId || it.productoId) {
          const k = it.aromaId || it.productoId;
          const a = r.aromas[k] || (r.aromas[k] = { nombre: it.nombre, n: 0, ml: 0, total: 0 });
          a.n += it.cant || 1; a.ml += it.tipo === 'producto' ? 0 : (it.ml || 0); a.total += it.precio;
        }
      }
    }
    r.ganancia = r.total - r.costo;
    return r;
  };

  F.vista('inicio', {
    titulo: 'Inicio',
    render(el) {
      const hoy = F.periodo('dia', new Date()), sem = F.periodo('semana', new Date()), mes = F.periodo('mes', new Date());
      const rh = F.resumen(F.ventasEntre(hoy.from, hoy.to));
      const rs = F.resumen(F.ventasEntre(sem.from, sem.to));
      const rm = F.resumen(F.ventasEntre(mes.from, mes.to));
      const al = F.alertas();
      const ult = F.db.config.ultimoRespaldo;
      const sinRespaldo = F.db.ventas.length && (!ult || (Date.now() - new Date(ult)) > 7 * 864e5);
      const vacio = !F.db.aromas.length;

      el.innerHTML = `
        <div class="hero"><h2>${saludo()}</h2><div class="muted">${hoy.label}</div></div>
        ${sinRespaldo ? `<div class="banner"><div class="grow">Llevas más de una semana sin respaldo. Descarga tu Excel por si se borra el teléfono.</div><button class="btn sm" id="resp">Respaldar</button></div>` : ''}
        ${vacio ? `<div class="card"><h3>Bienvenido a la beta</h3><p class="muted">Empieza agregando tus aromas en <b>Inventario</b>, o carga datos de ejemplo para probar.</p>
          <div class="row wrap"><a class="btn primary" href="#inventario">Agregar aromas</a><button class="btn" id="ej">Cargar ejemplos</button></div></div>` : ''}
        <div class="kpis">
          <div class="kpi dark"><div class="k">Vendido hoy</div><div class="v">${F.money(rh.total)}</div></div>
          <div class="kpi"><div class="k">Ganancia hoy</div><div class="v">${F.money(rh.ganancia)}</div></div>
          <div class="kpi"><div class="k">Esta semana</div><div class="v">${F.money(rs.total)}</div></div>
          <div class="kpi"><div class="k">Este mes</div><div class="v">${F.money(rm.total)}</div></div>
        </div>
        <div class="tiles3">
          <a class="tile" href="#vender/nuevo" style="text-decoration:none;color:inherit">${F.IC.vender}Perfume nuevo</a>
          <a class="tile" href="#vender/relleno" style="text-decoration:none;color:inherit"><svg viewBox="0 0 24 24"><path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/></svg>Relleno</a>
          <a class="tile" href="#vender/producto" style="text-decoration:none;color:inherit">${F.IC.inventario}Producto</a>
        </div>

        <div class="sec-title">Alertas de los últimos ${al.dias} días</div>
        <div class="card">
          <h3>Se venden poco</h3>
          ${al.pocos.length ? al.pocos.slice(0, 8).map(x => `<div class="alert ${x.n === 0 ? 'bad' : 'warn'}"><span class="dot"></span><div class="grow">
              <b>${F.esc(x.a.nombre)}</b> <span class="badge ${x.a.categoria}">${F.cat(x.a.categoria).nombre}</span><br>
              <span class="small muted">${x.n === 0 ? 'Sin ventas' : `Solo ${x.n} venta${x.n > 1 ? 's' : ''} (${F.ml(x.ml)})`} · stock ${F.ml(x.a.stockMl)}</span></div></div>`).join('')
              + (al.pocos.length > 8 ? `<p class="small muted">y ${al.pocos.length - 8} más…</p>` : '')
            : `<div class="alert ok"><span class="dot"></span><div>Todos tus aromas activos tienen buen movimiento.</div></div>`}
        </div>
        <div class="card">
          <h3>Los más vendidos</h3>
          ${al.top.length ? al.top.map((x, i) => `<div class="item"><b class="muted">${i + 1}</b><div class="grow"><div class="t">${F.esc(x.a.nombre)}</div>
            <div class="s">${x.n} ventas · ${F.ml(x.ml)}</div></div><b class="num">${F.money(x.total)}</b></div>`).join('')
            : '<div class="empty">Aún no hay ventas en este periodo.</div>'}
        </div>
        ${(al.stockBajo.length || al.envBajos.length) ? `<div class="card"><h3>Stock bajo</h3>
          ${al.stockBajo.map(a => `<div class="alert warn"><span class="dot"></span><div><b>${F.esc(a.nombre)}</b>: quedan ${F.ml(a.stockMl)}</div></div>`).join('')}
          ${al.envBajos.length ? `<div class="alert warn"><span class="dot"></span><div><b>Envases nuevos:</b> ${al.envBajos.map(e => `${e.ml} ml ${e.g === 'dama' ? 'D' : 'C'} (${e.n})`).join(', ')}</div></div>` : ''}
          <a class="btn sm" href="#pedidos/sugerir">Armar pedido con lo que falta</a></div>` : ''}
      `;
      const ej = F.$('#ej', el); if (ej) ej.onclick = () => { F.cargarEjemplo(); F.toast('Datos de ejemplo cargados'); F.refrescar(); };
      const rp = F.$('#resp', el); if (rp) rp.onclick = () => { F.exportarExcel(); F.toast('Respaldo descargado'); F.refrescar(); };
    }
  });

  function saludo() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }
})(window.F);
