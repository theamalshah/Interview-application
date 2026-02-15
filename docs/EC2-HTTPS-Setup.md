# Enable HTTPS (port 443) on EC2

Your app on EC2 runs behind **nginx** (port 80 → API on 3000). To serve the site over **HTTPS on port 443**, use one of the two approaches below.

---

## Part 1: Deploy the latest code (including HTTPS changes)

Do this first so your EC2 has the same code as your Git repo.

### 1. SSH into your EC2 instance

```bash
ssh -i your-key.pem ec2-user@<your-ec2-public-ip>
```

(Use `ubuntu@...` if you use Ubuntu AMI.)

### 2. Go to the app directory

If you cloned the repo:

```bash
cd ~/interview-app
# or: cd ~/Interview-application  (if that’s the folder name)
```

### 3. Pull latest and rebuild

```bash
git pull origin master
docker-compose -f docker-compose.prod.yml --env-file .env up -d --build
```

On Ubuntu with the Compose plugin:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Wait ~1 minute, then check:

```bash
docker-compose -f docker-compose.prod.yml ps
```

All services should be “Up” and the API “healthy”. The app is still available at **http://&lt;ec2-ip&gt;** (port 80).

---

## Part 2: Enable HTTPS on port 443

You have two options: **A** with a real domain and free certificate (recommended), or **B** with a self-signed certificate (no domain, browser warning).

---

### Option A: HTTPS with a real domain (Let’s Encrypt)

Use this if you have a **domain name** pointing to your EC2 public IP (e.g. `app.example.com` → EC2).

#### A1. Open port 443 on EC2

1. **AWS Console** → **EC2** → **Security Groups** → select the security group of your instance.
2. **Edit inbound rules** → **Add rule**:
   - Type: **HTTPS**
   - Port: **443**
   - Source: **0.0.0.0/0** (or your IP for testing)
3. Save.

#### A2. Install Certbot on EC2

**Amazon Linux 2023:**

```bash
sudo dnf install -y certbot
```

**Ubuntu 22.04:**

```bash
sudo apt update && sudo apt install -y certbot
```

#### A3. Get a certificate (replace with your domain)

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

- Use the domain that points to this EC2 IP.
- If something is already using port 80, stop the stack first:  
  `docker-compose -f docker-compose.prod.yml down`  
  then run certbot, then start again.

Certbot will create files under `/etc/letsencrypt/live/yourdomain.com/`:

- `fullchain.pem` (certificate)
- `privkey.pem` (private key)

#### A4. Allow nginx container to read the certs

```bash
sudo chmod -R 755 /etc/letsencrypt/live
sudo chmod -R 755 /etc/letsencrypt/archive
```

#### A5. Add HTTPS to nginx config

On your **local** machine, update `nginx/nginx.conf` so it has a second server block for 443 (see the example in **Option B** below), but use:

- `ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;`
- `ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;`

Then copy the updated `nginx/nginx.conf` to EC2 (e.g. with `scp`) or edit it on EC2 with `nano`.

#### A6. Mount certs and port 443 in Docker

In **docker-compose.prod.yml**, under the **nginx** service, add:

- Port: `"443:443"`
- Volumes:  
  `- /etc/letsencrypt:/etc/letsencrypt:ro`

Example:

```yaml
  nginx:
    image: nginx:alpine
    container_name: interview-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

#### A7. Reload nginx

```bash
docker-compose -f docker-compose.prod.yml up -d --build
# or: docker compose -f docker-compose.prod.yml up -d --build
```

Then open **https://yourdomain.com**. You should get a valid certificate and no browser warning.

---

### Option B: HTTPS with a self-signed certificate (no domain)

Use this for **testing** or when you only have the EC2 IP. Browsers will show a “not secure” / certificate warning; you can accept it to continue.

#### B1. Open port 443

Same as A1: add an inbound rule for **HTTPS (443)** in the EC2 security group.

#### B2. Create a self-signed cert on EC2

```bash
cd ~/interview-app   # or your app dir
sudo mkdir -p ssl
sudo openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/CN=localhost"
sudo chmod 644 ssl/cert.pem ssl/key.pem
```

#### B3. Add HTTPS server block to nginx

Edit `nginx/nginx.conf` and add a second `server` block for 443. Full example:

```nginx
# Production: proxy to Node API on port 3000
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name _;
    location / {
      proxy_pass http://api:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }

  server {
    listen 443 ssl;
    server_name _;
    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    location / {
      proxy_pass http://api:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

#### B4. Expose 443 and mount certs in Docker

In **docker-compose.prod.yml**, under **nginx**:

- Add port: `"443:443"`
- Add volume: `- ./ssl:/etc/nginx/ssl:ro`

Example:

```yaml
  nginx:
    image: nginx:alpine
    container_name: interview-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
```

The `ssl` folder must be in the **same directory** as `docker-compose.prod.yml` (project root). You created it in step B2 in that directory.

#### B5. Restart stack

```bash
docker-compose -f docker-compose.prod.yml up -d
# or: docker compose -f docker-compose.prod.yml up -d
```

Open **https://&lt;ec2-public-ip&gt;**. Accept the browser warning (e.g. “Advanced” → “Proceed to …”) to use HTTPS.

---

## Quick reference

| Goal                         | Action |
|-----------------------------|--------|
| Deploy latest code          | `git pull` then `docker-compose ... up -d --build` |
| HTTPS with domain           | Certbot + nginx 443 + mount `/etc/letsencrypt` |
| HTTPS with IP only (dev)    | Self-signed cert in `ssl/` + nginx 443 + mount `./ssl` |
| Open HTTPS in browser       | **https://**&lt;ec2-ip&gt; or **https://**yourdomain.com |

After changes to `nginx/nginx.conf` or `docker-compose.prod.yml`, run:

```bash
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

(or `docker compose ...` on Ubuntu with the plugin).
