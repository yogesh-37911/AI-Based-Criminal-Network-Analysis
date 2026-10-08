# Deploy FORGE-AI on Render

The repository includes a root-level [`render.yaml`](../render.yaml) Blueprint configured for Render's free tier. It creates a free Docker-based FastAPI web service, a free Docker-based Next.js web service, and a free private Render Postgres database.

## Before deploying

- Push the latest `main` branch to GitHub.
- Create fresh NVIDIA, DeepSeek, and Kimi API keys. Keys previously pasted into chat should be revoked and replaced.
- Choose a strong password for the initial admin account and save it somewhere private.
- This setup is intended for a no-cost demo. It should not require adding a payment method while all three resources remain on the Free plan. Free services sleep after 15 minutes without traffic and can take about a minute to wake. The free Postgres database expires after 30 days.
- The free API has no persistent disk. Uploaded evidence files can disappear when the service sleeps, restarts, or redeploys. Use synthetic demo evidence and re-upload it when needed; do not rely on this deployment as long-term evidence storage.

## Deploy from the Render dashboard

1. Sign in to [Render](https://dashboard.render.com/) and connect your GitHub account if prompted.
2. Select **New → Blueprint**.
3. Choose `yogesh-37911/AI-Based-Criminal-Network-Analysis`, branch `main`, and continue. Render detects `render.yaml` at the repository root.
4. Confirm both web services and the database show the **Free** plan, and review the limitations below before applying.
5. When Render asks for values marked `sync: false`, enter:
   - `ADMIN_PASSWORD`: the strong password you chose.
   - `NVIDIA_API_KEY`, `DEEPSEEK_API_KEY`, and `KIMI_API_KEY`: your newly created provider keys. Leave a provider blank if you do not use it.
6. Select **Apply**. Render creates the database first, then builds and deploys the API and frontend. The first Docker builds can take several minutes.
7. Open the API service's **Logs** and wait for it to become Live. Check `https://<your-api-service>.onrender.com/health`; it should return `{"status":"ok","service":"FORGE-AI"}`. The API docs are at `/docs`.
8. Open the frontend service's `onrender.com` URL. Sign in with `admin@forge-ai.local` and the `ADMIN_PASSWORD` value you supplied.

The API service seeds the administrator on startup. `SEED_DEMO_DATA=true` also loads the synthetic demo investigations, and the seeder skips cases that already exist. Uploaded files use the API's temporary filesystem; case records are stored in the free Render Postgres database, which expires after 30 days.

## Free-tier limitations

- Free web services spin down after 15 minutes without traffic and may take about a minute to wake.
- Files uploaded to the API are temporary and can be lost during sleep, restart, or redeploy. Free web services do not support persistent disks.
- Free Render Postgres is limited to 1 GB and expires 30 days after creation. Export anything you need before expiry.
- If Render still asks for payment, cancel the current Blueprint flow and confirm the latest GitHub `main` contains the `plan: free` settings and no `disk:` block under the API service. A Blueprint preview can retain the plans from an earlier configuration until refreshed.

## If a service name is unavailable

Render service names must be globally unique. If the Blueprint reports a name conflict, change the relevant `name` in `render.yaml` and update every `fromService` reference to that same name, then push and sync the Blueprint again.

## Updating the deployment

The Blueprint enables automatic deploys from `main`. Push a change to GitHub and check the service's **Events** and **Logs** pages in Render. Keep `DATABASE_URL`, `SECRET_KEY`, and provider keys in Render's environment settings only; never add their values to Git.
