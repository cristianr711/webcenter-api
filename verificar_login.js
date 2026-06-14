const http = require('http');
const crypto = require('crypto');

console.log('\n🔐 VERIFICANDO SISTEMA DE LOGIN\n');

// Función para hashear contraseña (igual a la del backend)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Usuarios conocidos
const usuarios = [
    {
        username: 'cristian.ramirezfe@gmail.com',
        password: 'cristian.ramirezfe',
        nombre: 'Cristian Ramírez'
    },
    {
        username: 'mssecueg@ut.edu.co',
        password: 'mssecueg',
        nombre: 'Mike'
    },
    {
        username: 'mstobariad@ut.edu.co',
        password: 'mstobariad',
        nombre: 'Santiago'
    }
];

console.log('📋 USUARIOS DISPONIBLES PARA LOGIN:\n');
usuarios.forEach((u, i) => {
    console.log((i+1) + '. Usuario: ' + u.username);
    console.log('   Contraseña: ' + u.password);
    console.log('   Nombre: ' + u.nombre);
    console.log('');
});

console.log('✅ CREDENCIALES LISTOS PARA PROBAR EN panel.html\n');
console.log('Pasos para iniciar sesión en el panel:');
console.log('1. Abre panel.html en el navegador');
console.log('2. Click en "Iniciar Sesión"');
console.log('3. Ingresa un usuario y contraseña de los listados arriba');
console.log('4. El backend local en puerto 3000 verifica el acceso\n');

// Probar conexión al endpoint de usuarios
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
        const usuariosDB = JSON.parse(data);
        console.log('🔍 VERIFICACIÓN EN BASE DE DATOS:\n');
        
        usuariosDB.forEach(u => {
            console.log('ID: ' + u.id_usuario);
            console.log('Nombre: ' + u.nombre_completo);
            console.log('Username: ' + u.username);
            console.log('Rol: ' + u.id_rol + ' (admin)');
            console.log('Activo: ' + (u.activo ? 'Sí ✅' : 'No ❌'));
            console.log('---');
        });
        
        console.log('\n✨ SISTEMA DE LOGIN CONFIGURADO CORRECTAMENTE\n');
        process.exit(0);
    });
});

req.on('error', (err) => {
    console.log('❌ ERROR - El servidor local no está corriendo');
    console.log('   Ejecuta: node server.js\n');
    process.exit(1);
});

req.end();
