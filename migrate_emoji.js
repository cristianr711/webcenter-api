const mysql = require('mysql2/promise');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
        port: 4000,
        user: 'k7vrnxBcf7mccfR.root',
        password: 'zNhNalRP8tNZBVAo',
        database: 'db_webcenter',
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
        console.log('✓ Conectado a TiDB');
        
        const [result] = await connection.execute(
            'ALTER TABLE categorias ADD COLUMN IF NOT EXISTS emoji VARCHAR(10) DEFAULT \'\''
        );
        
        console.log('✓ Migración ejecutada exitosamente');
        console.log('✓ Columna emoji agregada a tabla categorias');
        
        // Verificar que la columna existe
        const [columns] = await connection.execute(
            "DESCRIBE categorias"
        );
        
        console.log('\n✓ Estructura actualizada de tabla categorias:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type}`);
        });
        
    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await connection.end();
        console.log('\n✓ Conexión cerrada');
    }
}

runMigration();
