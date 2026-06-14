const mysql = require('mysql2/promise');
const crypto = require('crypto');

const dbConfig = {
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
};

// Función para hashear contraseñas
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

(async () => {
    try {
        const conn = await mysql.createConnection(dbConfig);
        
        console.log('\n🔐 ASIGNANDO CONTRASEÑAS A USUARIOS\n');
        
        // Obtener usuarios
        const [users] = await conn.execute('SELECT id_usuario, nombre_completo, username FROM usuarios WHERE password_hash IS NULL OR password_hash = ""');
        
        if (users.length === 0) {
            console.log('✅ Todos los usuarios ya tienen contraseña configurada\n');
            await conn.end();
            process.exit(0);
        }
        
        console.log('📋 Usuarios sin contraseña:\n');
        
        for (const user of users) {
            // La contraseña será el nombre de usuario (sin @)
            const password = user.username.split('@')[0];
            const passwordHash = hashPassword(password);
            
            await conn.execute(
                'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
                [passwordHash, user.id_usuario]
            );
            
            console.log('✅ ' + user.nombre_completo);
            console.log('   Usuario: ' + user.username);
            console.log('   Contraseña: ' + password);
            console.log('   ---');
        }
        
        console.log('\n✨ CONTRASEÑAS ESTABLECIDAS\n');
        console.log('💡 NOTA: Las contraseñas son los nombres de usuario (sin @)');
        console.log('   Ejemplo: cristian.ramirezfe@gmail.com → password: cristian.ramirezfe\n');
        
        await conn.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
