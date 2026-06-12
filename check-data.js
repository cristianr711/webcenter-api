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
    // Check all tables
    const tables = ['productos', 'categorias', 'clientes', 'usuarios'];
    
    for (const table of tables) {
        const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${rows[0].count} registros`);
    }
    
    // Show first product
    const [prods] = await pool.execute('SELECT * FROM productos LIMIT 1');
    if (prods.length > 0) {
        console.log('\nPrimer producto:', prods[0]);
    } else {
        console.log('\n❌ NO HAY PRODUCTOS');
    }
    
    process.exit(0);
})();
