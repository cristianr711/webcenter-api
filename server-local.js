const app = require('./api/index.js');
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`\n✓ Servidor local iniciado en http://localhost:${PORT}`);
    console.log(`✓ API en http://localhost:${PORT}/api\n`);
});
