const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } })); // 50MB max

// Configuración BD
const dbConfig = {
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || 'k7vrnxBcf7mccfR.root',
    password: process.env.DB_PASS || 'zNhNalRP8tNZBVAo',
    database: process.env.DB_NAME || 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para hashear contraseñas
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Endpoints

// ===================== USUARIOS =====================
app.get('/api/usuarios', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT u.id_usuario, u.nombre_completo, u.username, u.email, u.id_rol, u.activo, r.nombre as rol FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol');
        conn.release();
        res.json(data);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        const { nombre_completo, username, password, id_rol } = req.body;
        const passwordHash = hashPassword(password);
        
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO usuarios (nombre_completo, username, password_hash, id_rol, activo, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
            [nombre_completo, username, passwordHash, id_rol || 2]
        );
        conn.release();
        
        res.status(201).json({ id_usuario: result.insertId, mensaje: 'Usuario creado' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, email, id_rol, activo } = req.body;
        
        const conn = await pool.getConnection();
        await conn.execute(
            'UPDATE usuarios SET nombre_completo = ?, email = ?, id_rol = ?, activo = ?, updated_at = NOW() WHERE id_usuario = ?',
            [nombre_completo, email, id_rol, activo, id]
        );
        conn.release();
        
        res.json({ mensaje: 'Usuario actualizado' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===================== CATEGORIAS =====================
app.get('/api/categorias', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre');
        conn.release();
        res.json(data);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categorias', async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO categorias (nombre, descripcion, activo, created_at) VALUES (?, ?, 1, NOW())',
            [nombre, descripcion]
        );
        conn.release();
        res.status(201).json({ id_categoria: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== PRODUCTOS =====================
app.get('/api/productos', async (req, res) => {
    // TEMP TEST: Return hardcoded response to verify code execution
    res.json([{ id_producto: 999, nombre: 'TEST RESPONSE - Server.js updated' }]);
    return;
    
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute(`
            SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, p.precio_compra, p.stock_actual, p.stock_minimo, p.id_categoria, p.id_proveedor, p.activo, p.tiene_imagen, p.url_imagen, p.created_at, p.updated_at, c.nombre as categoria_nombre, pv.nombre_razon_social as proveedor_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN proveedores pv ON p.id_proveedor = pv.id_proveedor
            WHERE p.activo = 1
            ORDER BY p.nombre
        `);
        
        conn.release();
        res.json(data);
    } catch (err) {
        console.error('Error GET productos:', err);
        res.status(500).json({ error: 'Error al cargar productos.', detail: err.message, code: err.code });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        // Soportar tanto JSON como FormData
        let { nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, id_categoria, id_proveedor } = req.body;
        let imagen_principal = null;
        let imagen_mime = null;
        let tiene_imagen = 0;
        
        // Si viene un archivo, procesarlo
        if (req.files && req.files.imagenes) {
            const archivo = Array.isArray(req.files.imagenes) ? req.files.imagenes[0] : req.files.imagenes;
            imagen_principal = archivo.data; // Buffer con la imagen
            imagen_mime = archivo.mimetype || 'image/jpeg';
            tiene_imagen = 1;
        }
        
        // Valores por defecto
        const precio_c = precio_compra || precio_venta || 0;
        const stock_m = stock_minimo || 5;
        const cat_final = id_categoria || 120001;
        
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO productos (nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen_principal, imagen_mime, tiene_imagen, activo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
            [nombre || '', descripcion || '', precio_venta || 0, precio_c, stock_actual || 0, stock_m, cat_final, id_proveedor || null, imagen_principal, imagen_mime, tiene_imagen]
        );
        conn.release();
        res.status(201).json({ id_producto: result.insertId, mensaje: 'Producto creado' });
    } catch (err) {
        console.error('❌ Error POST productos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, id_categoria, id_proveedor } = req.body;
        
        const conn = await pool.getConnection();
        
        // Get current price before update
        const [oldData] = await conn.execute('SELECT precio_venta FROM productos WHERE id_producto = ?', [id]);
        const oldPrice = oldData[0]?.precio_venta;
        
        // Check if there's a new image file
        let updateQuery = 'UPDATE productos SET nombre = ?, descripcion = ?, precio_venta = ?, precio_compra = ?, stock_actual = ?, stock_minimo = ?, id_categoria = ?, id_proveedor = ?, updated_at = NOW()';
        let params = [nombre || '', descripcion || '', precio_venta || 0, precio_compra || 0, stock_actual || 0, stock_minimo || 0, id_categoria || 1, id_proveedor || null];
        
        if (req.files && req.files.imagenes) {
            const archivo = Array.isArray(req.files.imagenes) ? req.files.imagenes[0] : req.files.imagenes;
            const imagen_principal = archivo.data;
            const imagen_mime = archivo.mimetype || 'image/jpeg';
            updateQuery += ', imagen_principal = ?, imagen_mime = ?, tiene_imagen = 1';
            params.splice(params.length - 1, 0, imagen_principal, imagen_mime);
        }
        
        updateQuery += ' WHERE id_producto = ?';
        params.push(id);
        
        await conn.execute(updateQuery, params);
        
        // Record price change if price was updated
        if (oldPrice && oldPrice !== precio_venta) {
            await conn.execute(
                'INSERT INTO historial_precios (id_producto, id_usuario, precio_anterior, precio_nuevo, fecha_cambio) VALUES (?, ?, ?, ?, NOW())',
                [id, null, oldPrice, precio_venta || 0]
            );
        }
        
        conn.release();
        res.json({ mensaje: 'Producto actualizado' });
    } catch (err) {
        console.error('Error PUT productos:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===================== CLIENTES =====================
app.get('/api/clientes', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT * FROM clientes WHERE activo = 1');
        conn.release();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { documento, nombre_completo, email, telefono, direccion, ciudad } = req.body;
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO clientes (documento, nombre_completo, email, telefono, direccion, ciudad, activo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
            [documento, nombre_completo, email, telefono, direccion, ciudad]
        );
        conn.release();
        res.status(201).json({ id_cliente: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== PROVEEDORES =====================
app.get('/api/proveedores', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT * FROM proveedores WHERE activo = 1');
        conn.release();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/proveedores', async (req, res) => {
    try {
        const { nit_documento, nombre_razon_social, email, telefono, direccion } = req.body;
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO proveedores (nit_documento, nombre_razon_social, email, telefono, direccion, activo, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
            [nit_documento, nombre_razon_social, email, telefono, direccion]
        );
        conn.release();
        res.status(201).json({ id_proveedor: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== TRANSACCIONES =====================
app.get('/api/transacciones', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute(`
            SELECT t.*, c.nombre_completo as nombre_cliente, u.nombre_completo as nombre_usuario
            FROM transacciones t
            LEFT JOIN clientes c ON t.id_cliente = c.id_cliente
            LEFT JOIN usuarios u ON t.id_usuario = u.id_usuario
            ORDER BY t.fecha_transaccion DESC
        `);
        conn.release();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transacciones', async (req, res) => {
    try {
        const { id_cliente, id_usuario, numero_documento, subtotal, impuesto, total_transaccion, metodo_pago, estado, tipo_documento, items } = req.body;
        
        const conn = await pool.getConnection();
        
        // Insertar transacción
        const [result] = await conn.execute(
            'INSERT INTO transacciones (id_cliente, id_usuario, numero_documento, subtotal, impuesto, total_transaccion, metodo_pago, estado, tipo_documento, fecha_transaccion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [id_cliente, id_usuario, numero_documento, subtotal, impuesto, total_transaccion, metodo_pago, estado || 'pendiente', tipo_documento || 'factura']
        );
        
        const id_transaccion = result.insertId;
        
        // Insertar detalles
        if (items && Array.isArray(items)) {
            for (const item of items) {
                await conn.execute(
                    'INSERT INTO detalle_transacciones (id_transaccion, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [id_transaccion, item.id_producto, item.cantidad, item.precio_unitario, item.subtotal]
                );
            }
        }
        
        conn.release();
        res.status(201).json({ id_transaccion });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===================== COMPRAS =====================
app.get('/api/compras', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute(`
            SELECT c.*, pv.nombre_razon_social as proveedor_nombre, u.nombre_completo as usuario_nombre
            FROM compras c
            LEFT JOIN proveedores pv ON c.id_proveedor = pv.id_proveedor
            LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
            ORDER BY c.fecha_compra DESC
        `);
        conn.release();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/compras', async (req, res) => {
    try {
        const { id_proveedor, id_usuario, numero_factura_proveedor, subtotal, impuesto, total_compra, estado, items } = req.body;
        
        const conn = await pool.getConnection();
        
        // Insertar compra
        const [result] = await conn.execute(
            'INSERT INTO compras (id_proveedor, id_usuario, numero_factura_proveedor, subtotal, impuesto, total_compra, estado, fecha_compra) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [id_proveedor, id_usuario, numero_factura_proveedor, subtotal, impuesto, total_compra, estado || 'pendiente']
        );
        
        const id_compra = result.insertId;
        
        // Insertar detalles
        if (items && Array.isArray(items)) {
            for (const item of items) {
                await conn.execute(
                    'INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [id_compra, item.id_producto, item.cantidad, item.precio_unitario, item.subtotal]
                );
            }
        }
        
        conn.release();
        res.status(201).json({ id_compra });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== HISTORIAL DE PRECIOS =====================
app.get('/api/historial-precios', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute(`
            SELECT h.*, p.nombre as nombre_producto, u.nombre_completo as nombre_usuario
            FROM historial_precios h
            LEFT JOIN productos p ON h.id_producto = p.id_producto
            LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
            ORDER BY h.fecha_cambio DESC
            LIMIT 100
        `);
        conn.release();
        res.json(data);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/historial-precios', async (req, res) => {
    try {
        const { id_producto, precio_anterior, precio_nuevo, id_usuario } = req.body;
        
        if (!id_producto || precio_anterior === undefined || precio_nuevo === undefined) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO historial_precios (id_producto, precio_anterior, precio_nuevo, id_usuario, fecha_cambio) VALUES (?, ?, ?, ?, NOW())',
            [id_producto, precio_anterior, precio_nuevo, id_usuario || null]
        );
        conn.release();
        res.status(201).json({ id_historial: result.insertId });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===================== IMÁGENES =====================
app.get('/api/productos/:id/imagen', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT imagen_principal, imagen_mime FROM productos WHERE id_producto = ?', [id]);
        conn.release();
        
        if (!data[0] || !data[0].imagen_principal) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        
        const mimeType = data[0].imagen_mime || 'image/jpeg';
        res.set('Content-Type', mimeType);
        res.send(data[0].imagen_principal);
    } catch (err) {
        console.error('Error GET imagen:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===================== FACTURAS =====================
app.get('/api/facturas', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute(`
            SELECT f.*, c.nombre_completo as nombre_cliente
            FROM facturas f
            LEFT JOIN clientes c ON f.id_cliente = c.id_cliente
            ORDER BY f.fecha_emision DESC
            LIMIT 100
        `);
        conn.release();
        res.json(data);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/facturas', async (req, res) => {
    try {
        const { id_cliente, id_usuario, numero_factura, subtotal, impuesto, total, metodo_pago, productos } = req.body;

        if (!id_cliente || !numero_factura || !productos || productos.length === 0) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const conn = await pool.getConnection();
        
        try {
            // Iniciar transacción
            await conn.beginTransaction();

            // Insertar factura
            const [result] = await conn.execute(
                'INSERT INTO facturas (id_cliente, id_usuario, numero_factura, subtotal, impuesto, total, metodo_pago, estado_factura, fecha_emision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [id_cliente, id_usuario || null, numero_factura, subtotal, impuesto, total, metodo_pago || 'efectivo', 'emitida']
            );

            const id_factura = result.insertId;

            // Insertar detalles de factura
            for (const item of productos) {
                const subtotal_item = item.precio * item.cantidad;
                await conn.execute(
                    'INSERT INTO detalles_factura (id_factura, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [id_factura, item.id_producto, item.cantidad, item.precio, subtotal_item]
                );
            }

            // Confirmar transacción
            await conn.commit();
            conn.release();
            res.status(201).json({ id_factura, numero_factura });
        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===================== ROLES =====================
app.get('/api/roles', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT * FROM roles');
        conn.release();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== SALUD =====================
app.get('/api/health', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        await conn.execute('SELECT 1');
        conn.release();
        res.json({ status: 'OK', database: 'Connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', error: err.message });
    }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 Backend iniciado');
    console.log('   Puerto: ' + PORT);
    console.log('   URL: http://localhost:' + PORT);
    console.log('   BD: ' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database);
    console.log('   Estado: ✅ Conectado a TiDB Cloud\n');
});
