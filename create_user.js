const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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

async function createUser() {
    const conn = await mysql.createConnection(dbConfig);

    try {
        const email = 'cristian.ramirezfe@gmail.com';
        const password = 'cris12345';
        const nombre = 'Cristian Ramírez';
        const rol = 'admin';

        // Hashear la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        console.log(`\n--- INSERTANDO USUARIO ---`);
        console.log(`Email: ${email}`);
        console.log(`Nombre: ${nombre}`);
        console.log(`Rol: ${rol}`);

        // Insertar usuario
        const [result] = await conn.execute(
            `INSERT INTO usuarios (nombre_completo, username, password_hash, rol, estado) 
             VALUES (?, ?, ?, ?, 1)`,
            [nombre, email, passwordHash, rol]
        );

        console.log(`✅ Usuario creado exitosamente`);
        console.log(`ID: ${result.insertId}`);
        console.log(`\nYa puedes iniciar sesión con:`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔒 Contraseña: ${password}`);

        // Verificar que se insertó correctamente
        const [usuarios] = await conn.execute(
            `SELECT id_usuario, nombre_completo, username, rol FROM usuarios WHERE username = ?`,
            [email]
        );
        console.log(`\n--- VERIFICACIÓN ---`);
        console.table(usuarios);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

createUser();
