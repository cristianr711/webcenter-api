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
    const [rows] = await pool.execute('SELECT id_usuario, username, nombre_completo FROM usuarios');
    console.log('Usuarios en la BD:');
    console.table(rows);
    process.exit(0);
})();
