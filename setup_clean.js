const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2' },
    multipleStatements: true
};

const SQL_SETUP = `
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    username VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE,
    id_rol INT NOT NULL DEFAULT 2,
    activo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE RESTRICT,
    INDEX idx_username (username)
);

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    emoji VARCHAR(10),
    activo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(50) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(30),
    direccion TEXT,
    ciudad VARCHAR(100),
    activo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    nit_documento VARCHAR(50) NOT NULL UNIQUE,
    nombre_razon_social VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(30),
    direccion TEXT,
    activo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_compra DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT DEFAULT 10,
    id_categoria INT,
    id_proveedor INT,
    imagen_principal MEDIUMBLOB,
    imagen_mime VARCHAR(100) DEFAULT 'image/webp',
    activo TINYINT DEFAULT 1,
    tiene_imagen TINYINT DEFAULT 0,
    url_imagen VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    id_usuario INT,
    numero_documento VARCHAR(100),
    subtotal DECIMAL(14,2) DEFAULT 0,
    impuesto DECIMAL(14,2) DEFAULT 0,
    total_venta DECIMAL(14,2) DEFAULT 0,
    metodo_pago ENUM('efectivo','transferencia','tarjeta','nequi','daviplata') DEFAULT 'efectivo',
    estado ENUM('pendiente','completada','cancelada') DEFAULT 'completada',
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS detalle_ventas (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS compras (
    id_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT,
    id_usuario INT NOT NULL,
    numero_factura_proveedor VARCHAR(100),
    subtotal DECIMAL(14,2) DEFAULT 0,
    impuesto DECIMAL(14,2) DEFAULT 0,
    total_compra DECIMAL(14,2) DEFAULT 0,
    estado ENUM('pendiente','recibida','parcial') DEFAULT 'pendiente',
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS detalle_compras (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS historial_precios (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    id_usuario INT,
    precio_anterior DECIMAL(12,2) NOT NULL,
    precio_nuevo DECIMAL(12,2) NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS facturas (
    id_factura INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    id_usuario INT,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
    impuesto DECIMAL(14,2) NOT NULL DEFAULT 0,
    total DECIMAL(14,2) NOT NULL DEFAULT 0,
    metodo_pago ENUM('efectivo','transferencia','tarjeta','nequi','daviplata') DEFAULT 'efectivo',
    estado_factura ENUM('emitida','pagada','anulada') DEFAULT 'emitida',
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS detalles_factura (
    id_detalle_factura INT AUTO_INCREMENT PRIMARY KEY,
    id_factura INT NOT NULL,
    id_producto INT,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (id_factura) REFERENCES facturas(id_factura) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS = 1;

INSERT IGNORE INTO roles (id_rol, nombre, descripcion) VALUES
(1, 'admin', 'Administrador del sistema'),
(2, 'cliente', 'Cliente estándar'),
(3, 'vendedor', 'Personal de ventas'),
(4, 'gerente', 'Gerente de ventas');
`;

async function setupDB() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado a TiDB');

        // Execute all SQL statements
        const results = await conn.query(SQL_SETUP);
        console.log('✅ Tablas creadas exitosamente');

        // Insert admin user
        const passwordHash = bcrypt.hashSync('cris12345', 10);
        await conn.execute(
            `INSERT INTO usuarios (id_usuario, nombre_completo, username, password_hash, email, id_rol, activo) 
             VALUES (?, ?, ?, ?, ?, 1, 1)
             ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
            [180001, 'Cristian Ramírez', 'cristian.ramirezfe@gmail.com', passwordHash, 'cristian.ramirezfe@gmail.com']
        );
        console.log('✅ Usuario admin creado');

        // Insert test data
        await conn.execute(
            `INSERT INTO categorias (nombre, descripcion, activo) 
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
            ['General', 'Categoría General']
        );

        await conn.execute(
            `INSERT INTO clientes (documento, nombre_completo, email, telefono, direccion, ciudad, activo) 
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE nombre_completo = VALUES(nombre_completo)`,
            ['1234567890', 'Test Cliente', 'test@example.com', '3001234567', 'Calle 1 # 1-1', 'Bogotá']
        );
        console.log('✅ Datos de prueba insertados');

        conn.end();
        console.log('✅ Setup completado exitosamente\n');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

setupDB();
