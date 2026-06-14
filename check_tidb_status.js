const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
};

(async () => {
    const conn = await mysql.createConnection(dbConfig);
    
    console.log('\n✅ VERIFICANDO ESTADO EN TIDB WORKBENCH:\n');
    
    // Listar todas las tablas
    const [tablas] = await conn.execute(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        ORDER BY TABLE_NAME
    `);
    
    // Tablas optimizadas esperadas
    const tablasOptimizadas = ['roles', 'usuarios', 'categorias', 'productos', 'clientes', 'transacciones', 'detalle_transacciones'];
    const tablasBackup = tablas.filter(t => t.TABLE_NAME.includes('_OLD'));
    
    console.log('📊 TABLAS OPTIMIZADAS (ACTIVAS EN PRODUCCIÓN):');
    tablasOptimizadas.forEach(tn => {
        const existe = tablas.find(t => t.TABLE_NAME === tn);
        console.log(`  ${existe ? '✅' : '❌'} ${tn}`);
    });
    
    console.log(`\n📦 RESPALDOS DE SEGURIDAD: ${tablasBackup.length} tablas guardadas`);
    
    // Datos migrados
    const [usuariosData] = await conn.execute('SELECT COUNT(*) as qty FROM usuarios');
    const [productosData] = await conn.execute('SELECT COUNT(*) as qty FROM productos');
    const [transaccionesData] = await conn.execute('SELECT COUNT(*) as qty FROM transacciones');
    const [rolesData] = await conn.execute('SELECT COUNT(*) as qty FROM roles');
    
    console.log(`\n📈 DATOS EN TIDB:`);
    console.log(`  • Roles: ${rolesData[0].qty}`);
    console.log(`  • Usuarios: ${usuariosData[0].qty}`);
    console.log(`  • Productos: ${productosData[0].qty}`);
    console.log(`  • Transacciones: ${transaccionesData[0].qty}`);
    
    console.log(`\n✅ BASE DE DATOS OPTIMIZADA - EN TIDB WORKBENCH\n`);
    
    await conn.end();
    process.exit(0);
})();
