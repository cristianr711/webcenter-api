-- =============================================================
-- WEBCENTER - SETUP OPTIMIZADO SIN REDUNDANCIAS
-- Problemas solucionados:
-- 1. Consolidadas tablas VENTAS y FACTURAS en una sola
-- 2. Eliminados detalles_factura redundantes
-- 3. Normalizado manejo de imágenes
-- 4. Agregados índices para performance
-- 5. Mejorada estructura de usuarios con tabla de roles
-- =============================================================

-- 1. ROLES (Nueva tabla para mejor gestión de permisos)
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- 3. PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    nit_documento VARCHAR(50) NOT NULL UNIQUE,
    nombre_razon_social VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(30),
    direccion TEXT,
    activo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nit (nit_documento),
    INDEX idx_email (email)
);

-- 4. USUARIOS (Optimizado con FK a roles)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    username VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE,
    id_rol INT NOT NULL DEFAULT 2,
    activo TINYINT DEFAULT 1,
    ultimo_acceso TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE RESTRICT,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_activo (activo)
);

-- 5. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(50) NOT NULL UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(30),
    direccion TEXT,
    ciudad VARCHAR(100),
    activo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_documento (documento),
    INDEX idx_nombre (nombre_completo),
    INDEX idx_email (email)
);

-- 6. PRODUCTOS (Sin redundancia de imágenes)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
    INDEX idx_nombre (nombre),
    INDEX idx_categoria (id_categoria),
    INDEX idx_proveedor (id_proveedor),
    INDEX idx_activo (activo)
);

-- 7. IMAGENES ADICIONALES DE PRODUCTOS (Solo para múltiples imágenes)
CREATE TABLE IF NOT EXISTS producto_imagenes (
    id_imagen INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    imagen_data MEDIUMBLOB NOT NULL,
    imagen_mime VARCHAR(100) DEFAULT 'image/webp',
    posicion INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
    INDEX idx_producto (id_producto),
    INDEX idx_posicion (posicion)
);

-- 8. TRANSACCIONES UNIFICADAS (Consolidado: ventas + facturas)
-- Esta tabla reemplaza tanto ventas como facturas
CREATE TABLE IF NOT EXISTS transacciones (
    id_transaccion INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    id_usuario INT NOT NULL,
    numero_documento VARCHAR(50),
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
    impuesto DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_transaccion DECIMAL(14,2) NOT NULL DEFAULT 0,
    metodo_pago ENUM('efectivo','transferencia','tarjeta','nequi','daviplata') DEFAULT 'efectivo',
    estado ENUM('pendiente','completada','anulada') DEFAULT 'completada',
    tipo_documento ENUM('factura','nota_credito','remision') DEFAULT 'factura',
    fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    INDEX idx_cliente (id_cliente),
    INDEX idx_usuario (id_usuario),
    INDEX idx_fecha (fecha_transaccion),
    INDEX idx_estado (estado),
    INDEX idx_numero_doc (numero_documento)
);

-- 9. DETALLE DE TRANSACCIONES (Unificado: reemplaza detalle_ventas y detalles_factura)
CREATE TABLE IF NOT EXISTS detalle_transacciones (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_transaccion INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (id_transaccion) REFERENCES transacciones(id_transaccion) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT,
    INDEX idx_transaccion (id_transaccion),
    INDEX idx_producto (id_producto)
);

-- 10. COMPRAS A PROVEEDORES
CREATE TABLE IF NOT EXISTS compras (
    id_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT,
    id_usuario INT NOT NULL,
    numero_factura_proveedor VARCHAR(100),
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
    impuesto DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_compra DECIMAL(14,2) NOT NULL DEFAULT 0,
    estado ENUM('pendiente','recibida','parcial') DEFAULT 'pendiente',
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega TIMESTAMP NULL,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    INDEX idx_proveedor (id_proveedor),
    INDEX idx_usuario (id_usuario),
    INDEX idx_estado (estado),
    INDEX idx_fecha (fecha_compra)
);

-- 11. DETALLE DE COMPRAS
CREATE TABLE IF NOT EXISTS detalle_compras (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT,
    INDEX idx_compra (id_compra),
    INDEX idx_producto (id_producto)
);

-- 12. HISTORIAL DE PRECIOS
CREATE TABLE IF NOT EXISTS historial_precios (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    id_usuario INT,
    precio_anterior DECIMAL(12,2) NOT NULL,
    precio_nuevo DECIMAL(12,2) NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_producto (id_producto),
    INDEX idx_usuario (id_usuario),
    INDEX idx_fecha (fecha_cambio)
);

-- =============================================================
-- INSERTAR ROLES POR DEFECTO
-- =============================================================
INSERT IGNORE INTO roles (id_rol, nombre, descripcion) VALUES
(1, 'admin', 'Administrador del sistema'),
(2, 'cliente', 'Cliente estándar'),
(3, 'vendedor', 'Personal de ventas'),
(4, 'gerente', 'Gerente de ventas');
