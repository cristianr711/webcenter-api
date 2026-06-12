const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const multer  = require('multer');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'CLAVE_SECRETA_WEBCENTER_2026';

// ── Base de Datos: TiDB Cloud ──────────────────────────────────────────────
const dbPool = mysql.createPool({
    host:             process.env.DB_HOST     || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port:             parseInt(process.env.DB_PORT) || 4000,
    user:             process.env.DB_USER     || 'k7vrnxBcf7mccfR.root',
    password:         process.env.DB_PASS     || 'zNhNalRP8tNZBVAo',
    database:         process.env.DB_NAME     || 'db_webcenter',
    waitForConnections: true,
    connectionLimit:  10,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── HEALTH ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) =>
    res.json({ status: 'OK', version: '2.1', storage: 'TiDB Cloud', oracle: 'eliminado', emoji_support: 'active' })
);

// ── AUTH ───────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales.' });
    try {
        const [rows] = await dbPool.execute(
            'SELECT * FROM usuarios WHERE username = ? AND estado = 1', [username]
        );
        if (!rows.length) return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
        const u = rows[0];
        if (!await bcrypt.compare(password, u.password_hash))
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        const token = jwt.sign({ id: u.id_usuario, rol: u.rol, nombre: u.nombre_completo }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ mensaje: 'Autenticación exitosa', token, rol: u.rol, nombre: u.nombre_completo, id: u.id_usuario });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Error en base de datos.' }); }
});

app.post('/api/registro', async (req, res) => {
    const { nombre_completo, username, password } = req.body;
    if (!nombre_completo || !username || !password)
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    try {
        const hash = await bcrypt.hash(password, 10);
        await dbPool.execute(
            'INSERT INTO usuarios (nombre_completo, username, password_hash, rol, estado) VALUES (?,?,?,?,1)',
            [nombre_completo, username, hash, 'cliente']
        );
        res.status(201).json({ mensaje: 'Usuario registrado.' });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Correo ya registrado.' });
        res.status(500).json({ error: 'Error al registrar.' });
    }
});

// ── PRODUCTOS ──────────────────────────────────────────────────────────────
app.get('/api/productos', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(`
            SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, p.stock_actual,
                   p.id_categoria, p.url_imagen,
                   (p.imagen_data IS NOT NULL) AS tiene_imagen,
                   c.nombre AS categoria_nombre,
                   GROUP_CONCAT(pi.id_imagen) AS extra_imagenes
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN producto_imagenes pi ON p.id_producto = pi.id_producto
            WHERE p.estado = 1 
            GROUP BY p.id_producto, c.nombre
            ORDER BY p.id_producto DESC`);
            
        const BASE_URL = process.env.API_URL || 'https://webcenter-api.vercel.app/api';
        const productos = rows.map(p => {
            const imgs = [];
            if (p.tiene_imagen) imgs.push(`${BASE_URL}/productos/${p.id_producto}/imagen`);
            if (p.extra_imagenes) {
                p.extra_imagenes.split(',').forEach(id => imgs.push(`${BASE_URL}/productos/${p.id_producto}/imagenes/${id}`));
            }
            if (imgs.length === 0 && p.url_imagen) imgs.push(p.url_imagen);
            return { ...p, imagenes: imgs };
        });
        res.json(productos);
    } catch (e) { res.status(500).json({ error: 'Error al cargar productos.', detail: e.message, code: e.code }); }
});

// Servir imagen desde TiDB (reemplaza Oracle Bucket)
app.get('/api/productos/:id/imagen', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT imagen_data, imagen_mime FROM productos WHERE id_producto = ? AND imagen_data IS NOT NULL',
            [req.params.id]
        );
        if (!rows.length || !rows[0].imagen_data) return res.status(404).end();
        res.setHeader('Content-Type', rows[0].imagen_mime || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(rows[0].imagen_data);
    } catch (e) { res.status(500).json({ error: 'Error al cargar imagen.' }); }
});

app.get('/api/productos/:id/imagenes/:imgId', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT imagen_data, imagen_mime FROM producto_imagenes WHERE id_producto = ? AND id_imagen = ?',
            [req.params.id, req.params.imgId]
        );
        if (!rows.length || !rows[0].imagen_data) return res.status(404).end();
        res.setHeader('Content-Type', rows[0].imagen_mime || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(rows[0].imagen_data);
    } catch (e) { res.status(500).json({ error: 'Error al cargar imagen adicional.' }); }
});

app.post('/api/productos', upload.array('imagenes'), async (req, res) => {
    const { nombre, precio_venta, stock_actual, id_categoria, descripcion } = req.body;
    if (!nombre || !precio_venta) return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
    try {
        const img  = req.files?.[0]?.buffer || null;
        const mime = req.files?.[0]?.mimetype || null;
        const [r] = await dbPool.execute(
            `INSERT INTO productos (nombre, descripcion, precio_venta, precio_compra, stock_actual, id_categoria, imagen_data, imagen_mime, estado)
             VALUES (?,?,?,0,?,?,?,?,1)`,
            [nombre, descripcion || '', precio_venta, stock_actual || 0, id_categoria || null, img, mime]
        );
        
        const productId = r.insertId;
        
        // Insert extra images into producto_imagenes table
        if (req.files && req.files.length > 1) {
            for (let i = 1; i < req.files.length; i++) {
                const extraImg = req.files[i].buffer;
                const extraMime = req.files[i].mimetype;
                await dbPool.execute(
                    'INSERT INTO producto_imagenes (id_producto, imagen_data, imagen_mime) VALUES (?,?,?)',
                    [productId, extraImg, extraMime]
                );
            }
        }
        
        res.status(201).json({ mensaje: 'Producto creado.', id: productId });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Error al crear producto.', detail: e.message }); }
});

app.put('/api/productos/:id', async (req, res) => {
    const { nombre, precio_venta, stock_actual, id_categoria, descripcion } = req.body;
    try {
        await dbPool.execute(
            'UPDATE productos SET nombre=?,descripcion=?,precio_venta=?,stock_actual=?,id_categoria=?,updated_at=NOW() WHERE id_producto=?',
            [nombre, descripcion || '', precio_venta, stock_actual, id_categoria || null, req.params.id]
        );
        res.json({ mensaje: 'Producto actualizado.' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar.' }); }
});

app.post('/api/productos/:id/delete', async (req, res) => {
    const id = req.params.id;
    try {
        const [result] = await dbPool.execute('UPDATE productos SET estado=0 WHERE id_producto=?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json({ mensaje: 'Producto eliminado.' });
    } catch (e) { res.status(500).json({ error: 'Error al eliminar.', detail: e.message }); }
});

app.delete('/api/productos/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await dbPool.execute('UPDATE productos SET estado=0 WHERE id_producto=?', [id]);
        res.json({ mensaje: 'Producto eliminado.' });
    } catch (e) { res.status(500).json({ error: 'Error al eliminar.', detail: e.message }); }
});

// ── CATEGORIAS ─────────────────────────────────────────────────────────────
app.get('/api/categorias', async (_, res) => {
    try { res.json((await dbPool.execute('SELECT * FROM categorias ORDER BY nombre'))[0]); }
    catch (e) { res.status(500).json({ error: 'Error al cargar categorías.', detail: e.message }); }
});
app.post('/api/categorias', async (req, res) => {
    const { nombre, descripcion, emoji } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre obligatorio.' });
    try {
        const [r] = await dbPool.execute('INSERT INTO categorias (nombre,descripcion,emoji) VALUES (?,?,?)', [nombre, descripcion || '', emoji || '']);
        res.status(201).json({ mensaje: 'Categoría creada.', id: r.insertId });
    } catch (e) { res.status(500).json({ error: 'Error al crear.', detail: e.message }); }
});
app.put('/api/categorias/:id', async (req, res) => {
    try {
        await dbPool.execute('UPDATE categorias SET nombre=?,descripcion=?,emoji=? WHERE id_categoria=?',
            [req.body.nombre, req.body.descripcion || '', req.body.emoji || '', req.params.id]);
        res.json({ mensaje: 'Actualizada.' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar.' }); }
});
app.post('/api/categorias/:id/delete', async (req, res) => {
    try {
        await dbPool.execute('DELETE FROM categorias WHERE id_categoria=?', [req.params.id]);
        res.json({ mensaje: 'Eliminada.' });
    } catch (e) { res.status(500).json({ error: 'Error al eliminar.', detail: e.message }); }
});

app.delete('/api/categorias/:id', async (req, res) => {
    try { await dbPool.execute('DELETE FROM categorias WHERE id_categoria=?', [req.params.id]); res.json({ mensaje: 'Eliminada.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── CLIENTES ───────────────────────────────────────────────────────────────
app.get('/api/clientes', async (_, res) => {
    try { res.json((await dbPool.execute('SELECT * FROM clientes ORDER BY nombre_completo'))[0]); }
    catch (e) { res.status(500).json({ error: 'Error al cargar clientes.', detail: e.message }); }
});
app.post('/api/clientes', async (req, res) => {
    const { documento, nombre_completo, telefono, direccion } = req.body;
    if (!documento || !nombre_completo) return res.status(400).json({ error: 'Documento y nombre obligatorios.' });
    try {
        const [r] = await dbPool.execute(
            'INSERT INTO clientes (documento,nombre_completo,telefono,direccion) VALUES (?,?,?,?)',
            [documento, nombre_completo, telefono || '', direccion || '']
        );
        res.status(201).json({ mensaje: 'Cliente creado.', id: r.insertId });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Documento ya existe.' });
        res.status(500).json({ error: 'Error al crear.' });
    }
});
app.put('/api/clientes/:id', async (req, res) => {
    const { documento, nombre_completo, telefono, direccion } = req.body;
    try {
        await dbPool.execute('UPDATE clientes SET documento=?,nombre_completo=?,telefono=?,direccion=? WHERE id_cliente=?',
            [documento, nombre_completo, telefono || '', direccion || '', req.params.id]);
        res.json({ mensaje: 'Cliente actualizado.' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar.' }); }
});
app.post('/api/clientes/:id/delete', async (req, res) => {
    try { await dbPool.execute('DELETE FROM clientes WHERE id_cliente=?', [req.params.id]); res.json({ mensaje: 'Eliminado.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});
app.delete('/api/clientes/:id', async (req, res) => {
    try { await dbPool.execute('DELETE FROM clientes WHERE id_cliente=?', [req.params.id]); res.json({ mensaje: 'Eliminado.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── PROVEEDORES ────────────────────────────────────────────────────────────
app.get('/api/proveedores', async (_, res) => {
    try { res.json((await dbPool.execute('SELECT * FROM proveedores ORDER BY nombre_razon_social'))[0]); }
    catch (e) { res.status(500).json({ error: 'Error al cargar proveedores.', detail: e.message }); }
});
app.post('/api/proveedores', async (req, res) => {
    const { nit_documento, nombre_razon_social, email, telefono, direccion } = req.body;
    if (!nit_documento || !nombre_razon_social) return res.status(400).json({ error: 'NIT y razón social obligatorios.' });
    try {
        const [r] = await dbPool.execute(
            'INSERT INTO proveedores (nit_documento,nombre_razon_social,email,telefono,direccion) VALUES (?,?,?,?,?)',
            [nit_documento, nombre_razon_social, email || '', telefono || '', direccion || '']
        );
        res.status(201).json({ mensaje: 'Proveedor creado.', id: r.insertId });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'NIT ya existe.' });
        res.status(500).json({ error: 'Error al crear.' });
    }
});
app.put('/api/proveedores/:id', async (req, res) => {
    const { nit_documento, nombre_razon_social, email, telefono, direccion } = req.body;
    try {
        await dbPool.execute('UPDATE proveedores SET nit_documento=?,nombre_razon_social=?,email=?,telefono=?,direccion=? WHERE id_proveedor=?',
            [nit_documento, nombre_razon_social, email || '', telefono || '', direccion || '', req.params.id]);
        res.json({ mensaje: 'Proveedor actualizado.' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar.' }); }
});
app.post('/api/proveedores/:id/delete', async (req, res) => {
    try { await dbPool.execute('DELETE FROM proveedores WHERE id_proveedor=?', [req.params.id]); res.json({ mensaje: 'Eliminado.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});
app.delete('/api/proveedores/:id', async (req, res) => {
    try { await dbPool.execute('DELETE FROM proveedores WHERE id_proveedor=?', [req.params.id]); res.json({ mensaje: 'Eliminado.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── USUARIOS ───────────────────────────────────────────────────────────────
app.get('/api/usuarios', async (_, res) => {
    try {
        res.json((await dbPool.execute(
            'SELECT id_usuario,nombre_completo,username,rol,estado,created_at FROM usuarios ORDER BY nombre_completo'
        ))[0]);
    } catch (e) { res.status(500).json({ error: 'Error al cargar usuarios.' }); }
});
app.post('/api/usuarios', async (req, res) => {
    const { nombre_completo, username, password, rol } = req.body;
    if (!nombre_completo || !username || !password) return res.status(400).json({ error: 'Nombre, email y contraseña obligatorios.' });
    try {
        const hash = await bcrypt.hash(password, 10);
        const [r] = await dbPool.execute(
            'INSERT INTO usuarios (nombre_completo,username,password_hash,rol,estado) VALUES (?,?,?,?,1)',
            [nombre_completo, username, hash, rol || 'cliente']
        );
        res.status(201).json({ mensaje: 'Usuario creado.', id: r.insertId });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Correo ya registrado.' });
        res.status(500).json({ error: 'Error al crear.' });
    }
});
app.put('/api/usuarios/:id', async (req, res) => {
    const { nombre_completo, username, password, rol } = req.body;
    try {
        if (password?.trim()) {
            const hash = await bcrypt.hash(password, 10);
            await dbPool.execute('UPDATE usuarios SET nombre_completo=?,username=?,password_hash=?,rol=? WHERE id_usuario=?',
                [nombre_completo, username, hash, rol || 'cliente', req.params.id]);
        } else {
            await dbPool.execute('UPDATE usuarios SET nombre_completo=?,username=?,rol=? WHERE id_usuario=?',
                [nombre_completo, username, rol || 'cliente', req.params.id]);
        }
        res.json({ mensaje: 'Usuario actualizado.' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar.' }); }
});
app.post('/api/usuarios/:id/delete', async (req, res) => {
    try { await dbPool.execute('DELETE FROM usuarios WHERE id_usuario=?', [req.params.id]); res.json({ mensaje: 'Eliminado.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});
app.delete('/api/usuarios/:id', async (req, res) => {
    try { await dbPool.execute('UPDATE usuarios SET estado=0 WHERE id_usuario=?', [req.params.id]); res.json({ mensaje: 'Desactivado.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── VENTAS ─────────────────────────────────────────────────────────────────
app.get('/api/ventas', async (_, res) => {
    try {
        const [rows] = await dbPool.execute(`
            SELECT v.id_venta, v.total_venta, v.metodo_pago, v.fecha_venta,
                   c.nombre_completo AS cliente
            FROM ventas v LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
            ORDER BY v.fecha_venta DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error al cargar ventas.' }); }
});
app.post('/api/ventas', async (req, res) => {
    const { id_cliente, id_usuario, productos, total, metodo_pago } = req.body;
    if (!productos?.length) return res.status(400).json({ error: 'Debe incluir al menos un producto.' });
    const conn = await dbPool.getConnection();
    try {
        await conn.beginTransaction();
        const [v] = await conn.execute(
            'INSERT INTO ventas (id_cliente,id_usuario,total_venta,metodo_pago) VALUES (?,?,?,?)',
            [id_cliente || null, id_usuario || null, total, metodo_pago || 'efectivo']
        );
        for (const item of productos) {
            const sub = item.cantidad * item.precio_venta;
            await conn.execute(
                'INSERT INTO detalle_ventas (id_venta,id_producto,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)',
                [v.insertId, item.id_producto, item.cantidad, item.precio_venta, sub]
            );
            await conn.execute('UPDATE productos SET stock_actual=stock_actual-? WHERE id_producto=?',
                [item.cantidad, item.id_producto]);
        }
        await conn.commit();
        res.status(201).json({ mensaje: 'Venta registrada.', id_venta: v.insertId });
    } catch (e) { await conn.rollback(); console.error(e); res.status(500).json({ error: 'Error al registrar venta.' }); }
    finally { conn.release(); }
});
app.delete('/api/ventas/:id', async (req, res) => {
    try { await dbPool.execute('DELETE FROM ventas WHERE id_venta=?', [req.params.id]); res.json({ mensaje: 'Venta eliminada.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── COMPRAS ────────────────────────────────────────────────────────────────
app.get('/api/compras', async (_, res) => {
    try {
        const [rows] = await dbPool.execute(`
            SELECT c.id_compra, c.numero_factura_proveedor, c.total_compra, c.fecha_compra,
                   p.nombre_razon_social AS proveedor
            FROM compras c LEFT JOIN proveedores p ON c.id_proveedor = p.id_proveedor
            ORDER BY c.fecha_compra DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error al cargar compras.' }); }
});
app.post('/api/compras', async (req, res) => {
    const { id_proveedor, id_usuario, numero_factura, productos, total } = req.body;
    if (!productos?.length) return res.status(400).json({ error: 'Debe incluir al menos un producto.' });
    const conn = await dbPool.getConnection();
    try {
        await conn.beginTransaction();
        const [c] = await conn.execute(
            'INSERT INTO compras (id_proveedor,id_usuario,numero_factura_proveedor,total_compra) VALUES (?,?,?,?)',
            [id_proveedor || null, id_usuario || null, numero_factura || '', total]
        );
        for (const item of productos) {
            const sub = item.cantidad * item.precio_compra;
            await conn.execute(
                'INSERT INTO detalle_compras (id_compra,id_producto,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)',
                [c.insertId, item.id_producto, item.cantidad, item.precio_compra, sub]
            );
            await conn.execute('UPDATE productos SET stock_actual=stock_actual+? WHERE id_producto=?',
                [item.cantidad, item.id_producto]);
        }
        await conn.commit();
        res.status(201).json({ mensaje: 'Compra registrada.', id_compra: c.insertId });
    } catch (e) { await conn.rollback(); console.error(e); res.status(500).json({ error: 'Error al registrar compra.' }); }
    finally { conn.release(); }
});
app.delete('/api/compras/:id', async (req, res) => {
    try { await dbPool.execute('DELETE FROM compras WHERE id_compra=?', [req.params.id]); res.json({ mensaje: 'Compra eliminada.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// HISTORIAL DE PRECIOS
app.get('/api/historial-precios', async (req, res) => {
    try {
        const [data] = await dbPool.execute(`
            SELECT h.*, p.nombre as nombre_producto, u.nombre_completo as nombre_usuario
            FROM historial_precios h
            LEFT JOIN productos p ON h.id_producto = p.id_producto
            LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
            ORDER BY h.fecha_cambio DESC
            LIMIT 100
        `);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener historial.' });
    }
});

app.post('/api/historial-precios', async (req, res) => {
    try {
        const { id_producto, id_usuario, precio_anterior, precio_nuevo } = req.body;
        
        if (!id_producto || !precio_anterior || !precio_nuevo) {
            return res.status(400).json({ error: 'Datos incompletos.' });
        }

        await dbPool.execute(
            `INSERT INTO historial_precios (id_producto, id_usuario, precio_anterior, precio_nuevo)
             VALUES (?, ?, ?, ?)`,
            [id_producto, id_usuario, precio_anterior, precio_nuevo]
        );

        res.status(201).json({ mensaje: 'Cambio de precio registrado.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar cambio de precio.' });
    }
});

// FACTURACION
app.get('/api/facturas', async (req, res) => {
    try {
        const [data] = await dbPool.execute(`
            SELECT f.*, c.nombre_completo as nombre_cliente
            FROM facturas f
            LEFT JOIN clientes c ON f.id_cliente = c.id_cliente
            ORDER BY f.fecha_emision DESC
            LIMIT 100
        `);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener facturas.' });
    }
});

app.post('/api/facturas', async (req, res) => {
    const conn = await dbPool.getConnection();
    try {
        const { id_cliente, id_usuario, numero_factura, productos, subtotal, impuesto, total, metodo_pago } = req.body;
        
        if (!id_cliente || !numero_factura || !productos || productos.length === 0) {
            return res.status(400).json({ error: 'Datos incompletos.' });
        }

        await conn.beginTransaction();

        // Insertar factura
        const [facturaResult] = await conn.execute(
            `INSERT INTO facturas (id_cliente, id_usuario, numero_factura, subtotal, impuesto, total, metodo_pago, estado_factura)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'emitida')`,
            [id_cliente, id_usuario, numero_factura, subtotal, impuesto, total, metodo_pago]
        );

        const facturaId = facturaResult.insertId;

        // Insertar detalles de factura
        for (const prod of productos) {
            const subtotalProd = prod.cantidad * prod.precio_unitario;
            await conn.execute(
                `INSERT INTO detalles_factura (id_factura, id_producto, cantidad, precio_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [facturaId, prod.id_producto, prod.cantidad, prod.precio_unitario, subtotalProd]
            );
        }

        await conn.commit();

        res.status(201).json({ 
            mensaje: 'Factura creada exitosamente.',
            id_factura: facturaId, 
            numero_factura 
        });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'El número de factura ya existe.' });
        } else {
            res.status(500).json({ error: 'Error al crear factura.' });
        }
    } finally {
        conn.release();
    }
});

// ── START ──────────────────────────────────────────────────────────────────
// Modo local: arranca el servidor normal
// Modo Vercel: exporta el app como función serverless
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`WebCenter API v2.0 - Puerto ${PORT}`);
        console.log(`Storage: TiDB Cloud BLOB (Oracle eliminado)`);
    });
}

module.exports = app;
