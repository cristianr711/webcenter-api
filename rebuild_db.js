const mysql = require('mysql2/promise');
const fs = require('fs');

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

async function runSetup() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado a TiDB');

        // Drop old tables first
        const dropStatements = [
            'SET FOREIGN_KEY_CHECKS = 0',
            'DROP TABLE IF EXISTS detalles_factura',
            'DROP TABLE IF EXISTS facturas',
            'DROP TABLE IF EXISTS historial_precios',
            'DROP TABLE IF EXISTS detalle_compras',
            'DROP TABLE IF EXISTS compras',
            'DROP TABLE IF EXISTS detalle_transacciones',
            'DROP TABLE IF EXISTS transacciones',
            'DROP TABLE IF EXISTS detalle_ventas',
            'DROP TABLE IF EXISTS detalles_factura',
            'DROP TABLE IF EXISTS ventas',
            'DROP TABLE IF EXISTS detalle_compras',
            'DROP TABLE IF EXISTS compras',
            'DROP TABLE IF EXISTS producto_imagenes',
            'DROP TABLE IF EXISTS productos',
            'DROP TABLE IF EXISTS clientes',
            'DROP TABLE IF EXISTS usuarios',
            'DROP TABLE IF EXISTS proveedores',
            'DROP TABLE IF EXISTS categorias',
            'DROP TABLE IF EXISTS roles',
            'SET FOREIGN_KEY_CHECKS = 1'
        ];

        for (const stmt of dropStatements) {
            try {
                await conn.execute(stmt);
                console.log('✅ Dropped: ' + stmt.substring(0, 40));
            } catch (err) {
                // Ignore errors on drop
            }
        }

        // Read and execute setup_tidb_optimizado.sql
        const sql = fs.readFileSync('./setup_tidb_optimizado.sql', 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
        
        for (const stmt of statements) {
            try {
                await conn.execute(stmt);
                console.log('✅ ' + stmt.substring(0, 50).replace(/\n/g, ' ') + '...');
            } catch (err) {
                if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
                    console.error('❌ Error:', err.message);
                }
            }
        }

        conn.end();
        console.log('\n✅ Setup completado exitosamente');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

runSetup();
