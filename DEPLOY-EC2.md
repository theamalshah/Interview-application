# Deploy Interview Application on AWS EC2

This guide covers hosting the **Ticketing Platform** demo on an EC2 instance with Docker. The app will be reachable at **http://&lt;your-ec2-public-ip&gt;** (port 80). Stack: **SQL Server** (TicketingDemo), **Node.js API**, **nginx** as reverse proxy.

---

## Deploy day checklist (quick reference)

1. **EC2** – Instance running, security group allows SSH (22) and HTTP (80). Note public IP.
2. **SSH** – Connect and install Docker (+ Docker Compose). Log out and back in after `usermod -aG docker`.
3. **Files on EC2** – Clone repo or `scp` the project folder. Must include: `backend/`, `frontend/` (index.html, app.js, styles.css), `nginx/`, `docker-compose.prod.yml`, `.env.example`.
4. **.env** – On EC2: `cp .env.example .env` then edit `.env` and set strong passwords (same for `MSSQL_SA_PASSWORD` and `DB_PASSWORD`). Do not copy your local `.env` over the network.
5. **Start** – From project root: `docker-compose -f docker-compose.prod.yml --env-file .env up -d --build`. Wait ~1 min.
6. **Verify** – Open http://&lt;ec2-public-ip&gt; and http://&lt;ec2-public-ip&gt;/api/health.

---

## Prerequisites

- AWS account
- SSH key pair for EC2

---

## 1. Launch an EC2 instance

1. **AWS Console** → **EC2** → **Launch instance**.
2. **Name:** e.g. `interview-app`.
3. **AMI:** **Amazon Linux 2023** or **Ubuntu 22.04 LTS**.
4. **Instance type:** **t3.small** or **t3.medium** (SQL Server in Docker needs at least 2 GB RAM).
5. **Key pair:** Create or select one; download the `.pem` file.
6. **Network:** Use a VPC with a **public subnet** and **Auto-assign public IP** enabled.
7. **Storage:** 20–30 GB.
8. **Security group:** Add:
   - **SSH (22)** – Your IP (or 0.0.0.0/0 for testing only).
   - **HTTP (80)** – 0.0.0.0/0 so the app is reachable.
9. Launch and note the **Public IPv4 address**.

---

## 2. Connect and install Docker

SSH in (replace key and host):

```bash
ssh -i your-key.pem ec2-user@ec2-xx-xx-xx-xx.region.compute.amazonaws.com
```

**Amazon Linux 2023:**

```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

Install Docker Compose (standalone):

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

**Ubuntu 22.04:**

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker ubuntu
# Use "docker compose" (with space) instead of "docker-compose" in the commands below
```

Log out and back in (or run `newgrp docker`), then verify:

```bash
docker --version
docker-compose --version
```

---

## 3. Deploy the application

**Option A: Clone from Git**

```bash
git clone <your-repo-url> interview-app
cd interview-app
# If the repo root is the app folder, you're done. If the app is in a subfolder:
# cd "Interview application"
```

**Option B: Copy from your machine**

From your PC (PowerShell), from the **Interview application** project folder (the one that contains `backend/`, `frontend/`, `nginx/`, `docker-compose.prod.yml`):

```bash
scp -i your-key.pem -r backend frontend nginx docker-compose.prod.yml .env.example ec2-user@<ec2-public-ip>:~/interview-app/
```

Ensure `frontend/` includes `index.html`, `app.js`, and `styles.css`.

On EC2:

```bash
cd ~/interview-app
```

**Create `.env`:**

```bash
cp .env.example .env
nano .env
```

Set a **strong password** (8+ chars, upper, lower, digit, symbol). Use the **same** value for SQL Server and the API:

```env
MSSQL_SA_PASSWORD=YourStrongPassword123!
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
```

Save and exit.

**Start the production stack:**

First time (build API image and start everything):

```bash
docker-compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Wait **~30–45 seconds** for SQL Server and the API to be ready. Check logs if needed:

```bash
docker-compose -f docker-compose.prod.yml logs -f api
# Ctrl+C to exit
```

---

## 4. Open the app

In your browser open:

**http://&lt;your-ec2-public-ip&gt;**

You should see the Ticketing Platform UI: **stats strip** (events · venues · tickets counts), upcoming events, **Events & ticket sales** (per-event ticket count and revenue, “View tickets”, close with button or Esc), venues, recent tickets (each section has a **refresh** button), add event, sell ticket (with success toasts), and import ETL.

- **Health check:** http://&lt;your-ec2-public-ip&gt;/api/health (returns <code>{"status":"ok","database":"connected"}</code> when ready)

---

## 5. Useful commands

| Task | Command |
|------|---------|
| View logs | `docker-compose -f docker-compose.prod.yml logs -f` |
| API logs only | `docker-compose -f docker-compose.prod.yml logs -f api` |
| Check service health | `docker-compose -f docker-compose.prod.yml ps` (API shows “healthy” once DB is ready) |
| Stop | `docker-compose -f docker-compose.prod.yml down` |
| Start again | `docker-compose -f docker-compose.prod.yml --env-file .env up -d` |
| Rebuild after code change | `docker-compose -f docker-compose.prod.yml --env-file .env up -d --build` |

On Ubuntu with the Compose plugin, use `docker compose` (with a space) instead of `docker-compose`.

---

## 6. Production notes

- **Stack:** SQL Server (TicketingDemo: Venues, Events, Tickets), Node.js API (Express), nginx on port 80. API serves the frontend (index.html, styles.css, app.js) and exposes REST (events, venues, tickets, **/api/events/ticket-summary**) and ETL.
- **Secrets:** Never commit `.env`. It is in `.gitignore`. Create `.env` from `.env.example` on the server.
- **SQL Server:** Port 1433 is **not** published in prod; only the API container can reach it. `DB_ENCRYPT: "false"` is set for the Docker network.
- **Healthcheck:** The API container has a healthcheck that hits `/api/health`; `docker compose ps` will show “healthy” once the API and database are ready.
- **HTTPS:** For HTTPS, put an ALB or CloudFront in front, or run nginx with TLS (e.g. certbot) on the instance.
- **Firewall:** Only ports 22 (SSH) and 80 (HTTP) need to be open in the security group.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| **502 Bad Gateway** | API or SQL not ready. Wait 1–2 minutes. Check `docker-compose -f docker-compose.prod.yml logs api`. |
| **Cannot connect to SQL** | Ensure `MSSQL_SA_PASSWORD` and `DB_PASSWORD` in `.env` meet SQL Server rules (8+ chars, upper, lower, digit, symbol). |
| **Build fails** | Run from the project root (where `docker-compose.prod.yml` and `backend/Dockerfile` are). Ensure `backend/` and `frontend/` exist. |
| **Out of memory** | Use at least **t3.small** (2 GB RAM) for SQL Server in Docker. |
