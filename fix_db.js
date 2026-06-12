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
        console.log('Conectado a la base de datos...');
        await dbPool.execute(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_data MEDIUMBLOB`);
        console.log('Agregada columna imagen_data');
        await dbPool.execute(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(100) DEFAULT 'image/webp'`);
        console.log('Agregada columna imagen_mime');
        
        console.log('¡Base de datos corregida exitosamente!');
        process.exit(0);
    } catch (e) {
        console.error('Error DB:', e.message);
        process.exit(1);
    }
})();
