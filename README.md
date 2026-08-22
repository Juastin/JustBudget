# JustBudget

Personal budget dashboard built with NestJS + React. Imports Rabobank PDF statements and ING CSV files and tracks budgets, recurring expenses, and reservations.

## Installation (Home Assistant)

Go to **Settings → Add-ons → Add-on store → ⋮ → Repositories** and add:
```
https://github.com/Juastin/JustBudget
```

Find **JustBudget** in the add-on store and click **Install**. The app appears in the HA sidebar automatically.

---

## Local development

**Backend:**
```bash
cd justbudget-api
npm install
npm run start:dev
```

**Frontend** (in a separate terminal):
```bash
cd justbudget-web
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend automatically proxies `/api` to the backend on port 3000.

---

## My notes

### Building and pushing the Docker image

```bash
docker build -t juspasschier/justbudget:1.0.0 -t juspasschier/justbudget:latest .
docker push juspasschier/justbudget:1.0.0
docker push juspasschier/justbudget:latest
```

### Database

The database is stored in `/data/budget.db` inside the container. The supervisor persists the `/data` directory across restarts and includes it in HA backups automatically.
