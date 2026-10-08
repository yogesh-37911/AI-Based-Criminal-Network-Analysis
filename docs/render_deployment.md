# Deploy FORGE-AI on Render

The repository includes a root-level [`render.yaml`](../render.yaml) Blueprint. It creates a Docker-based FastAPI service, a Docker-based Next.js service, and a private Render Postgres database.

## Before deploying

- Push the latest `main` branch to GitHub.
- Create fresh NVIDIA, DeepSeek, and Kimi API keys. Keys previously pasted into chat should be revoked and replaced.
- Choose a strong password for the initial admin account and save it somewhere private.
- Review Render's current prices before applying the Blueprint. Both web services use the paid Starter plan so they stay warm; the backend also needs a persistent disk for uploaded evidence. The database is configured as Free for a short demo and expires after 30 days. Change it to a paid database plan if you need it to remain available longer.

## Deploy from the Render dashboard

1. Sign in to [Render](https://dashboard.render.com/) and connect your GitHub account if prompted.
2. Select **New → Blueprint**.
3. Choose `yogesh-37911/AI-Based-Criminal-Network-Analysis`, branch `main`, and continue. Render detects `render.yaml` at the repository root.
4. Review the services and region (`Singapore`). Confirm the plans and any charges before applying.
5. When Render asks for values marked `sync: false`, enter:
   - `ADMIN_PASSWORD`: the strong password you chose.
   - `NVIDIA_API_KEY`, `DEEPSEEK_API_KEY`, and `KIMI_API_KEY`: your newly created provider keys. Leave a provider blank if you do not use it.
6. Select **Apply**. Render creates the database first, then builds and deploys the API and frontend. The first Docker builds can take several minutes.
7. Open the API service's **Logs** and wait for it to become Live. Check `https://<your-api-service>.onrender.com/health`; it should return `{"status":"ok","service":"FORGE-AI"}`. The API docs are at `/docs`.
8. Open the frontend service's `onrender.com` URL. Sign in with `admin@forge-ai.local` and the `ADMIN_PASSWORD` value you supplied.

The API service seeds the administrator on startup. `SEED_DEMO_DATA=true` also loads the synthetic demo investigations, and the seeder skips cases that already exist. Uploaded evidence is stored on the API's persistent disk at `/app/uploads`; database records are stored in Render Postgres.

## If a service name is unavailable

Render service names must be globally unique. If the Blueprint reports a name conflict, change the relevant `name` in `render.yaml` and update every `fromService` reference to that same name, then push and sync the Blueprint again.

## Updating the deployment

The Blueprint enables automatic deploys from `main`. Push a change to GitHub and check the service's **Events** and **Logs** pages in Render. Keep `DATABASE_URL`, `SECRET_KEY`, and provider keys in Render's environment settings only; never add their values to Git.
