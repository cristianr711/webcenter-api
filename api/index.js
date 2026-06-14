const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// Production API - WebCenter
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

const dbConfig = {
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || 'k7vrnxBcf7mccfR.root',
    password: process.env.DB_PASS || 'zNhNalRP8tNZBVAo',
    database: process.env.DB_NAME || 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
};

const pool = mysql.createPool(dbConfig);

// PRODUCTOS
app.get('/api/productos', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute(`
            SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, p.precio_compra, 
                   p.stock_actual, p.stock_minimo, p.id_categoria, p.id_proveedor, p.activo, 
                   p.tiene_imagen, p.url_imagen, p.created_at, p.updated_at, 
                   c.nombre as categoria_nombre, pv.nombre_razon_social as proveedor_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN proveedores pv ON p.id_proveedor = pv.id_proveedor
            WHERE p.activo = 1
            ORDER BY p.nombre
        `);
        conn.release();
        res.json(data);
    } catch (err) {
        console.error('Error GET productos:', err.message);
        res.status(500).json({ error: 'Error al cargar productos', detail: err.message });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        let { nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, id_categoria, id_proveedor } = req.body;
        let imagen_principal = null;
        let imagen_mime = null;
        let tiene_imagen = 0;
        
        if (req.files && req.files.imagenes) {
            const archivo = Array.isArray(req.files.imagenes) ? req.files.imagenes[0] : req.files.imagenes;
            imagen_principal = archivo.data;
            imagen_mime = archivo.mimetype || 'image/jpeg';
            tiene_imagen = 1;
        }
        
        const precio_c = precio_compra || precio_venta || 0;
        const stock_m = stock_minimo || 5;
        const cat_final = id_categoria || null;
        
        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO productos (nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen_principal, imagen_mime, tiene_imagen, activo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
            [nombre || '', descripcion || '', precio_venta || 0, precio_c, stock_actual || 0, stock_m, cat_final, id_proveedor || null, imagen_principal, imagen_mime, tiene_imagen]
        );
        conn.release();
        res.status(201).json({ id_producto: result.insertId, mensaje: 'Producto creado' });
    } catch (err) {
        console.error('Error POST productos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, id_categoria, id_proveedor } = req.body;
        const conn = await pool.getConnection();
        
        // Obtener precio anterior para historial
        const [oldProduct] = await conn.execute('SELECT precio_venta FROM productos WHERE id_producto = ?', [id]);
        const precio_anterior = oldProduct.length > 0 ? oldProduct[0].precio_venta : 0;
        
        // Actualizar producto
        await conn.execute(
            'UPDATE productos SET nombre = ?, descripcion = ?, precio_venta = ?, precio_compra = ?, stock_actual = ?, stock_minimo = ?, id_categoria = ?, id_proveedor = ?, updated_at = NOW() WHERE id_producto = ?',
            [nombre || '', descripcion || '', precio_venta || 0, precio_compra || 0, stock_actual || 0, stock_minimo || 5, id_categoria || null, id_proveedor || null, id]
        );
        
        // Registrar cambio de precio en historial si cambió
        if (Number(precio_anterior) !== Number(precio_venta || 0)) {
            await conn.execute(
                'INSERT INTO historial_precios (id_producto, precio_anterior, precio_nuevo, id_usuario, fecha_cambio) VALUES (?, ?, ?, ?, NOW())',
                [id, precio_anterior, precio_venta || 0, null]
            );
        }
        
        conn.release();
        res.json({ mensaje: 'Producto actualizado' });
    } catch (err) {
        console.error('Error PUT productos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/productos/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        await conn.execute('UPDATE productos SET activo = 0 WHERE id_producto = ?', [id]);
        conn.release();
        res.json({ mensaje: 'Producto eliminado' });
    } catch (err) {
        console.error('Error DELETE productos:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/productos/:id/imagen', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        const [rows] = await conn.execute('SELECT imagen_principal, imagen_mime FROM productos WHERE id_producto = ? AND tiene_imagen = 1', [id]);
        conn.release();
        
        if (rows.length === 0 || !rows[0].imagen_principal) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        
        const { imagen_principal, imagen_mime } = rows[0];
        res.set('Content-Type', imagen_mime || 'image/jpeg');
        res.send(imagen_principal);
    } catch (err) {
        console.error('Error GET imagen:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// CATEGORIAS
app.get('/api/categorias', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre');
        conn.release();
        res.json(data);
    } catch (err) {
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

app.put('/api/categorias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, emoji } = req.body;
        const conn = await pool.getConnection();
        await conn.execute(
            'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ?',
            [nombre || '', descripcion || '', id]
        );
        conn.release();
        res.json({ mensaje: 'Categoría actualizada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categorias/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        await conn.execute('UPDATE categorias SET activo = 0 WHERE id_categoria = ?', [id]);
        conn.release();
        res.json({ mensaje: 'Categoría eliminada' });
    } catch (err) {
        console.error('Error DELETE categorias:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// CLIENTES
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
            'INSERT INTO clientes (documento, nombre_completo, email, telefono, direccion, ciudad, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [documento || '', nombre_completo || '', email || null, telefono || '', direccion || '', ciudad || null]
        );
        conn.release();
        res.status(201).json({ id_cliente: result.insertId });
    } catch (err) {
        console.error('Error POST clientes:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { documento, nombre_completo, email, telefono, direccion, ciudad } = req.body;
        const conn = await pool.getConnection();
        await conn.execute(
            'UPDATE clientes SET documento = ?, nombre_completo = ?, email = ?, telefono = ?, direccion = ?, ciudad = ? WHERE id_cliente = ?',
            [documento || '', nombre_completo || '', email || null, telefono || '', direccion || '', ciudad || null, id]
        );
        conn.release();
        res.json({ mensaje: 'Cliente actualizado' });
    } catch (err) {
        console.error('Error PUT clientes:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clientes/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        await conn.execute('UPDATE clientes SET activo = 0 WHERE id_cliente = ?', [id]);
        conn.release();
        res.json({ mensaje: 'Cliente eliminado' });
    } catch (err) {
        console.error('Error DELETE clientes:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PROVEEDORES
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

app.put('/api/proveedores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nit_documento, nombre_razon_social, email, telefono, direccion } = req.body;
        const conn = await pool.getConnection();
        await conn.execute(
            'UPDATE proveedores SET nit_documento = ?, nombre_razon_social = ?, email = ?, telefono = ?, direccion = ? WHERE id_proveedor = ?',
            [nit_documento || '', nombre_razon_social || '', email || '', telefono || '', direccion || '', id]
        );
        conn.release();
        res.json({ mensaje: 'Proveedor actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/proveedores/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        await conn.execute('UPDATE proveedores SET activo = 0 WHERE id_proveedor = ?', [id]);
        conn.release();
        res.json({ mensaje: 'Proveedor eliminado' });
    } catch (err) {
        console.error('Error DELETE proveedores:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// USUARIOS
app.get('/api/usuarios', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute('SELECT u.id_usuario, u.nombre_completo, u.username, u.email, u.id_rol, u.activo, r.nombre as rol FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol WHERE u.activo = 1');
        conn.release();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        const { nombre_completo, username, email, password, id_rol } = req.body;
        
        if (!nombre_completo || !username) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const conn = await pool.getConnection();
        const [result] = await conn.execute(
            'INSERT INTO usuarios (nombre_completo, username, email, password_hash, id_rol) VALUES (?, ?, ?, ?, ?)',
            [nombre_completo, username, email || username, password || 'password123', id_rol || 2]
        );
        conn.release();
        res.status(201).json({ id_usuario: result.insertId, mensaje: 'Usuario creado' });
    } catch (err) {
        console.error('Error POST usuarios:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, username, email, password, id_rol } = req.body;
        const conn = await pool.getConnection();
        await conn.execute(
            'UPDATE usuarios SET nombre_completo = ?, username = ?, email = ?, password_hash = ?, id_rol = ? WHERE id_usuario = ?',
            [nombre_completo || '', username || '', email || username || '', password || '', id_rol || 2, id]
        );
        conn.release();
        res.json({ mensaje: 'Usuario actualizado' });
    } catch (err) {
        console.error('Error PUT usuarios:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        await conn.execute('UPDATE usuarios SET activo = 0 WHERE id_usuario = ?', [id]);
        conn.release();
        res.json({ mensaje: 'Usuario eliminado' });
    } catch (err) {
        console.error('Error DELETE usuarios:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// FACTURAS
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
            await conn.beginTransaction();
            const [result] = await conn.execute(
                'INSERT INTO facturas (id_cliente, id_usuario, numero_factura, subtotal, impuesto, total, metodo_pago, estado_factura, fecha_emision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [id_cliente, id_usuario || null, numero_factura, subtotal, impuesto, total, metodo_pago || 'efectivo', 'emitida']
            );

            const id_factura = result.insertId;

            for (const item of productos) {
                const subtotal_item = item.precio * item.cantidad;
                await conn.execute(
                    'INSERT INTO detalles_factura (id_factura, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [id_factura, item.id_producto, item.cantidad, item.precio, subtotal_item]
                );
            }

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

// HISTORIAL PRECIOS
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
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/historial-precios', async (req, res) => {
    try {
        const { id_producto, precio_anterior, precio_nuevo, id_usuario } = req.body;
        if (precio_anterior !== precio_nuevo) {
            const conn = await pool.getConnection();
            await conn.execute(
                'INSERT INTO historial_precios (id_producto, precio_anterior, precio_nuevo, id_usuario, fecha_cambio) VALUES (?, ?, ?, ?, NOW())',
                [id_producto, precio_anterior, precio_nuevo, id_usuario || null]
            );
            conn.release();
        }
        res.json({ mensaje: 'Historial registrado' });
    } catch (err) {
        console.error('Error historial:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// COMPRAS
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
        const { id_proveedor, id_usuario, numero_factura, productos, total } = req.body;

        if (!id_proveedor || !productos || productos.length === 0) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();
            const [result] = await conn.execute(
                'INSERT INTO compras (id_proveedor, id_usuario, fecha_compra) VALUES (?, ?, NOW())',
                [id_proveedor, id_usuario || null]
            );

            const id_compra = result.insertId;

            for (const item of productos) {
                // Actualizar stock del producto
                await conn.execute(
                    'UPDATE productos SET stock_actual = stock_actual + ? WHERE id_producto = ?',
                    [item.cantidad, item.id_producto]
                );
            }

            await conn.commit();
            conn.release();
            res.status(201).json({ id_compra, numero_factura: numero_factura || `COM-${id_compra}` });
        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    } catch (err) {
        console.error('Error POST compras:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/compras/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();
            
            // Eliminar compra
            await conn.execute('DELETE FROM compras WHERE id_compra = ?', [id]);
            
            await conn.commit();
            conn.release();
            res.json({ mensaje: 'Compra eliminada' });
        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    } catch (err) {
        console.error('Error DELETE compras:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// VENTAS
app.get('/api/ventas', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [data] = await conn.execute(`
            SELECT f.id_factura as id_venta, f.numero_factura, f.fecha_emision as fecha_venta, c.nombre_completo as cliente, f.total as total_venta, f.metodo_pago
            FROM facturas f
            LEFT JOIN clientes c ON f.id_cliente = c.id_cliente
            ORDER BY f.fecha_emision DESC
        `);
        conn.release();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { id_cliente, id_usuario, productos, total, metodo_pago } = req.body;

        if (!id_cliente || !productos || productos.length === 0) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();
            const numero_factura = `VNT-${Date.now()}`;
            const [result] = await conn.execute(
                'INSERT INTO facturas (id_cliente, id_usuario, numero_factura, total, metodo_pago, estado_factura, fecha_emision) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [id_cliente, id_usuario || null, numero_factura, total || 0, metodo_pago || 'efectivo', 'emitida']
            );

            const id_factura = result.insertId;

            for (const item of productos) {
                const subtotal_item = item.cantidad * item.precio_venta;
                await conn.execute(
                    'INSERT INTO detalles_factura (id_factura, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [id_factura, item.id_producto, item.cantidad, item.precio_venta, subtotal_item]
                );
                
                // Actualizar stock del producto
                await conn.execute(
                    'UPDATE productos SET stock_actual = stock_actual - ? WHERE id_producto = ?',
                    [item.cantidad, item.id_producto]
                );
            }

            await conn.commit();
            conn.release();
            res.status(201).json({ id_venta: id_factura, numero_factura });
        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    } catch (err) {
        console.error('Error POST ventas:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ventas/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const conn = await pool.getConnection();
        
        try {
            await conn.beginTransaction();
            
            // Restaurar stock de los productos
            const [detalles] = await conn.execute(
                'SELECT id_producto, cantidad FROM detalles_factura WHERE id_factura = ?',
                [id]
            );
            
            for (const detalle of detalles) {
                await conn.execute(
                    'UPDATE productos SET stock_actual = stock_actual + ? WHERE id_producto = ?',
                    [detalle.cantidad, detalle.id_producto]
                );
            }
            
            // Eliminar detalles
            await conn.execute('DELETE FROM detalles_factura WHERE id_factura = ?', [id]);
            
            // Marcar factura como cancelada/eliminada
            await conn.execute('UPDATE facturas SET estado_factura = ? WHERE id_factura = ?', ['cancelada', id]);
            
            await conn.commit();
            conn.release();
            res.json({ mensaje: 'Venta eliminada' });
        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    } catch (err) {
        console.error('Error DELETE ventas:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// HEALTH
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

// ROLES
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

// LOGIN (Testing endpoint)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const conn = await pool.getConnection();
        const [users] = await conn.execute('SELECT * FROM usuarios WHERE username = ? OR email = ?', [username, username]);
        conn.release();
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        const user = users[0];
        // Para testing, aceptar cualquier contraseña
        res.json({
            token: 'token_' + user.id_usuario,
            id_usuario: user.id_usuario,
            nombre_completo: user.nombre_completo,
            username: user.username,
            email: user.email,
            rol: user.rol
        });
    } catch (err) {
        console.error('Error login:', err.message);
        res.status(500).json({ error: 'Error en login', detail: err.message });
    }
});

module.exports = app;
