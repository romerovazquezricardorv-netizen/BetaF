/* ===== Utilidades generales ===== */
'use strict';
window.F = window.F || {};

(function (F) {
  F.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  F.$ = (s, r = document) => r.querySelector(s);
  F.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  F.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  F.num = (v, d = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : d; };
  F.r2 = n => Math.round((Number(n) || 0) * 100) / 100;

  F.money = n => {
    n = Number(n) || 0;
    const neg = n < 0; n = Math.abs(n);
    const dec = Math.abs(n - Math.round(n)) > 0.001;
    return (neg ? '-' : '') + '$' + n.toLocaleString('es-MX', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: 2 });
  };
  F.ml = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('es-MX') + ' ml';
  F.norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  F.pct = n => (isFinite(n) ? Math.round(n) : 0) + '%';

  /* ---- Fechas (la semana empieza en lunes) ---- */
  F.MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  F.DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  F.sod = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
  F.sow = d => { d = F.sod(d); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  F.som = d => { d = F.sod(d); d.setDate(1); return d; };
  F.soy = d => { d = F.som(d); d.setMonth(0); return d; };
  F.addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };

  F.periodo = (tipo, ref) => {
    ref = new Date(ref);
    let from, to, label;
    if (tipo === 'dia') {
      from = F.sod(ref); to = F.addDays(from, 1);
      label = from.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (tipo === 'semana') {
      from = F.sow(ref); to = F.addDays(from, 7);
      const end = F.addDays(to, -1);
      label = `${from.getDate()} ${F.MESES[from.getMonth()].slice(0, 3)} – ${end.getDate()} ${F.MESES[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
    } else if (tipo === 'mes') {
      from = F.som(ref); to = new Date(from); to.setMonth(to.getMonth() + 1);
      label = F.MESES[from.getMonth()] + ' ' + from.getFullYear();
    } else {
      from = F.soy(ref); to = new Date(from); to.setFullYear(to.getFullYear() + 1);
      label = String(from.getFullYear());
    }
    return { from, to, label: label.charAt(0).toUpperCase() + label.slice(1) };
  };
  F.mover = (tipo, ref, dir) => {
    const d = new Date(ref);
    if (tipo === 'dia') d.setDate(d.getDate() + dir);
    else if (tipo === 'semana') d.setDate(d.getDate() + 7 * dir);
    else if (tipo === 'mes') { d.setDate(1); d.setMonth(d.getMonth() + dir); }
    else d.setFullYear(d.getFullYear() + dir);
    return d;
  };
  F.fechaHora = iso => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  F.fecha = iso => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  F.hora = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  F.inputFecha = d => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  /* ---- Aviso flotante ---- */
  let tt;
  F.toast = (msg, tipo = '') => {
    const t = F.$('#toast');
    t.textContent = msg; t.className = 'toast show ' + tipo;
    clearTimeout(tt); tt = setTimeout(() => { t.className = 'toast'; }, 2600);
  };

  /* ---- Ventana modal ---- */
  F.modal = ({ titulo, cuerpo, botones = '', alAbrir }) => {
    const m = F.$('#modal');
    m.innerHTML = `<div class="m-h"><h3>${F.esc(titulo)}</h3><button class="x" data-cerrar>×</button></div>
      <div class="m-b">${cuerpo}</div>${botones ? `<div class="m-f">${botones}</div>` : ''}`;
    F.$$('[data-cerrar]', m).forEach(b => b.onclick = () => m.close());
    if (!m.open) m.showModal();
    if (alAbrir) alAbrir(m);
    return m;
  };
  F.cerrarModal = () => { const m = F.$('#modal'); if (m.open) m.close(); };

  F.confirmar = (mensaje, { si = 'Sí, continuar', peligro = false } = {}) => new Promise(res => {
    const m = F.modal({
      titulo: 'Confirmar',
      cuerpo: `<p>${mensaje}</p>`,
      botones: `<button class="btn" data-no>Cancelar</button><button class="btn ${peligro ? 'danger' : 'primary'}" data-si>${F.esc(si)}</button>`
    });
    let r = false;
    F.$('[data-si]', m).onclick = () => { r = true; m.close(); };
    F.$('[data-no]', m).onclick = () => m.close();
    m.addEventListener('close', () => res(r), { once: true });
  });

  F.descargar = (nombre, contenido, tipo) => {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
})(window.F);
