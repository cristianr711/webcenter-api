const mysql = require('mysql2/promise');
(async () => {
    try {
        const dbPool = mysql.createPool({
            host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: 4000,
            user: 'k7vrnxBcf7mccfR.root',
            password: 'zNhNalRP8tNZBVAo',
            database: 'db_webcenter',
            ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        });
        
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS producto_imagenes (
                id_imagen INT AUTO_INCREMENT PRIMARY KEY,
                id_producto INT NOT NULL,
                imagen_data MEDIUMBLOB NOT NULL,
                imagen_mime VARCHAR(100) DEFAULT 'image/webp',
                FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
            )
        `);
        console.log('Tabla producto_imagenes creada correctamente.');
        process.exit(0);
    } catch (e) {
        console.error('Error DB:', e.message);
        process.exit(1);
    }
})();
