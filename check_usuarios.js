const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
};

async function check() {
    const conn = await mysql.createConnection(dbConfig);

    console.log(`\n--- USUARIOS EN BD ---`);
    const [usuarios] = await conn.execute(`SELECT id_usuario, nombre_completo, username, rol, estado FROM usuarios`);
    console.table(usuarios);

    console.log(`\n--- CANTIDAD DE USUARIOS ---`);
    const [count] = await conn.execute(`SELECT COUNT(*) as total FROM usuarios`);
    console.log(count);

    process.exit();
}
check().catch(err => { console.error(err); process.exit(1); });
