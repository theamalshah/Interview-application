# Data

SQL Server data is stored in a **Docker named volume** (`sqlserver_data`). It is not in a folder in this project.

- **`docker-compose down`** – Stops containers. Data in the volume is kept.
- **`docker-compose down -v`** – Stops containers and removes volumes (data would be lost).
- Sample data (venues, events, tickets) is loaded automatically on first start.

To start the app: `docker-compose up -d` from the project root. To stop: `docker-compose down`.
