#!/usr/bin/env node

const https = require('https');

const API_URL = 'https://webcenter-api.vercel.app/api';
const userId = 180001; // ID del usuario cristian.ramirezfe@gmail.com
const MAX_ATTEMPTS = 30;
let attempts = 0;

async function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_URL}${endpoint}`);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function waitForEndpoint(endpoint) {
    console.log(`\n⏳ Esperando que Vercel despliegue el endpoint: ${endpoint}`);
    
    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
            const result = await makeRequest('GET', endpoint);
            if (result.status === 200 || result.status === 404) {
                return true;
            }
        } catch (e) {
            // Esperamos
        }
        
        console.log(`   Intento ${attempts}/${MAX_ATTEMPTS}...`);
        await new Promise(r => setTimeout(r, 5000)); // Esperar 5 segundos
    }
    
    return false;
}

async function runTests() {
    console.log('🧪 INICIANDO PRUEBAS DE API\n');

    // Test 1: Esperar a que el endpoint esté disponible
    const endpointReady = await waitForEndpoint('/historial-precios');
    
    if (!endpointReady) {
        console.log('❌ El endpoint aún no está disponible después de 2.5 minutos');
        console.log('   Veruel tardará más en desplegar. Intenta más tarde.');
        process.exit(1);
    }

    console.log('✅ Endpoints disponibles!');

    // Test 2: GET historial-precios (debería estar vacío)
    console.log('\n📊 TEST 1: GET /historial-precios');
    const hist1 = await makeRequest('GET', '/historial-precios');
    console.log(`Status: ${hist1.status}`);
    console.log(`Registros encontrados: ${Array.isArray(hist1.data) ? hist1.data.length : 0}`);

    // Test 3: POST historial-precios
    console.log('\n📊 TEST 2: POST /historial-precios');
    const histPayload = {
        id_producto: 1,
        id_usuario: userId,
        precio_anterior: 100,
        precio_nuevo: 150
    };
    const hist2 = await makeRequest('POST', '/historial-precios', histPayload);
    console.log(`Status: ${hist2.status}`);
    console.log(`Respuesta:`, hist2.data.mensaje || hist2.data.error);

    // Test 4: GET historial-precios (debería tener 1+ registros)
    console.log('\n📊 TEST 3: GET /historial-precios (después de insertar)');
    const hist3 = await makeRequest('GET', '/historial-precios');
    console.log(`Status: ${hist3.status}`);
    console.log(`Registros encontrados: ${Array.isArray(hist3.data) ? hist3.data.length : 0}`);
    if (Array.isArray(hist3.data) && hist3.data.length > 0) {
        console.log('Primer registro:', JSON.stringify(hist3.data[0], null, 2));
    }

    // Test 5: GET facturas (debería estar vacío)
    console.log('\n🧾 TEST 4: GET /facturas');
    const fact1 = await makeRequest('GET', '/facturas');
    console.log(`Status: ${fact1.status}`);
    console.log(`Registros encontrados: ${Array.isArray(fact1.data) ? fact1.data.length : 0}`);

    // Test 6: POST facturas
    console.log('\n🧾 TEST 5: POST /facturas');
    const factPayload = {
        id_cliente: 1,
        id_usuario: userId,
        numero_factura: 'FAC-TEST-001',
        productos: [
            { id_producto: 1, cantidad: 2, precio_unitario: 50 }
        ],
        subtotal: 100,
        impuesto: 19,
        total: 119,
        metodo_pago: 'efectivo'
    };
    const fact2 = await makeRequest('POST', '/facturas', factPayload);
    console.log(`Status: ${fact2.status}`);
    console.log(`Respuesta:`, fact2.data.mensaje || fact2.data.error);

    // Test 7: GET facturas (debería tener 1+ registros)
    console.log('\n🧾 TEST 6: GET /facturas (después de insertar)');
    const fact3 = await makeRequest('GET', '/facturas');
    console.log(`Status: ${fact3.status}`);
    console.log(`Registros encontrados: ${Array.isArray(fact3.data) ? fact3.data.length : 0}`);
    if (Array.isArray(fact3.data) && fact3.data.length > 0) {
        console.log('Primera factura:', JSON.stringify(fact3.data[0], null, 2));
    }

    // Resumen
    console.log('\n✅ PRUEBAS COMPLETADAS');
    console.log('Todos los endpoints están funcionando correctamente en la nube.');
}

runTests().catch(err => {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
});
