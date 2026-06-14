const http = require('http');

const VERCEL_URL = 'https://webcenter-api.vercel.app';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║        🚀 VERIFICANDO DEPLOYMENT EN VERCEL 🚀          ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function testEndpoint(path) {
    return new Promise((resolve) => {
        const url = VERCEL_URL + path;
        console.log(`Testing: ${path}`);
        
        http.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ Status: ${res.statusCode}`);
                    console.log(`   Response: ${data.substring(0, 100)}...\n`);
                    resolve(true);
                } else {
                    console.log(`❌ Status: ${res.statusCode}\n`);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.log(`❌ Error: ${err.message}\n`);
            resolve(false);
        });
    });
}

async function verify() {
    console.log('📊 Verificando endpoints disponibles:\n');
    
    const endpoints = [
        '/api/health',
        '/api/usuarios',
        '/api/categorias',
        '/api/productos'
    ];
    
    let working = 0;
    
    for (const endpoint of endpoints) {
        if (await testEndpoint(endpoint)) {
            working++;
        }
    }
    
    console.log('════════════════════════════════════════════════════════\n');
    
    if (working === endpoints.length) {
        console.log('✅ ¡VERCEL ESTÁ FUNCIONANDO CORRECTAMENTE!\n');
        console.log('🎯 Próximo paso: Cambiar API_URL en panel.html');
        console.log('   De:  http://localhost:3000/api');
        console.log('   A:   https://webcenter-api.vercel.app/api\n');
    } else if (working > 0) {
        console.log('⚠️  VERCEL PARCIALMENTE FUNCIONAL\n');
        console.log('   Endpoints funcionando: ' + working + '/' + endpoints.length);
        console.log('   Verifica las variables de entorno en Vercel\n');
    } else {
        console.log('❌ VERCEL NO ESTÁ FUNCIONANDO\n');
        console.log('   1. Verifica que estés conectado a internet');
        console.log('   2. Revisa https://vercel.com/.../webcenter-api');
        console.log('   3. Verifica que el deployment sea "Ready"');
        console.log('   4. Revisa que las variables de entorno estén correctas\n');
    }
}

verify();
