// SQL Server pool; creates DB if missing, retries for Docker startup.
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'InterviewApp_Str0ng!',
  database: process.env.DB_NAME || 'TicketingDemo',
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: { max: 10, min: 0 },
};

let pool = null;

async function getTicketingPool() {
  if (pool && pool.config.database === config.database) return pool;
  const dbName = config.database;
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const masterConn = await sql.connect({ ...config, database: 'master' });
      await masterConn.request().query('SELECT 1');
      await masterConn.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbName}')
        CREATE DATABASE [${dbName}];
      `);
      await masterConn.close();
      pool = await sql.connect(config);
      return pool;
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Could not connect to SQL Server');
}

async function query(text, params = {}) {
  const p = await getTicketingPool();
  const req = p.request();
  Object.entries(params).forEach(([key, value]) => req.input(key, value));
  return req.query(text);
}

module.exports = { getTicketingPool, query, sql };
