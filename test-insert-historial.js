const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

(async () => {
    try {
        // First check if product 1 exists
        const [products] = await pool.execute('SELECT id_producto FROM productos LIMIT 1');
        console.log('Productos en BD:', products.length > 0 ? products[0] : 'NINGUNO');
        
        if (products.length === 0) {
            console.log('No hay productos, creando uno...');
            await pool.execute(
                'INSERT INTO productos (nombre, precio_venta, stock_actual) VALUES (?, ?, ?)',
                ['Producto Test', 100, 10]
            );
        }
        
        // Now try to insert into historial_precios
        console.log('\nIntentando insertar en historial_precios con:');
        console.log('  id_producto: 1');
        console.log('  id_usuario: 180001');
        console.log('  precio_anterior: 100');
        console.log('  precio_nuevo: 150');
        
        await pool.execute(
            'INSERT INTO historial_precios (id_producto, id_usuario, precio_anterior, precio_nuevo) VALUES (?, ?, ?, ?)',
            [1, 180001, 100, 150]
        );
        
        console.log('✓ Inserción exitosa!');
        
        // Verify
        const [rows] = await pool.execute('SELECT * FROM historial_precios ORDER BY id_historial DESC LIMIT 1');
        console.log('\nÚltimo registro:');
        console.table(rows);
        
    } catch (e) {
        console.error('ERROR:', e.message);
        console.error('Código:', e.code);
        console.error('SQL:', e.sql);
    }
    
    process.exit(0);
})();
