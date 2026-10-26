/* ===== Respaldo: Excel (varias hojas) y archivo de respaldo .json ===== */
'use strict';
(function (F) {
  // Genera un libro de Excel en formato XML (Excel lo abre directo, con varias hojas).
  function libro(hojas) {
    const x = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const celda = v => (typeof v === 'number' && isFinite(v))
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`;
    const ws = hojas.map(h => `<Worksheet ss:Name="${x(h.nombre).slice(0, 31)}"><Table>
<Row ss:StyleID="h">${h.columnas.map(celda).join('')}</Row>
${h.filas.map(f => `<Row>${f.map(celda).join('')}</Row>`).join('\n')}
</Table></Worksheet>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#F1E7D6" ss:Pattern="Solid"/></Style></Styles>
${ws}
</Workbook>`;
  }

  F.exportarExcel = (desde, hasta, etiqueta) => {
    const db = F.db;
    const ventas = desde ? F.ventasEntre(desde, hasta) : db.ventas;
    const filasVentas = [];
    for (const v of ventas) for (const it of v.items) {
      filasVentas.push([F.fecha(v.fecha), F.hora(v.fecha), it.tipo, it.nombre, it.categoria ? F.cat(it.categoria).nombre : '', it.genero ? F.GENEROS[it.genero] : '',
        it.ml || '', it.cant || 1, it.deSobrante || 0, F.r2(it.costo), F.r2(it.precio), F.r2(it.precio - it.costo), v.pago, v.cliente || '', v.id]);
    }
    const hojas = [
      { nombre: 'Ventas', columnas: ['Fecha', 'Hora', 'Tipo', 'Producto/Aroma', 'Categoría', 'Género', 'ml', 'Cantidad', 'ml de sobrante', 'Costo', 'Precio', 'Ganancia', 'Pago', 'Cliente', 'Folio'], filas: filasVentas },
      { nombre: 'Aromas', columnas: ['Nombre', 'Inspiración', 'Género', 'Categoría', 'Stock ml', 'Sobrante ml', 'Activo'],
        filas: db.aromas.map(a => [a.nombre, a.inspiracion, F.GENEROS[a.genero], F.cat(a.categoria).nombre, a.stockMl, a.sobranteMl || 0, a.activo !== false ? 'Sí' : 'No']) },
      { nombre: 'Envases', columnas: ['Tamaño ml', 'Dama', 'Caballero'],
        filas: F.TAMANOS_NUEVO.map(ml => [ml, F.envStock(ml, 'dama'), F.envStock(ml, 'caballero')]) },
      { nombre: 'Productos', columnas: ['Nombre', 'Tipo', 'Costo', 'Precio', 'Stock'],
        filas: db.productos.map(p => [p.nombre, p.tipo, p.costo, p.precio, p.stock]) },
      { nombre: 'Pedidos', columnas: ['Fecha', 'Proveedor', 'Estado', 'Detalle', 'Total'],
        filas: db.pedidos.map(p => [F.fecha(p.fecha), p.proveedor, p.estado, p.items.map(F.textoLineaPedido).join(' | '), p.total]) }
    ];
    for (const k of F.CATS) {
      const filas = [];
      for (let ml = 1; ml <= 250; ml++) { const r = F.calcRelleno(ml, k); filas.push([ml, r.costo, r.precio, F.r2(r.precio - r.costo)]); }
      hojas.push({ nombre: 'Tabla ' + F.cat(k).nombre, columnas: ['ml', 'Costo', 'Precio', 'Ganancia'], filas });
    }
    const nombre = `FRAICHE_${etiqueta ? etiqueta.replace(/[^\w\-]+/g, '_') : 'respaldo'}_${F.inputFecha(new Date())}.xls`;
    F.descargar(nombre, libro(hojas), 'application/vnd.ms-excel');
    if (!desde) { F.db.config.ultimoRespaldo = new Date().toISOString(); F.guardar(); }
  };

  F.exportarJSON = () => {
    F.db.config.ultimoRespaldo = new Date().toISOString(); F.guardar();
    const copia = JSON.parse(JSON.stringify(F.db));
    F.descargar(`FRAICHE_respaldo_${F.inputFecha(new Date())}.json`, JSON.stringify(copia, null, 1), 'application/json');
  };

  F.importarJSON = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!obj || !Array.isArray(obj.aromas) || !Array.isArray(obj.ventas)) throw new Error('Archivo no válido');
        const pin = F.db.config.pinHash;
        F.reemplazarDatos(obj);
        if (!F.db.config.pinHash) F.db.config.pinHash = pin;
        F.guardar(); res();
      } catch (e) { rej(e); }
    };
    r.onerror = rej;
    r.readAsText(file);
  });
})(window.F);
