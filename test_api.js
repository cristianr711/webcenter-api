const https = require('https');

console.log('\n🔍 VERIFICANDO DISPONIBILIDAD DE API:\n');

const options = {
    hostname: 'webcenter-api.vercel.app',
    port: 443,
    path: '/api/usuarios',
    method: 'GET',
    timeout: 5000
};

const req = https.request(options, (res) => {
    if (res.statusCode === 200 || res.statusCode === 401) {
        console.log('✅ API DISPONIBLE EN VERCEL');
        console.log('   Status: ' + res.statusCode);
        console.log('   URL: https://webcenter-api.vercel.app/api\n');
    } else if (res.statusCode === 500) {
        console.log('⚠️  API DISPONIBLE PERO CON ERROR INTERNO (500)');
        console.log('   Status: 500');
        console.log('   Posible causa: La API no puede conectar a TiDB\n');
    } else {
        console.log('⚠️  API RETORNA: ' + res.statusCode + '\n');
    }
    
    process.exit(0);
});

req.on('error', (err) => {
    if (err.code === 'ENOTFOUND') {
        console.log('❌ API NO DISPONIBLE');
        console.log('   Error: No se puede resolver webcenter-api.vercel.app');
        console.log('   Solución: Verifica la URL o redeploy el backend\n');
    } else if (err.code === 'ETIMEDOUT') {
        console.log('❌ TIMEOUT - API NO RESPONDE');
        console.log('   Error: La API tardó más de 5 segundos\n');
    } else {
        console.log('❌ ERROR: ' + err.message + '\n');
    }
    process.exit(1);
});

req.end();
