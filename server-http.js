const express = require('express');
const path = require('path');

const app = express();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`\n✓ Servidor HTTP iniciado en http://localhost:${PORT}`);
    console.log(`✓ Panel: http://localhost:${PORT}/panel.html`);
    console.log(`✓ Tienda: http://localhost:${PORT}/tienda.html\n`);
});
