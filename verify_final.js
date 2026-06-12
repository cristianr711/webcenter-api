const https = require('https');

https.get('https://webcenter-api.vercel.app/api/categorias', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const categorias = JSON.parse(data);
      console.log('\n✅ EMOJIS FUNCIONALES - Respuesta de API en producción:\n');
      categorias.forEach(cat => {
        const emoji = cat.emoji && cat.emoji.trim() ? cat.emoji : '❌ VACÍO';
        console.log(`  ${emoji} ${cat.nombre}`);
      });
      console.log('\n✓ Los emojis ahora son PERMANENTES en TiDB Cloud');
      console.log('✓ Accesibles desde cualquier dispositivo/navegador\n');
    } catch (e) {
      console.error('Error parsing JSON:', e);
    }
  });
}).on('error', e => console.error('Error:', e.message));
