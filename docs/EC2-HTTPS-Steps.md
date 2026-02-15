# HTTPS on EC2 – Step-by-step

Your app is set up for HTTPS: nginx listens on **80** (HTTP) and **443** (HTTPS). You must add certificate files before the stack will start.

---

## Option A: Real certificate (subdomain, no browser warning)

Use this if you have a **subdomain** pointing to your EC2 IP (e.g. `app.yourdomain.com`).

### Step 1 – Open port 443 on EC2

1. AWS Console → **EC2** → **Security Groups** → select your instance’s security group.
2. **Edit inbound rules** → **Add rule**:
   - Type: **HTTPS**
   - Port: **443**
   - Source: **0.0.0.0/0**
3. Save.

### Step 2 – Install Certbot on EC2

SSH into EC2, then:

**Amazon Linux 2023:**
```bash
sudo dnf install -y certbot
```

**Ubuntu:**
```bash
sudo apt update && sudo apt install -y certbot
```

### Step 3 – Get a certificate (use your subdomain)

Temporarily stop the app so port 80 is free for certbot:

```bash
cd ~/interview-app
docker-compose -f docker-compose.prod.yml down
```
(or `docker compose -f docker-compose.prod.yml down` on Ubuntu)

Replace `your-subdomain.example.com` with your real subdomain:

```bash
sudo certbot certonly --standalone -d your-subdomain.example.com
```

Follow the prompts (email, agree to terms). Certbot will create files under `/etc/letsencrypt/live/your-subdomain.example.com/`.

### Step 4 – Create `ssl` folder and copy certs

Still on EC2, in your app directory:

```bash
cd ~/interview-app
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-subdomain.example.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-subdomain.example.com/privkey.pem ssl/key.pem
sudo chmod 644 ssl/cert.pem ssl/key.pem
```

(Replace `your-subdomain.example.com` with your domain.)

### Step 5 – Pull latest code and start the stack

If you haven’t already pulled the HTTPS nginx config and compose changes:

```bash
git pull origin master
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```
(or `docker compose ...` on Ubuntu)

### Step 6 – Test

Open **https://your-subdomain.example.com** in your browser. You should see the padlock and no certificate warning.

---

## Option B: Self-signed certificate (quick test, browser will warn)

Use this for **testing** or if you don’t have a domain. Browsers will show “Not secure”; you can click Advanced → Proceed.

### Step 1 – Open port 443

Same as Option A Step 1: add an inbound rule for **HTTPS (443)** in the EC2 security group.

### Step 2 – Create `ssl` folder and generate a self-signed cert

On EC2:

```bash
cd ~/interview-app
mkdir -p ssl
openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/CN=localhost"
chmod 644 ssl/cert.pem ssl/key.pem
```

### Step 3 – Pull latest code and start the stack

```bash
git pull origin master
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```
(or `docker compose ...` on Ubuntu)

### Step 4 – Test

Open **https://YOUR_EC2_PUBLIC_IP** in your browser. Accept the certificate warning (Advanced → Proceed to …).

---

## Summary

| Goal              | Action |
|-------------------|--------|
| Real HTTPS (subdomain) | Option A: certbot → copy certs to `ssl/cert.pem` and `ssl/key.pem` → open 443 → start stack |
| Quick HTTPS (IP only)   | Option B: open 443 → create self-signed cert in `ssl/` → start stack |

The nginx container expects **ssl/cert.pem** and **ssl/key.pem** in the project root (same folder as `docker-compose.prod.yml`). Without these files, nginx will not start.
