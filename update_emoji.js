const mysql = require('mysql2/promise');

const categoriaEmojis = {
  'Aceite': '🍳',
  'Papelería': '📚',
  'prueba1': '🧪'
};

(async () => {
  const conn = await mysql.createConnection({
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'k7vrnxBcf7mccfR.root',
    password: 'zNhNalRP8tNZBVAo',
    database: 'db_webcenter',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  
  console.log('\n🔄 Actualizando emojis en TiDB...\n');
  
  for (const [nombre, emoji] of Object.entries(categoriaEmojis)) {
    try {
      const [result] = await conn.execute(
        'UPDATE categorias SET emoji = ? WHERE nombre = ?',
        [emoji, nombre]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✓ ${emoji} ${nombre}`);
      } else {
        console.log(`  ⚠ ${nombre} no encontrada`);
      }
    } catch (e) {
      console.error(`  ✗ Error en ${nombre}:`, e.message);
    }
  }
  
  console.log('\n✓ Verificando cambios:\n');
  const [rows] = await conn.execute('SELECT id_categoria, nombre, emoji FROM categorias ORDER BY nombre');
  rows.forEach(r => {
    const emoji_display = r.emoji && r.emoji.trim() ? r.emoji : '❌ VACÍO';
    console.log(`  ${emoji_display} ${r.nombre}`);
  });
  
  await conn.end();
  console.log('\n✅ Completado');
})();
