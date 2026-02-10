// DB init: schema + seed on first startup (called from server.js).
const fs = require('fs');
const path = require('path');
const { getTicketingPool, sql } = require('../db');

async function runFile(pool, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const batches = content
    .split(/\bGO\s*$/gim)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const batch of batches) {
    if (batch.toUpperCase().includes('USE ')) continue;
    try {
      await pool.request().query(batch);
    } catch (err) {
      if (!String(err.message).includes('already exists') && !String(err.message).includes('duplicate')) {
        console.error('Batch error:', err.message);
        throw err;
      }
    }
  }
}

async function main() {
  const pool = await getTicketingPool();
  await initSchema(pool);
  await initSeed(pool);
  console.log('DB initialized.');
  process.exit(0);
}

async function initSchema(pool) {
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, '../sql/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const batches = schema.split(/\bGO\s*$/gim).map((s) => s.trim()).filter(Boolean);
  for (const batch of batches) {
    if (batch.toUpperCase().startsWith('USE ') || batch.toUpperCase().includes('CREATE DATABASE')) continue;
    try {
      await pool.request().query(batch);
    } catch (e) {
      if (!String(e.message).includes('already exists')) console.error(e.message);
    }
  }
}

async function initSeed(pool) {
  const fs = require('fs');
  const path = require('path');
  const seedPath = path.join(__dirname, '../sql/seed.sql');
  const seed = fs.readFileSync(seedPath, 'utf8');
  const batches = seed.split(/\bGO\s*$/gim).map((s) => s.trim()).filter(Boolean);
  for (const batch of batches) {
    if (batch.toUpperCase().startsWith('USE ')) continue;
    try {
      await pool.request().query(batch);
    } catch (e) {
      if (!String(e.message).includes('duplicate') && !String(e.message).includes('IDENTITY_INSERT')) {
        console.error(e.message);
      }
    }
  }
}

module.exports = { initSchema, initSeed };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
