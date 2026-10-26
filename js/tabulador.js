/* ===== Tabulador de costo y precio por mililitro (1 a 250 ml) ===== */
'use strict';
(function (F) {
  let cat = 'estandar';
  try { cat = localStorage.getItem('fraiche_tab') || 'estandar'; } catch (e) { }

  F.vista('tabla', {
    titulo: 'Tabulador',
    render(el) {
      if (!F.CATS.includes(cat)) cat = 'estandar';
      el.innerHTML = `
        <div class="seg" id="cats">${F.CATS.map(k => `<button data-k="${k}" class="${k === cat ? 'on' : ''}">${F.cat(k).nombre}</button>`).join('')}</div>
        <div class="card" style="margin-top:12px" id="cfg"></div>
        <div class="row" style="margin-bottom:10px">
          <input id="buscar" class="input grow num" type="number" inputmode="numeric" min="1" max="250" placeholder="Ir a ml…">
          <div class="small muted">★ tamaño nuevo<br><span style="background:var(--gold-soft);padding:0 4px;border-radius:4px">envase cliente</span></div>
        </div>
        <div class="tbl-wrap tall" id="wrap"></div>
        <div class="sec-title">Perfume nuevo (con envase) · ${F.cat(cat).nombre}</div>
        <div class="tbl-wrap" id="nuevos"></div>`;

      F.$$('#cats button', el).forEach(b => b.onclick = () => { cat = b.dataset.k; try { localStorage.setItem('fraiche_tab', cat); } catch (e) { } F.refrescar(); });

      const cfg = () => {
        const c = F.cat(cat);
        const cm = c.costoLitro / 1000, margen = cm ? (c.precioMl / cm - 1) * 100 : 0;
        F.$('#cfg', el).innerHTML = `<div class="grid2">
          <div><label class="f" style="margin-top:0">Costo por litro</label><input id="cl" class="input num" type="number" inputmode="decimal" value="${c.costoLitro}"></div>
          <div><label class="f" style="margin-top:0">Precio de venta por ml</label><input id="pm" class="input num" type="number" inputmode="decimal" step="0.05" value="${c.precioMl}"></div></div>
          <div class="row between small muted" style="margin-top:10px"><span>Costo por ml: <b>${F.money(F.r2(cm))}</b></span><span>Margen: <b>${F.pct(margen)}</b></span>
          <span>Redondeo: <b>${F.db.config.redondeo ? '$' + F.db.config.redondeo : 'no'}</b></span></div>
          <p class="small muted" style="margin:6px 0 0">Cuando cambie el proveedor, actualiza el costo por litro y la tabla se recalcula sola.</p>`;
        const save = () => {
          c.costoLitro = Math.max(0, F.num(F.$('#cl', el).value, c.costoLitro));
          c.precioMl = Math.max(0, F.num(F.$('#pm', el).value, c.precioMl));
          F.guardar(); cfg(); tabla(); nuevos(); F.toast('Precios de ' + c.nombre + ' actualizados');
        };
        F.$('#cl', el).onchange = save; F.$('#pm', el).onchange = save;
      };

      const tabla = () => {
        const filas = [];
        for (let ml = 1; ml <= 250; ml++) {
          const r = F.calcRelleno(ml, cat);
          const cls = [F.ENVASES_CLIENTE.includes(ml) ? 'hl' : '', F.TAMANOS_NUEVO.includes(ml) ? 'nv' : ''].join(' ');
          filas.push(`<tr id="ml-${ml}" class="${cls}"><td>${ml} ml</td><td>${F.money(r.costo)}</td><td><b>${F.money(r.precio)}</b></td><td>${F.money(F.r2(r.precio - r.costo))}</td></tr>`);
        }
        F.$('#wrap', el).innerHTML = `<table class="tbl"><thead><tr><th>ml</th><th>Costo</th><th>Precio</th><th>Ganancia</th></tr></thead><tbody>${filas.join('')}</tbody></table>`;
      };

      const nuevos = () => {
        F.$('#nuevos', el).innerHTML = `<table class="tbl"><thead><tr><th>Tamaño</th><th>Costo</th><th>Precio</th><th>Ganancia</th></tr></thead><tbody>
          ${F.TAMANOS_NUEVO.map(ml => { const r = F.calcNuevo(ml, cat); return `<tr><td>${ml} ml</td><td>${F.money(r.costo)}</td><td><b>${F.money(r.precio)}</b></td><td>${F.money(F.r2(r.precio - r.costo))}</td></tr>`; }).join('')}
          </tbody></table>`;
      };

      F.$('#buscar', el).oninput = e => {
        const ml = Math.round(F.num(e.target.value, 0));
        const tr = F.$('#ml-' + ml, el); if (!tr) return;
        F.$$('tr.flash', el).forEach(t => t.classList.remove('flash'));
        tr.classList.add('flash');
        const w = F.$('#wrap', el); w.scrollTop = tr.offsetTop - 40;
      };
      cfg(); tabla(); nuevos();
    }
  });
})(window.F);
