# MaxBudget

Personal budget dashboard built with NestJS + React. Imports Rabobank PDF statements and tracks budgets, recurring expenses, and reservations.

## Local development

**Backend:**
```bash
cd maxbudget-api
npm install
npm run start:dev
```

**Frontend** (in a separate terminal):
```bash
cd maxbudget-web
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend automatically proxies `/api` to the backend on port 3000.

---

## Deploying to Home Assistant

The app runs as a proper Home Assistant add-on via the supervisor ingress system — no exposed port, accessible remotely via Nabu Casa, and it appears natively in the HA sidebar.

The Docker image is hosted on Docker Hub; the add-on configuration lives in the `addon/` folder of this repository.

### First-time setup

**1. Fill in your details**

Replace the placeholders in these two files before pushing to GitHub:
- `repository.yaml` — your GitHub URL and name
- `addon/config.yaml` — your Docker Hub username

**2. Build and push the initial image**

```bash
# Docker
docker build -t juspasschier/maxbudget:1.0.0 -t juspasschier/maxbudget:latest .
docker push juspasschier/maxbudget:1.0.0
docker push juspasschier/maxbudget:latest

# Podman (same commands, different prefix)
podman build -t juspasschier/maxbudget:1.0.0 -t juspasschier/maxbudget:latest .
podman push juspasschier/maxbudget:1.0.0
podman push juspasschier/maxbudget:latest
```

**3. Push this repository to GitHub**

```bash
git add .
git commit -m "chore: initial release"
git push
```

**4. Add the repository to Home Assistant**

Settings → Add-ons → Add-on store → ⋮ → Repositories → paste your GitHub URL

**5. Install MaxBudget**

Find **MaxBudget** in the add-on store and click **Install**. The app will appear in the HA sidebar automatically via ingress — no further configuration needed.

---

### Releasing a new version

**1. Bump the version** in `addon/config.yaml`:
```yaml
version: "1.1.0"
```

**2. Build and push the new image:**
```bash
podman build -t juspasschier/maxbudget:1.1.0 -t juspasschier/maxbudget:latest .
podman push juspasschier/maxbudget:1.1.0
podman push juspasschier/maxbudget:latest
```

**3. Commit and push to GitHub:**
```bash
git add addon/config.yaml
git commit -m "chore: bump version to 1.1.0"
git push
```

Home Assistant will show an update notification in the add-on store. Click **Update** to install.

---

### Database

The database is stored in `/data/budget.db` inside the container. In Home Assistant, the supervisor automatically persists the `/data` directory across restarts and includes it in HA backups. No additional backup configuration is needed.

For local Docker Compose, the same directory is mounted as a named volume (`maxbudget-data`).
