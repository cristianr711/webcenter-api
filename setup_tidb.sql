-- =============================================================
-- WEBCENTER - SETUP COMPLETO TIDB (sin Oracle)
-- Ejecutar en: TiDB Cloud > SQL Editor > db_webcenter
-- =============================================================

-- 1. CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    nit_documento VARCHAR(50) NOT NULL UNIQUE,
    nombre_razon_social VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(30),
    direccion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCTOS (con imagen almacenada en TiDB, sin Oracle)
CREATE TABLE IF NOT EXISTS productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_compra DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_actual INT NOT NULL DEFAULT 0,
    id_categoria INT,
    id_proveedor INT,
    -- Imagen guardada directamente en TiDB (reemplaza Oracle Bucket)
    imagen_data MEDIUMBLOB,
    imagen_mime VARCHAR(100) DEFAULT 'image/webp',
    -- url_imagen se mantiene como fallback para imÃ¡genes ya existentes en Oracle
    url_imagen VARCHAR(500),
    estado TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE SET NULL
);

-- 4. USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    username VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
    estado TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(50) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    telefono VARCHAR(30),
    direccion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. VENTAS
CREATE TABLE IF NOT EXISTS ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    id_usuario INT,
    total_venta DECIMAL(14,2) NOT NULL DEFAULT 0,
    metodo_pago ENUM('efectivo','transferencia','tarjeta','nequi','daviplata') DEFAULT 'efectivo',
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- 7. DETALLE DE VENTAS
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

-- 8. COMPRAS
CREATE TABLE IF NOT EXISTS compras (
    id_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT,
    id_usuario INT,
    numero_factura_proveedor VARCHAR(100),
    total_compra DECIMAL(14,2) NOT NULL DEFAULT 0,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- 9. DETALLE DE COMPRAS
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

-- =============================================================
-- Si la tabla PRODUCTOS ya existe, agrega las columnas de imagen:
-- (Ejecuta solo si la tabla ya existe y NO tiene esas columnas)
-- =============================================================
-- ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_data MEDIUMBLOB;
-- ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(100) DEFAULT 'image/webp';

-- =============================================================
-- TABLA PARA MÚLTIPLES IMÁGENES POR PRODUCTO
-- =============================================================
CREATE TABLE IF NOT EXISTS producto_imagenes (
    id_imagen INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    imagen_data MEDIUMBLOB NOT NULL,
    imagen_mime VARCHAR(100) DEFAULT 'image/webp',
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
);
