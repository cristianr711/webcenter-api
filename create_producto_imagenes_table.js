const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'k7vrnxBcf7mccfR.root',
  password: 'zNhNalRP8tNZBVAo',
  database: 'db_webcenter',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  ssl: { minVersion: 'TLSv1.2' }
});

async function createTable() {
  try {
    const conn = await pool.getConnection();
    console.log('✓ Conectado a TiDB');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS producto_imagenes (
          id_imagen INT AUTO_INCREMENT PRIMARY KEY,
          id_producto INT NOT NULL,
          imagen_data MEDIUMBLOB NOT NULL,
          imagen_mime VARCHAR(100) DEFAULT 'image/webp',
          FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
      );
    `;
    
    await conn.execute(sql);
    console.log('✓ Tabla producto_imagenes creada correctamente');
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createTable();
