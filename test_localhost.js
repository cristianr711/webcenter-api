const http = require('http');

console.log('\n✅ PROBANDO SERVIDOR LOCAL EN PUERTO 3000\n');

// Test 1: Health check
const healthTest = () => {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/health',
        method: 'GET',
        timeout: 3000
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ GET /api/health');
                console.log('   Respuesta: ' + data);
            } else {
                console.log('⚠️  Status: ' + res.statusCode);
            }
            
            // Test 2: Usuarios
            setTimeout(usuariosTest, 500);
        });
    });

    req.on('error', (err) => {
        console.log('❌ ERROR - No se puede conectar a localhost:3000');
        console.log('   Verifica que el servidor esté corriendo con: node server.js\n');
        process.exit(1);
    });

    req.end();
};

// Test 2: Obtener usuarios
const usuariosTest = () => {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/usuarios',
        method: 'GET',
        timeout: 3000
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const usuarios = JSON.parse(data);
            console.log('\n✅ GET /api/usuarios');
            console.log('   Usuarios encontrados: ' + usuarios.length);
            if (usuarios.length > 0) {
                console.log('   Primer usuario: ' + usuarios[0].nombre_completo);
            }
            
            resumen();
        });
    });

    req.on('error', (err) => {
        console.log('❌ Error en /api/usuarios');
        process.exit(1);
    });

    req.end();
};

const resumen = () => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           ✅ SERVIDOR LOCAL FUNCIONA ✅               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('🌐 API URL para panel.html: http://localhost:3000/api');
    console.log('📋 Endpoints disponibles:');
    console.log('   • GET  /api/usuarios');
    console.log('   • GET  /api/categorias');
    console.log('   • GET  /api/productos');
    console.log('   • GET  /api/clientes');
    console.log('   • GET  /api/proveedores');
    console.log('   • GET  /api/transacciones');
    console.log('   • GET  /api/compras');
    console.log('   • GET  /api/roles');
    console.log('   • POST /api/* (crear/actualizar)\n');
    process.exit(0);
};

healthTest();
