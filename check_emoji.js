const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  
  const [rows] = await conn.execute('SELECT id_categoria, nombre, emoji FROM categorias ORDER BY nombre');
  console.log('\n✓ Categorías actuales en TiDB:\n');
  rows.forEach(r => {
    const emoji_display = r.emoji && r.emoji.trim() ? r.emoji : '❌ VACÍO';
    console.log(`  ${emoji_display} ID ${r.id_categoria}: ${r.nombre}`);
  });
  
  await conn.end();
})();
