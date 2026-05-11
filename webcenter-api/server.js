const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const multer  = require('multer');

const app = express();
app.use(cors());
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
    res.json({ status: 'OK', version: '2.0', storage: 'TiDB Cloud', oracle: 'eliminado' })
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
                   c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.estado = 1 ORDER BY p.id_producto DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error al cargar productos.' }); }
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

app.post('/api/productos', upload.array('imagenes', 5), async (req, res) => {
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
        res.status(201).json({ mensaje: 'Producto creado.', id: r.insertId });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Error al crear producto.' }); }
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

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await dbPool.execute('UPDATE productos SET estado=0 WHERE id_producto=?', [req.params.id]);
        res.json({ mensaje: 'Producto eliminado.' });
    } catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── CATEGORIAS ─────────────────────────────────────────────────────────────
app.get('/api/categorias', async (_, res) => {
    try { res.json((await dbPool.execute('SELECT * FROM categorias ORDER BY nombre'))[0]); }
    catch (e) { res.status(500).json({ error: 'Error al cargar categorías.' }); }
});
app.post('/api/categorias', async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre obligatorio.' });
    try {
        const [r] = await dbPool.execute('INSERT INTO categorias (nombre,descripcion) VALUES (?,?)', [nombre, descripcion || '']);
        res.status(201).json({ mensaje: 'Categoría creada.', id: r.insertId });
    } catch (e) { res.status(500).json({ error: 'Error al crear.' }); }
});
app.put('/api/categorias/:id', async (req, res) => {
    try {
        await dbPool.execute('UPDATE categorias SET nombre=?,descripcion=? WHERE id_categoria=?',
            [req.body.nombre, req.body.descripcion || '', req.params.id]);
        res.json({ mensaje: 'Actualizada.' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar.' }); }
});
app.delete('/api/categorias/:id', async (req, res) => {
    try { await dbPool.execute('DELETE FROM categorias WHERE id_categoria=?', [req.params.id]); res.json({ mensaje: 'Eliminada.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── CLIENTES ───────────────────────────────────────────────────────────────
app.get('/api/clientes', async (_, res) => {
    try { res.json((await dbPool.execute('SELECT * FROM clientes ORDER BY nombre_completo'))[0]); }
    catch (e) { res.status(500).json({ error: 'Error al cargar clientes.' }); }
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
app.delete('/api/clientes/:id', async (req, res) => {
    try { await dbPool.execute('DELETE FROM clientes WHERE id_cliente=?', [req.params.id]); res.json({ mensaje: 'Eliminado.' }); }
    catch (e) { res.status(500).json({ error: 'Error al eliminar.' }); }
});

// ── PROVEEDORES ────────────────────────────────────────────────────────────
app.get('/api/proveedores', async (_, res) => {
    try { res.json((await dbPool.execute('SELECT * FROM proveedores ORDER BY nombre_razon_social'))[0]); }
    catch (e) { res.status(500).json({ error: 'Error al cargar proveedores.' }); }
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

// ── START ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`WebCenter API v2.0 - Puerto ${PORT}`);
    console.log(`Storage: TiDB Cloud BLOB (Oracle eliminado)`);
});
