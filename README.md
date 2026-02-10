# Interview Application – Technical Solutions Expert Demo

A **ticketing platform demo** built to showcase the skills required for the **AudienceView Technical Solutions Expert** role. **Events** take place at **venues**; customers buy **tickets**. All data is in **SQL Server**. You can view events and venues, see ticket sales, add an event, sell a ticket, or import events (ETL). It runs with **Docker** and demonstrates **SQL Server**, **Node.js**, **T-SQL**, **ETL**, and a **responsive Bootstrap** UI.

---

## Quick start

From the **Interview application** folder:

```bash
docker-compose up -d
```

**First time:** wait **~30–45 seconds** — SQL Server needs time to start, and the API runs `npm install` then connects (it retries automatically until the database is ready). Then open:

**http://localhost:3000**

Stop when done:

```bash
docker-compose down
```

No scripts required. Data is stored in Docker volumes and is kept between `up` and `down`.

**Interview PDFs / docs:** All PDF-ready documents (technologies & functions, system flow, schema, DB reference, app explanation) are in the **`docs/`** folder. Open any `.html` in a browser and use Ctrl+P → Save as PDF.

**Deploy on EC2:** See **[DEPLOY-EC2.md](DEPLOY-EC2.md)**.

---

## What’s in the app

| Component | Purpose |
|-----------|--------|
| **SQL Server** (Docker) | Database: `TicketingDemo` with **Venues**, **Events**, **Tickets**. T-SQL schema and seed. |
| **Node.js API** | REST API: events (with venue), venues, tickets; add event, sell ticket, ETL import events. |
| **Frontend** | Ticketing UI: upcoming events, venues, recent tickets; add event, sell ticket, import events (ETL). |

---

## How it maps to the job requirements

| Requirement | Where it’s shown |
|-------------|-------------------|
| **Microsoft SQL Server** | SQL Server 2022 in Docker; T-SQL in `sql/schema.sql`, `sql/seed.sql`; API uses `mssql` and raw T-SQL (JOINs, INSERT with OUTPUT). |
| **TSQL** | Schema (CREATE TABLE, IDENTITY, INDEX, FK), seed data, and all API queries (SELECT with JOINs, parameterized INSERT). |
| **Node.js** | Entire API: Express, connection pool, retry logic, ETL endpoint. |
| **JavaScript** | Frontend `app.js`: fetch, DOM updates, form handling. |
| **ETL (transformation & load)** | `POST /api/etl/events`: accepts JSON array of events (venueId, title, eventDate), loads into `Events` table. |
| **Responsive design, CSS, HTML, Bootstrap** | `frontend/index.html`: Bootstrap 5, simple task list UI. |
| **Docker** | `docker-compose.yml`: SQL Server + Node API; one command to run the stack. |

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check; confirms DB connection. |
| GET | `/api/events` | List events with venue name (JOIN). |
| GET | `/api/venues` | List venues. |
| GET | `/api/tickets` | List tickets with event title (JOIN). |
| POST | `/api/events` | Add one event; body = `{ "venueId", "title", "eventDate" }`. |
| POST | `/api/tickets` | Sell a ticket; body = `{ "eventId", "customerName", "quantity", "total" }`. |
| POST | `/api/etl/events` | ETL: body = JSON array of `{ venueId, title, eventDate }`; inserts into `Events`. |

---

## Important

**Always open the app at http://localhost:3000** in your browser. Do not open `index.html` as a file — the API will not be reachable. If you do open the file by mistake, the page will show a message with the correct link.

---

## Interview talking points

- **SQL Server / T-SQL**: “Schema uses identity columns, indexes, and foreign keys; all API queries are parameterized T-SQL with JOINs.”
- **Node.js**: “The API uses a connection pool with retry on startup for Docker, and an ETL endpoint that transforms and loads JSON into SQL Server.”
- **ETL**: “The ETL endpoint takes an array of events, validates and normalizes fields, then inserts into the Events table and returns the inserted rows.”
- **Security**: “We never store full card numbers; only a token/mask reference, aligned with PCI awareness.”
- **Docker**: “One `docker-compose up` brings up SQL Server and the API; the frontend is served by the API so the whole demo is self-contained.”

---

## Troubleshooting

| Symptom | What to try |
|--------|-------------|
| **Stuck on "Loading..."** | Open **http://localhost:3000** in the browser (not the HTML file). Wait ~30–45 s after start, then refresh. |
| **API container exits (Exited 1)** | SQL Server wasn’t ready in time. Run `docker-compose up -d` again. Check `docker-compose logs api`. |
| **Connection refused on :3000** | Wait ~30–45 s after `docker-compose up -d`, then open http://localhost:3000. |
| **Events/Venues empty or 500** | Run `docker-compose logs api`. Restart: `docker-compose down` then `docker-compose up -d`, wait 60 s. |

Good luck with your technical round.
