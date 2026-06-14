const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2' },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true
};

async function populateData() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado a TiDB');

        // Insert roles
        console.log('Insertando roles...');
        await conn.execute(`
            INSERT INTO roles (id_rol, nombre, descripcion) VALUES
            (1, 'admin', 'Administrador del sistema'),
            (2, 'cliente', 'Cliente estándar'),
            (3, 'vendedor', 'Personal de ventas'),
            (4, 'gerente', 'Gerente de ventas')
            ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
        `);

        // Insert admin user
        console.log('Insertando usuario admin...');
        const passwordHash = bcrypt.hashSync('cris12345', 10);
        await conn.execute(`
            INSERT INTO usuarios (id_usuario, nombre_completo, username, password_hash, email, id_rol, activo, created_at) 
            VALUES (180001, 'Cristian Ramírez', 'cristian.ramirezfe@gmail.com', ?, 'cristian.ramirezfe@gmail.com', 1, 1, NOW())
            ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
        `, [passwordHash]);

        // Insert test categoria
        console.log('Insertando categoría test...');
        await conn.execute(`
            INSERT INTO categorias (nombre, descripcion, activo, created_at) 
            VALUES ('General', 'Categoría General', 1, NOW())
            ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
        `);

        // Insert test cliente
        console.log('Insertando cliente test...');
        await conn.execute(`
            INSERT INTO clientes (documento, nombre_completo, email, telefono, direccion, ciudad, activo, created_at) 
            VALUES ('1234567890', 'Test Cliente', 'test@example.com', '3001234567', 'Calle 1 # 1-1', 'Bogotá', 1, NOW())
            ON DUPLICATE KEY UPDATE nombre_completo = VALUES(nombre_completo)
        `);

        // Insert test product
        console.log('Insertando producto test...');
        await conn.execute(`
            INSERT INTO productos (nombre, descripcion, precio_venta, precio_compra, stock_actual, stock_minimo, id_categoria, activo, created_at) 
            VALUES ('Producto Test', 'Producto de prueba', 50000, 25000, 10, 5, 1, 1, NOW())
            ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
        `);

        conn.end();
        console.log('\n✅ Base de datos poblada exitosamente');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

populateData();
