/* ===== Ajustes: precios, envases, alertas, PIN y respaldo ===== */
'use strict';
(function (F) {
  F.vista('ajustes', {
    titulo: 'Ajustes',
    render(el) {
      const cfg = F.db.config;
      const ult = cfg.ultimoRespaldo ? F.fechaHora(cfg.ultimoRespaldo) : 'nunca';
      el.innerHTML = `
        <div class="sec-title">Precio por categoría</div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Categoría</th><th>Costo litro</th><th>Precio ml</th></tr></thead><tbody>
          ${F.CATS.map(k => `<tr><td>${F.cat(k).nombre}</td><td><input class="input num" type="number" inputmode="decimal" data-c="${k}" data-f="costoLitro" value="${F.cat(k).costoLitro}"></td>
            <td><input class="input num" type="number" step="0.05" inputmode="decimal" data-c="${k}" data-f="precioMl" value="${F.cat(k).precioMl}"></td></tr>`).join('')}
          </tbody></table></div>
          <label class="f">Redondear precios a</label>
          <select id="red" class="input">${[[0, 'Sin redondeo (centavos)'], [1, '$1'], [5, '$5'], [10, '$10']].map(([v, t]) => `<option value="${v}" ${+cfg.redondeo === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>

        <div class="sec-title">Envase de perfume nuevo</div>
        <div class="card"><p class="small muted" style="margin-top:0">Precio nuevo = ml × precio por ml + precio del envase. Ajusta aquí para que coincida con tu lista.</p>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tamaño</th><th>Costo env.</th><th>Precio env.</th><th>Estándar</th></tr></thead><tbody>
          ${cfg.tamanos.filter(t => F.TAMANOS_NUEVO.includes(t.ml)).map(t => `<tr><td>${t.ml} ml</td><td><input class="input num" type="number" inputmode="decimal" data-t="${t.ml}" data-f="envaseCosto" value="${t.envaseCosto}"></td>
            <td><input class="input num" type="number" inputmode="decimal" data-t="${t.ml}" data-f="envasePrecio" value="${t.envasePrecio}"></td><td id="pv-${t.ml}">${F.money(F.calcNuevo(t.ml, 'estandar').precio)}</td></tr>`).join('')}
          </tbody></table></div></div>

        <div class="sec-title">Alertas</div>
        <div class="card"><div class="grid2">
          <div><label class="f">Revisar últimos (días)</label><input class="input num" type="number" data-a="dias" value="${cfg.alertas.dias}"></div>
          <div><label class="f">“Se vende poco” si tiene menos de (ventas)</label><input class="input num" type="number" data-a="minVentas" value="${cfg.alertas.minVentas}"></div>
          <div><label class="f">Stock bajo de perfume (ml)</label><input class="input num" type="number" data-a="stockMinMl" value="${cfg.alertas.stockMinMl}"></div>
          <div><label class="f">Stock bajo de envases (pzas)</label><input class="input num" type="number" data-a="stockMinEnvases" value="${cfg.alertas.stockMinEnvases}"></div>
        </div></div>

        <div class="sec-title">Respaldo</div>
        <div class="card"><p class="small muted" style="margin-top:0">Los datos viven en este teléfono. Respalda seguido. Último respaldo: <b>${ult}</b></p>
          <div class="grid2"><button class="btn primary" id="xls">Descargar Excel</button><button class="btn" id="json">Respaldo completo (.json)</button></div>
          <label class="btn block" style="margin-top:10px">Restaurar desde respaldo .json<input id="imp" type="file" accept=".json,application/json" hidden></label>
          <p class="small muted">El Excel sirve para revisar y llevar cuentas. Para pasar los datos a otro teléfono usa el respaldo .json.</p></div>

        <div class="sec-title">Seguridad</div>
        <div class="card"><div class="grid2"><button class="btn" id="pin">Cambiar PIN</button><button class="btn" id="lock">Bloquear ahora</button></div></div>

        <div class="sec-title">Beta</div>
        <div class="card"><div class="grid2"><button class="btn" id="ej">Cargar ejemplos</button><button class="btn danger" id="borrar">Borrar todos los datos</button></div>
          <p class="small muted">FRAICHE Ventas · beta 0.1</p></div>`;

      F.$$('[data-c]', el).forEach(i => i.onchange = () => { F.cat(i.dataset.c)[i.dataset.f] = Math.max(0, F.num(i.value)); F.guardar(); F.toast('Guardado'); F.refrescar(); });
      F.$('#red', el).onchange = e => { cfg.redondeo = +e.target.value; F.guardar(); F.toast('Guardado'); F.refrescar(); };
      F.$$('[data-t]', el).forEach(i => i.onchange = () => {
        const t = cfg.tamanos.find(x => x.ml === +i.dataset.t); t[i.dataset.f] = Math.max(0, F.num(i.value)); F.guardar();
        F.$('#pv-' + t.ml, el).textContent = F.money(F.calcNuevo(t.ml, 'estandar').precio);
      });
      F.$$('[data-a]', el).forEach(i => i.onchange = () => { cfg.alertas[i.dataset.a] = Math.max(0, Math.round(F.num(i.value))); F.guardar(); F.toast('Guardado'); });
      F.$('#xls', el).onclick = () => { F.exportarExcel(); F.toast('Excel descargado'); };
      F.$('#json', el).onclick = () => { F.exportarJSON(); F.toast('Respaldo descargado'); };
      F.$('#imp', el).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        if (!(await F.confirmar('Esto reemplaza TODOS los datos actuales con los del respaldo. ¿Continuar?', { si: 'Restaurar', peligro: true }))) return;
        try { await F.importarJSON(f); F.toast('Datos restaurados'); F.ir('inicio'); } catch (err) { F.toast('Archivo no válido', 'bad'); }
      };
      F.$('#lock', el).onclick = F.bloquear;
      F.$('#pin', el).onclick = () => {
        const m = F.modal({
          titulo: 'Cambiar PIN',
          cuerpo: `<label class="f">PIN actual</label><input id="a" class="input" type="password" inputmode="numeric">
            <label class="f">PIN nuevo (4 a 8 números)</label><input id="n" class="input" type="password" inputmode="numeric">`,
          botones: `<button class="btn" id="cn">Cancelar</button><button class="btn primary" id="ok">Cambiar</button>`
        });
        F.$('#cn', m).onclick = () => m.close();
        F.$('#ok', m).onclick = async () => {
          if (await F.hashPin(F.$('#a', m).value.trim()) !== cfg.pinHash) return F.toast('PIN actual incorrecto', 'bad');
          const n = F.$('#n', m).value.trim(); if (!/^\d{4,8}$/.test(n)) return F.toast('El PIN debe tener de 4 a 8 números', 'bad');
          cfg.pinHash = await F.hashPin(n); F.guardar(); m.close(); F.toast('PIN cambiado');
        };
      };
      F.$('#ej', el).onclick = () => { F.cargarEjemplo(); F.toast('Ejemplos cargados'); F.ir('inventario'); };
      F.$('#borrar', el).onclick = async () => {
        if (await F.confirmar('Se borran aromas, ventas, pedidos e inventario. Haz un respaldo antes. ¿Borrar todo?', { si: 'Borrar todo', peligro: true })) { F.borrarTodo(); F.toast('Datos borrados'); F.ir('inicio'); }
      };
    }
  });
})(window.F);
