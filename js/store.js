/* ===== Datos: guardado en el teléfono (localStorage) y cálculos de precio ===== */
'use strict';
(function (F) {
  const KEY = 'fraiche_datos_v1';

  F.TAMANOS_NUEVO = [15, 16, 30, 50, 60, 100, 120];              // tamaños de perfume nuevo en tienda
  F.ENVASES_CLIENTE = [12, 20, 25, 32, 35, 40, 45, 50, 55, 65, 70, 100, 120, 150]; // envases que traen los clientes
  F.CATS = ['estandar', 'niche', 'arabe'];
  F.GENEROS = { dama: 'Dama', caballero: 'Caballero', unisex: 'Unisex' };
  F.TIPOS_PRODUCTO = ['Body', 'Veladora', 'Aromatizante', 'Crema', 'Otro'];

  function porDefecto() {
    return {
      version: 1,
      config: {
        pinHash: null,
        redondeo: 1, // redondear precios a: 0 = sin redondeo, 1, 5 o 10 pesos
        categorias: {
          estandar: { nombre: 'Estándar', costoLitro: 1300, precioMl: 2.40 },
          niche: { nombre: 'Niche', costoLitro: 1800, precioMl: 3.40 },
          arabe: { nombre: 'Árabe', costoLitro: 1500, precioMl: 2.90 }
        },
        // Costo y precio del envase nuevo (se suma al perfume por ml)
        tamanos: [
          { ml: 15, envaseCosto: 21, envasePrecio: 35 },
          { ml: 16, envaseCosto: 21, envasePrecio: 35 },
          { ml: 30, envaseCosto: 33, envasePrecio: 55 },
          { ml: 50, envaseCosto: 38, envasePrecio: 62 },
          { ml: 60, envaseCosto: 41, envasePrecio: 68 },
          { ml: 100, envaseCosto: 48, envasePrecio: 80 },
          { ml: 120, envaseCosto: 52, envasePrecio: 87 }
        ],
        alertas: { dias: 30, minVentas: 3, stockMinMl: 100, stockMinEnvases: 3 },
        ultimoRespaldo: null
      },
      aromas: [],     // {id, nombre, inspiracion, genero, categoria, stockMl, sobranteMl, activo, creado}
      envases: {},    // {'30-dama': 5, '30-caballero': 3, ...}
      productos: [],  // {id, nombre, tipo, costo, precio, stock, activo}
      ventas: [],     // {id, fecha, items[], total, costo, pago, cliente}
      pedidos: []     // {id, fecha, proveedor, estado, items[], total, nota, recibido}
    };
  }

  function mezclar(base, guardado) {
    if (!guardado || typeof guardado !== 'object') return base;
    for (const k of Object.keys(guardado)) {
      const v = guardado[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = mezclar(base[k], v);
      else base[k] = v;
    }
    return base;
  }

  F.cargar = () => {
    let g = null;
    try { g = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { g = null; }
    F.db = mezclar(porDefecto(), g);
    F.TAMANOS_NUEVO.forEach(ml => { if (!F.db.config.tamanos.find(t => t.ml === ml)) F.db.config.tamanos.push({ ml, envaseCosto: 0, envasePrecio: 0 }); });
    F.db.config.tamanos.sort((a, b) => a.ml - b.ml);
  };
  F.guardar = () => {
    try { localStorage.setItem(KEY, JSON.stringify(F.db)); }
    catch (e) { F.toast('No se pudo guardar: memoria llena. Haz un respaldo.', 'bad'); }
  };
  F.reemplazarDatos = obj => { F.db = mezclar(porDefecto(), obj); F.guardar(); };
  F.borrarTodo = () => { const pin = F.db.config.pinHash; F.db = porDefecto(); F.db.config.pinHash = pin; F.guardar(); };

  /* ---- Búsquedas ---- */
  F.aroma = id => F.db.aromas.find(a => a.id === id);
  F.producto = id => F.db.productos.find(p => p.id === id);
  F.cat = k => F.db.config.categorias[k] || F.db.config.categorias.estandar;
  F.tamano = ml => F.db.config.tamanos.find(t => t.ml === ml) || { ml, envaseCosto: 0, envasePrecio: 0 };
  F.envKey = (ml, g) => `${ml}-${g}`;
  F.envStock = (ml, g) => F.db.envases[F.envKey(ml, g)] || 0;

  /* ---- Precios ---- */
  F.redondear = p => { const r = Number(F.db.config.redondeo) || 0; return r ? Math.round(p / r) * r : F.r2(p); };
  F.costoMl = catKey => F.cat(catKey).costoLitro / 1000;

  // Relleno (o tabulador): solo perfume por mililitro
  F.calcRelleno = (ml, catKey) => {
    const c = F.cat(catKey);
    return { costo: F.r2(ml * c.costoLitro / 1000), precio: F.redondear(ml * c.precioMl) };
  };
  // Perfume nuevo: perfume + envase
  F.calcNuevo = (ml, catKey) => {
    const c = F.cat(catKey), t = F.tamano(ml);
    return {
      costo: F.r2(ml * c.costoLitro / 1000 + Number(t.envaseCosto || 0)),
      precio: F.redondear(ml * c.precioMl + Number(t.envasePrecio || 0))
    };
  };

  /* ---- Movimientos de inventario ----
     signo = -1 al vender (descuenta) | +1 al cancelar una venta (regresa) */
  F.aplicarItems = (db, items, signo) => {
    const ar = id => db.aromas.find(a => a.id === id);
    for (const it of items) {
      if (it.tipo === 'nuevo') {
        const a = ar(it.aromaId); if (a) a.stockMl = F.r2(a.stockMl + signo * it.ml);
        const k = F.envKey(it.ml, it.genero); db.envases[k] = (db.envases[k] || 0) + signo;
      } else if (it.tipo === 'relleno') {
        const a = ar(it.aromaId);
        if (a) {
          a.stockMl = F.r2(a.stockMl + signo * it.consumoStock);
          a.sobranteMl = F.r2((a.sobranteMl || 0) + signo * it.deSobrante - signo * it.sobranteGenerado);
        }
      } else if (it.tipo === 'producto') {
        const p = db.productos.find(x => x.id === it.productoId); if (p) p.stock += signo * it.cant;
      }
    }
  };
  // Pedido recibido: signo +1 suma al inventario, -1 lo revierte
  F.aplicarPedido = (db, pedido, signo) => {
    for (const it of pedido.items) {
      if (it.tipo === 'aroma') { const a = db.aromas.find(x => x.id === it.aromaId); if (a) a.stockMl = F.r2(a.stockMl + signo * it.ml); }
      else if (it.tipo === 'envase') { const k = F.envKey(it.ml, it.genero); db.envases[k] = (db.envases[k] || 0) + signo * it.cant; }
      else if (it.tipo === 'producto') { const p = db.productos.find(x => x.id === it.productoId); if (p) p.stock += signo * it.cant; }
    }
  };

  F.eliminarVenta = id => {
    const v = F.db.ventas.find(x => x.id === id); if (!v) return;
    F.aplicarItems(F.db, v.items, +1);
    F.db.ventas = F.db.ventas.filter(x => x.id !== id);
    F.guardar();
  };

  F.ventasEntre = (from, to) => F.db.ventas.filter(v => { const d = new Date(v.fecha); return d >= from && d < to; });

  /* ---- Alertas: perfumes que se venden poco, más vendidos y stock bajo ---- */
  F.alertas = () => {
    const cfg = F.db.config.alertas;
    const desde = F.addDays(new Date(), -cfg.dias);
    const cuenta = {};
    for (const v of F.ventasEntre(desde, F.addDays(new Date(), 1))) for (const it of v.items) {
      if (!it.aromaId) continue;
      const c = cuenta[it.aromaId] || (cuenta[it.aromaId] = { n: 0, ml: 0, total: 0 });
      c.n++; c.ml += it.ml || 0; c.total += it.precio || 0;
    }
    const activos = F.db.aromas.filter(a => a.activo !== false);
    const pocos = activos.map(a => ({ a, ...(cuenta[a.id] || { n: 0, ml: 0, total: 0 }) }))
      .filter(x => x.n < cfg.minVentas).sort((x, y) => x.n - y.n || x.a.nombre.localeCompare(y.a.nombre));
    const top = activos.map(a => ({ a, ...(cuenta[a.id] || { n: 0, ml: 0, total: 0 }) }))
      .filter(x => x.n > 0).sort((x, y) => y.n - x.n || y.ml - x.ml).slice(0, 5);
    const stockBajo = activos.filter(a => a.stockMl < cfg.stockMinMl);
    const envBajos = [];
    for (const t of F.TAMANOS_NUEVO) for (const g of ['dama', 'caballero']) {
      const n = F.envStock(t, g); if (n < cfg.stockMinEnvases) envBajos.push({ ml: t, g, n });
    }
    return { pocos, top, stockBajo, envBajos, dias: cfg.dias };
  };

  /* ---- Datos de ejemplo para probar la beta ---- */
  F.cargarEjemplo = () => {
    const ej = [
      ['Floral Rosa (ejemplo)', 'Floral dulce', 'dama', 'estandar', 900],
      ['Vainilla Ámbar (ejemplo)', 'Oriental vainilla', 'dama', 'arabe', 600],
      ['Frutal Fresh (ejemplo)', 'Frutal fresco', 'dama', 'estandar', 450],
      ['Cítrico Marino (ejemplo)', 'Acuático', 'caballero', 'estandar', 1000],
      ['Madera Oud (ejemplo)', 'Amaderado oud', 'caballero', 'arabe', 500],
      ['Cuero Intenso (ejemplo)', 'Cuero especiado', 'caballero', 'niche', 300],
      ['Té Blanco (ejemplo)', 'Almizcle limpio', 'unisex', 'niche', 80]
    ];
    ej.forEach(([nombre, inspiracion, genero, categoria, stockMl], i) => F.db.aromas.push({
      id: F.uid(), nombre, inspiracion, genero, categoria, stockMl, sobranteMl: i === 0 ? 14 : (i === 3 ? 10 : 0), activo: true, creado: new Date().toISOString()
    }));
    F.TAMANOS_NUEVO.forEach(ml => ['dama', 'caballero'].forEach(g => { F.db.envases[F.envKey(ml, g)] = (F.db.envases[F.envKey(ml, g)] || 0) + 6; }));
    [['Body Vainilla (ejemplo)', 'Body', 45, 89, 8], ['Veladora Lavanda (ejemplo)', 'Veladora', 60, 120, 4], ['Aromatizante Coco (ejemplo)', 'Aromatizante', 40, 85, 5]]
      .forEach(([nombre, tipo, costo, precio, stock]) => F.db.productos.push({ id: F.uid(), nombre, tipo, costo, precio, stock, activo: true }));
    F.guardar();
  };
})(window.F);
