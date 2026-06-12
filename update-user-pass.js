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
    const hash = await bcrypt.hash('admin123', 10);
    
    // Update existing user
    await pool.execute(
        'UPDATE usuarios SET password_hash = ? WHERE username = ?',
        [hash, 'cristian.ramirezfe@gmail.com']
    );
    
    console.log('Usuario actualizado con contraseña: admin123');
    process.exit(0);
})();
