#!/usr/bin/env node
const https = require('https');

function request(endpoint) {
    return new Promise((resolve) => {
        const url = new URL(`https://webcenter-api.vercel.app${endpoint}`);
        const req = https.request(url, { method: 'GET' }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', () => resolve({ status: 0, error: 'Connection failed' }));
        req.setTimeout(8000);
        req.end();
    });
}

async function test() {
    console.log('🔍 Testing Vercel API...\n');
    
    // Test 1: Health endpoint
    console.log('📊 Test 1: GET /api/health');
    let health = await request('/api/health');
    console.log(`   Status: ${health.status}`);
    if (health.data?.newEndpoints) {
        console.log(`   ✅ Marker found: ${health.data.newEndpoints}`);
    } else {
        console.log(`   ⚠️  Marker not found yet`);
    }
    console.log(`   Data:`, JSON.stringify(health.data, null, 2).substring(0, 150));
    
    // Test 2: New historial endpoint
    console.log('\n📊 Test 2: GET /api/historial-precios');
    let historial = await request('/api/historial-precios');
    console.log(`   Status: ${historial.status}`);
    if (historial.status === 200) {
        console.log(`   ✅ Endpoint is LIVE! Found ${Array.isArray(historial.data) ? historial.data.length : 0} records`);
    } else {
        console.log(`   ❌ Still getting ${historial.status} error`);
    }
    
    // Test 3: New facturas endpoint
    console.log('\n📊 Test 3: GET /api/facturas');
    let facturas = await request('/api/facturas');
    console.log(`   Status: ${facturas.status}`);
    if (facturas.status === 200) {
        console.log(`   ✅ Endpoint is LIVE! Found ${Array.isArray(facturas.data) ? facturas.data.length : 0} records`);
    } else {
        console.log(`   ❌ Still getting ${facturas.status} error`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (historial.status === 200 && facturas.status === 200) {
        console.log('✅ ALL ENDPOINTS WORKING! Ready to test.');
    } else {
        console.log('❌ Endpoints still not available. Vercel may still be deploying.');
    }
}

test();
