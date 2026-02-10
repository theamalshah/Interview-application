# Node.js API - SQL Server, T-SQL, ETL demo (build context = project root)
FROM node:20-alpine
RUN apk add --no-cache wget

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ .
COPY frontend/ ./frontend/

EXPOSE 3000

# No ENTRYPOINT/script - direct CMD avoids "no such file or directory" (CRLF/Windows)
CMD ["sh", "-c", "echo Waiting 20s for SQL Server... && sleep 20 && exec node server.js"]
