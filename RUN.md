# How to run the Interview Application

**Important:** Run all commands from the **Interview application** folder (the folder that contains `docker-compose.yml`).

---

## 1. Open the right folder in terminal

```powershell
cd "c:\Users\theam\Desktop\Projects\Interview application"
```

(If you're in Cursor, the terminal might start in `react-app`. Change to the path above.)

---

## 2. Start both containers (SQL Server + API)

```powershell
docker-compose up -d --build
```

Wait **at least 1 minute** (first time: build + SQL Server + API startup).

---

## 3. Check that BOTH containers are running

```powershell
docker-compose ps -a
```

You should see **two** containers:

| Name                 | Status  |
|----------------------|--------|
| interview-sqlserver  | Up     |
| interview-api        | Up     |

If **interview-api** is **Exited** or missing:

- See why:  
  `docker-compose logs api`
- Fix and restart:  
  `docker-compose up -d --build`

---

## 4. Open the app

- App: **http://localhost:3000**
- Health: **http://localhost:3000/api/health**

---

## If only SQL Server shows (interview-api missing or Exited)

1. View API logs:
   ```powershell
   docker-compose logs api
   ```
2. Copy the last 30–40 lines (especially any error) and use them to fix or ask for help.
3. Restart and rebuild:
   ```powershell
   docker-compose down
   docker-compose up -d --build
   ```
4. Wait 60 seconds, then run `docker-compose ps -a` again.
