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
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0
};

async function runSetup() {
    try {
        const conn = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado a TiDB');

        // Read and execute setup_tidb_optimizado.sql
        const sql = fs.readFileSync('./setup_tidb_optimizado.sql', 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
        
        for (const stmt of statements) {
            try {
                await conn.execute(stmt);
                console.log('✅ ' + stmt.substring(0, 50) + '...');
            } catch (err) {
                if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
                    console.error('❌ Error:', err.message);
                }
            }
        }

        conn.end();
        console.log('\n✅ Setup completado');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

runSetup();
