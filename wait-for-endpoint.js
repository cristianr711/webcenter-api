#!/usr/bin/env node
// Test de endpoints con reintentos
const https = require('https');

const API_URL = 'https://webcenter-api.vercel.app/api';
const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutos
const RETRY_INTERVAL = 15 * 1000; // Cada 15 segundos
const START_TIME = Date.now();

function makeRequest(method, endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_URL}${endpoint}`);
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => resolve({ status: 0, error: err.message }));
        req.setTimeout(5000);
        req.end();
    });
}

async function waitForEndpoint() {
    console.log('⏳ Esperando que Vercel despliegue los endpoints...\n');
    
    while (Date.now() - START_TIME < MAX_WAIT_TIME) {
        const result = await makeRequest('GET', '/historial-precios');
        
        if (result.status === 200) {
            console.log('✅ ¡Vercel desplegó correctamente!');
            console.log('   Status: 200 OK');
            console.log(`   Respuesta: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
            return true;
        }
        
        const elapsed = Math.round((Date.now() - START_TIME) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        console.log(`⏱️  ${minutes}m ${seconds}s - Esperando... (Status: ${result.status})`);
        
        await new Promise(r => setTimeout(r, RETRY_INTERVAL));
    }
    
    console.log('❌ Tiempo agotado. Vercel tardó demasiado en desplegar.');
    return false;
}

waitForEndpoint().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
