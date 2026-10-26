/* ===== Reportes: día, semana, mes y año ===== */
'use strict';
(function (F) {
  let tipo = 'dia', ref = new Date();
  const TIPOS = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']];
  const NOMBRE_TIPO = { nuevo: 'Perfume nuevo', relleno: 'Relleno', producto: 'Productos' };

  function cubetas(p, ventas) {
    let b = [];
    if (tipo === 'dia') { for (let h = 8; h <= 21; h++) b.push({ lb: h + 'h', t: 0, test: d => d.getHours() === h || (h === 8 && d.getHours() < 8) || (h === 21 && d.getHours() > 21) }); }
    else if (tipo === 'semana') b = F.DIAS.map((n, i) => ({ lb: n, t: 0, test: d => (d.getDay() + 6) % 7 === i }));
    else if (tipo === 'mes') { const dias = new Date(p.from.getFullYear(), p.from.getMonth() + 1, 0).getDate(); for (let i = 1; i <= dias; i++) b.push({ lb: (i % 5 === 1 || i === dias) ? String(i) : '', t: 0, test: d => d.getDate() === i }); }
    else b = F.MESES.map((n, i) => ({ lb: n.slice(0, 3), t: 0, test: d => d.getMonth() === i }));
    for (const v of ventas) { const d = new Date(v.fecha); const c = b.find(x => x.test(d)); if (c) c.t += v.total; }
    const max = Math.max(1, ...b.map(x => x.t));
    return `<div class="bars">${b.map(x => `<div class="b" title="${F.money(x.t)}"><div class="bar ${x.t ? '' : 'zero'}" style="height:${Math.max(2, x.t / max * 100)}%"></div><div class="lb">${x.lb}</div></div>`).join('')}</div>`;
  }

  F.vista('reportes', {
    titulo: 'Reportes',
    render(el) {
      const p = F.periodo(tipo, ref);
      const ventas = F.ventasEntre(p.from, p.to);
      const r = F.resumen(ventas);
      const topA = Object.values(r.aromas).sort((a, b) => b.total - a.total).slice(0, 10);
      const maxTop = Math.max(1, ...topA.map(a => a.total));
      const lista = ventas.slice().reverse();

      el.innerHTML = `
        <div class="seg" id="tipos">${TIPOS.map(([k, t]) => `<button data-k="${k}" class="${k === tipo ? 'on' : ''}">${t}</button>`).join('')}</div>
        <div class="row between" style="margin:12px 0"><button class="btn sm" id="ant">‹</button><b>${p.label}</b><button class="btn sm" id="sig">›</button></div>
        <div class="kpis">
          <div class="kpi dark"><div class="k">Ventas</div><div class="v">${F.money(r.total)}</div></div>
          <div class="kpi"><div class="k">Ganancia</div><div class="v">${F.money(r.ganancia)}</div></div>
          <div class="kpi"><div class="k">Tickets</div><div class="v">${r.n}</div></div>
          <div class="kpi"><div class="k">ml vendidos</div><div class="v">${F.ml(r.ml)}</div></div>
        </div>
        <div class="card"><h3>Ventas por ${tipo === 'dia' ? 'hora' : tipo === 'anio' ? 'mes' : 'día'}</h3>${cubetas(p, ventas)}
          <div class="small muted" style="margin-top:8px">Ticket promedio: <b>${F.money(r.n ? r.total / r.n : 0)}</b> · Costo: <b>${F.money(r.costo)}</b></div></div>
        <div class="grid2">
          <div class="card"><h3>Por tipo</h3>${Object.keys(NOMBRE_TIPO).map(k => `<div class="line row between small"><span>${NOMBRE_TIPO[k]} (${(r.tipos[k] || {}).n || 0})</span><b>${F.money((r.tipos[k] || {}).total || 0)}</b></div>`).join('')}</div>
          <div class="card"><h3>Por categoría</h3>${F.CATS.map(k => `<div class="row between small"><span>${F.cat(k).nombre}</span><b>${F.money(r.cats[k] || 0)}</b></div>`).join('')}
            <div class="lbl" style="margin-top:10px">Forma de pago</div>${Object.entries(r.pagos).map(([k, v]) => `<div class="row between small"><span>${k}</span><b>${F.money(v)}</b></div>`).join('') || '<div class="small muted">—</div>'}</div>
        </div>
        <div class="card"><h3>Lo más vendido</h3>${topA.length ? topA.map(a => `<div style="margin-bottom:9px"><div class="row between small"><b>${F.esc(a.nombre)}</b><span>${a.n} · ${a.ml ? F.ml(a.ml) + ' · ' : ''}${F.money(a.total)}</span></div>
          <div class="hbar"><i style="width:${a.total / maxTop * 100}%"></i></div></div>`).join('') : '<div class="empty">Sin ventas en este periodo.</div>'}</div>
        <div class="card"><div class="row between"><h3 style="margin:0">Detalle (${lista.length})</h3><button class="btn sm" id="xls">Excel del periodo</button></div>
          ${lista.slice(0, 100).map(v => `<div class="item"><div class="grow"><div class="t">${v.items.map(i => F.esc(i.nombre)).join(', ')}</div>
            <div class="s">${F.fechaHora(v.fecha)} · ${v.items.map(F.detalleItem).join(' / ')} · ${v.pago}</div></div>
            <div class="right"><b class="num">${F.money(v.total)}</b><div class="small ok">+${F.money(v.total - v.costo)}</div></div><button class="x" data-v="${v.id}">×</button></div>`).join('') || '<div class="empty">—</div>'}
          ${lista.length > 100 ? '<p class="small muted">Se muestran las últimas 100. El Excel trae todas.</p>' : ''}</div>`;

      F.$$('#tipos button', el).forEach(b => b.onclick = () => { tipo = b.dataset.k; ref = new Date(); F.refrescar(); });
      F.$('#ant', el).onclick = () => { ref = F.mover(tipo, ref, -1); F.refrescar(); };
      F.$('#sig', el).onclick = () => { ref = F.mover(tipo, ref, +1); F.refrescar(); };
      F.$('#xls', el).onclick = () => F.exportarExcel(p.from, p.to, p.label);
      F.$$('[data-v]', el).forEach(b => b.onclick = async () => {
        if (await F.confirmar('¿Cancelar esta venta? El inventario se regresa.', { si: 'Cancelar venta', peligro: true })) { F.eliminarVenta(b.dataset.v); F.refrescar(); }
      });
    }
  });
})(window.F);
