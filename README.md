# FRAICHE Ventas (beta 0.1)

App web para el negocio de perfumes FRAICHE. Funciona en el celular como app (se instala con acceso directo) y **sin internet**.

## Qué hace
- **Vender**: perfume nuevo, relleno y productos terminados en un mismo ticket. Pago en efectivo, transferencia o tarjeta.
  - **Perfume nuevo**: eliges Dama o Caballero, el tamaño (15, 16, 30, 50, 60, 100, 120 ml) y el aroma. Descuenta los ml y el envase.
  - **Relleno**: apartado de **sobrantes**. Puedes tomar ml del sobrante y, si preparas una base más grande, lo que sobra se guarda solo.
- **Tabulador** de 1 a 250 ml con pestañas **Estándar, Niche y Árabe**. Cambias el costo por litro y la tabla se recalcula.
- **Inventario**: aromas (con temporada activa o no), envases por tamaño y género, sobrantes y productos.
- **Pedidos** al proveedor: al marcarlos recibidos se suman al inventario. Botón para sugerir pedido con lo que está bajo.
- **Reportes** del día, semana, mes y año, con gráfica, lo más vendido y descarga a Excel.
- **Alertas** de perfumes que se venden poco en el mes, los más vendidos y stock bajo.
- **PIN** de acceso, **respaldo** en Excel y respaldo completo `.json` para pasar a otro teléfono.

## Estructura
```
index.html              Página principal
manifest.webmanifest    Datos para instalar como app
sw.js                   Funcionamiento sin internet
css/styles.css          Estilos
js/utils.js             Utilidades (fechas, dinero, ventanas)
js/store.js             Datos, precios y movimientos de inventario
js/excel.js             Respaldo a Excel y .json
js/app.js               Navegación y PIN
js/inicio.js            Pantalla de inicio y alertas
js/vender.js            Ventas (nuevo, relleno con sobrantes, productos)
js/tabulador.js         Tabla 1–250 ml
js/inventario.js        Aromas, envases, sobrantes, productos
js/pedidos.js           Pedidos al proveedor
js/reportes.js          Reportes
js/ajustes.js           Precios, envases, alertas, PIN, respaldo
icons/                  Íconos de la app
```

## Subirlo a GitHub Pages
1. Crea un repositorio nuevo y sube **todo el contenido** de esta carpeta (que `index.html` quede en la raíz).
2. Settings → Pages → Branch: `main` / `(root)` → Save.
3. Abre la liga en Chrome del celular → menú ⋮ → **Agregar a pantalla principal**.

## Importante
- Los datos se guardan **en el teléfono**. Si borras datos del navegador se pierden: respalda seguido desde Ajustes.
- El PIN protege la app en el teléfono, pero no es una seguridad de nivel bancario.
- Cuando cambies algún archivo, sube el número `VERSION` en `sw.js` para que el celular tome la versión nueva.
- Los precios de Niche y Árabe y el precio de los envases de 15, 50 y 100 ml son de prueba: ajústalos en **Ajustes**.
