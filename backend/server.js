// Ticketing API – Express, T-SQL, SQL Server. Serves frontend + REST (events, venues, tickets, ETL).
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getTicketingPool, query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
const frontendPath = path.join(__dirname, 'frontend');
const frontendAlt = path.join(__dirname, '../frontend');
app.use(express.static(fs.existsSync(frontendPath) ? frontendPath : frontendAlt));

// GET /api/venues
app.get('/api/venues', async (req, res) => {
  try {
    const result = await query(
      'SELECT Id, Name, City, Capacity FROM dbo.Venues ORDER BY Name'
    );
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events
app.get('/api/events', async (req, res) => {
  try {
    const result = await query(`
      SELECT e.Id, e.VenueId, e.Title, e.EventDate, e.Status,
             v.Name AS VenueName, v.City
      FROM dbo.Events e
      INNER JOIN dbo.Venues v ON e.VenueId = v.Id
      ORDER BY e.EventDate
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events
app.post('/api/events', async (req, res) => {
  try {
    const venueId = parseInt(req.body.venueId, 10);
    const title = String(req.body.title || '').trim();
    const eventDate = req.body.eventDate;
    if (!venueId || !title || !eventDate) {
      return res.status(400).json({ error: 'venueId, title and eventDate are required' });
    }
    const pool = await getTicketingPool();
    const result = await pool.request()
      .input('venueId', venueId)
      .input('title', title)
      .input('eventDate', new Date(eventDate))
      .query(`
        INSERT INTO dbo.Events (VenueId, Title, EventDate, Status)
        OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.EventDate, INSERTED.Status
        VALUES (@venueId, @title, @eventDate, 'OnSale')
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/etl/events
app.post('/api/etl/events', async (req, res) => {
  try {
    const raw = Array.isArray(req.body) ? req.body : req.body.items || [];
    const items = raw.map(row => ({
      venueId: parseInt(row.venueId || row.VenueId, 10),
      title: String(row.title || row.Title || '').trim(),
      eventDate: row.eventDate || row.EventDate,
    })).filter(x => x.venueId && x.title && x.eventDate);
    if (!items.length) {
      return res.status(400).json({ error: 'Provide an array with venueId, title, eventDate' });
    }
    const pool = await getTicketingPool();
    const inserted = [];
    for (const x of items) {
      const result = await pool.request()
        .input('venueId', x.venueId)
        .input('title', x.title)
        .input('eventDate', new Date(x.eventDate))
        .query(`
          INSERT INTO dbo.Events (VenueId, Title, EventDate, Status)
          OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.EventDate
          VALUES (@venueId, @title, @eventDate, 'OnSale')
        `);
      inserted.push(result.recordset[0]);
    }
    res.json({ loaded: inserted.length, events: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/ticket-summary
app.get('/api/events/ticket-summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT e.Id, e.Title, e.EventDate, e.Status,
             v.Name AS VenueName, v.City,
             COUNT(t.Id) AS TicketCount,
             ISNULL(SUM(t.Total), 0) AS TotalRevenue
      FROM dbo.Events e
      INNER JOIN dbo.Venues v ON e.VenueId = v.Id
      LEFT JOIN dbo.Tickets t ON t.EventId = e.Id
      GROUP BY e.Id, e.Title, e.EventDate, e.Status, v.Name, v.City
      ORDER BY e.EventDate
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const result = await query(`
      SELECT t.Id, t.EventId, t.CustomerName, t.Quantity, t.Total,
             e.Title AS EventTitle, e.EventDate
      FROM dbo.Tickets t
      INNER JOIN dbo.Events e ON t.EventId = e.Id
      ORDER BY t.Id DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets
app.post('/api/tickets', async (req, res) => {
  try {
    const eventId = parseInt(req.body.eventId, 10);
    const customerName = String(req.body.customerName || '').trim();
    const quantity = parseInt(req.body.quantity, 10) || 1;
    const total = parseFloat(req.body.total) || 0;
    if (!eventId || !customerName) {
      return res.status(400).json({ error: 'eventId and customerName are required' });
    }
    const pool = await getTicketingPool();
    const result = await pool.request()
      .input('eventId', eventId)
      .input('customerName', customerName)
      .input('quantity', quantity)
      .input('total', total)
      .query(`
        INSERT INTO dbo.Tickets (EventId, CustomerName, Quantity, Total)
        OUTPUT INSERTED.Id, INSERTED.EventId, INSERTED.CustomerName, INSERTED.Quantity, INSERTED.Total
        VALUES (@eventId, @customerName, @quantity, @total)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: err.message });
  }
});

// Ensure DB has schema + seed on first run
async function ensureDb() {
  const pool = await getTicketingPool();
  const r = await pool.request().query(
    "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Tickets'"
  );
  if (r.recordset.length === 0) {
    const init = require('./scripts/init-db');
    await init.initSchema(pool);
    await init.initSeed(pool);
    console.log('Database schema and seed applied.');
  }
}

ensureDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Interview API running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
