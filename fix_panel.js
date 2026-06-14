const fs = require('fs');
let html = fs.readFileSync('panel.html', 'utf8');

// Replace all JSON.stringify occurrences inside template literals for openModal
html = html.replace(/\$\{JSON\.stringify\((p|c|u|v)\)\}/g, "${JSON.stringify($1).replace(/'/g, '&#39;')}");

// Also add cache-busting to all API_URL fetches just in case
html = html.replace(/fetch\(`\$\{API_URL\}\/(productos|categorias|clientes|proveedores|usuarios|ventas|compras)`\)/g, "fetch(`${API_URL}/$1?t=${Date.now()}`)");

fs.writeFileSync('panel.html', html);
console.log('Fixed panel.html');
