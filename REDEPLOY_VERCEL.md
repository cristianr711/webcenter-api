# 🚀 Redeploy Backend en Vercel

## Estado Actual

✅ Backend funcionando en **localhost:3000**
✅ Panel.html actualizado para usar localhost
✅ Código listo para GitHub y Vercel

---

## Pasos para Redeploy Permanente

### 1️⃣ Preparar Repositorio en GitHub

```bash
# En la carpeta con los archivos
git init
git add .
git commit -m "Backend webcenter-api listo para Vercel"
git branch -M main
git remote add origin https://github.com/cristianr711/webcenter-api.git
git push -u origin main
```

### 2️⃣ Conectar en Vercel

1. Ve a: https://vercel.com/cristianramirezfe-gmailcoms-projects/webcenter-api
2. Click en "Import Project"
3. Selecciona el repositorio: `cristianr711/webcenter-api`
4. Vercel detectará automáticamente que es un proyecto Node.js

### 3️⃣ Configurar Variables de Entorno

En Vercel, va a: **Settings → Environment Variables**

Agrega estas variables:
```
DB_HOST = gateway01.us-east-1.prod.aws.tidbcloud.com
DB_PORT = 4000
DB_USER = k7vrnxBcf7mccfR.root
DB_PASS = zNhNalRP8tNZBVAo
DB_NAME = db_webcenter
NODE_ENV = production
```

### 4️⃣ Redeploy Automático

Vercel se redeploy automáticamente cuando:
- Haces push a main
- O puedes hacer redeploy manual en Vercel dashboard

---

## Después del Redeploy

Una vez que Vercel despliegue, actualiza panel.html:

```javascript
const API_URL = 'https://webcenter-api.vercel.app/api';
```

---

## Archivos Necesarios para Vercel

```
webcenter-api/
├── server.js             ✅ Backend principal
├── package.json          ✅ Dependencias
├── .env                  ✅ Variables de entorno
├── .gitignore            ✅ Ignorar node_modules
└── node_modules/         ❌ No subirlo a Git
```

---

## Comandos Git para Push

```bash
# 1. Inicializar Git (si no está)
git init

# 2. Agregar todos los archivos
git add .

# 3. Commit
git commit -m "Backend webcenter-api v1.0"

# 4. Conectar con GitHub
git remote add origin https://github.com/cristianr711/webcenter-api.git

# 5. Push a main
git push -u origin main

# Para futuros cambios:
git add .
git commit -m "Descripción de cambios"
git push origin main
```

---

## Crear .gitignore

Crea un archivo `.gitignore` en la carpeta:

```
node_modules/
.env
.env.local
.DS_Store
*.log
```

---

## Verificación Final

Una vez desplegado en Vercel, prueba:

```
GET https://webcenter-api.vercel.app/api/health
```

Debe responder:
```json
{
  "status": "OK",
  "database": "Connected"
}
```

---

## URL Final de Producción

```
https://webcenter-api.vercel.app/api
```

Endpoints disponibles:
- `/usuarios` - Gestión de usuarios
- `/categorias` - Categorías de productos
- `/productos` - Productos
- `/clientes` - Clientes
- `/proveedores` - Proveedores
- `/transacciones` - Ventas/Facturas
- `/compras` - Compras
- `/roles` - Roles de usuarios
- `/health` - Estado de la API
