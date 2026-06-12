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
        const [rows] = await dbPool.execute(`
            SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, p.stock_actual,
                   p.id_categoria, p.url_imagen,
                   (p.imagen_data IS NOT NULL) AS tiene_imagen,
                   c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.estado = 1 ORDER BY p.id_producto DESC`);
        console.log('Exito:', rows.length);
        process.exit(0);
    } catch (e) {
        console.error('Error DB:', e.message);
        process.exit(1);
    }
})();
