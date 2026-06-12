const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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
        const hash = await bcrypt.hash('cris12345', 10);
        
        await pool.execute(
            'UPDATE usuarios SET password_hash = ? WHERE username = ?',
            [hash, 'cristian.ramirezfe@gmail.com']
        );
        
        console.log('✅ Contraseña actualizada correctamente');
        console.log('Usuario: cristian.ramirezfe@gmail.com');
        console.log('Contraseña: cris12345');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
