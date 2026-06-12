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
    const [rows] = await pool.execute(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'historial_precios' AND TABLE_SCHEMA = 'db_webcenter'
    `);
    console.log('Estructura de historial_precios:');
    console.table(rows);
    
    // Check constraints
    const [constraints] = await pool.execute(`
        SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = 'historial_precios' AND TABLE_SCHEMA = 'db_webcenter'
    `);
    console.log('\nForeign keys:');
    console.table(constraints);
    
    process.exit(0);
})();
