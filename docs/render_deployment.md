# Deploy FORGE-AI on Render

The repository includes a root-level [`render.yaml`](../render.yaml) Blueprint configured for Render's free tier. It creates a free Docker-based FastAPI web service and a free Docker-based Next.js web service. It reuses your existing `proofforge-db` PostgreSQL instance, so the Blueprint does not try to create a second free database.

## Before deploying

- Push the latest `main` branch to GitHub.
- Create fresh NVIDIA, DeepSeek, and Kimi API keys. Keys previously pasted into chat should be revoked and replaced.
- Choose a strong password for the initial admin account and save it somewhere private.
- This setup is intended for a no-cost demo. It uses free web services and your existing free Postgres instance. Free services sleep after 15 minutes without traffic and can take about a minute to wake. The Postgres instance expires 30 days after it was created.
- The free API has no persistent disk. Uploaded evidence files can disappear when the service sleeps, restarts, or redeploys. Use synthetic demo evidence and re-upload it when needed; do not rely on this deployment as long-term evidence storage.
- The existing Postgres instance is in Oregon, so the API and frontend are also configured for Oregon. Create a separate logical database named `forge_ai` inside `proofforge-db`; this keeps FORGE-AI's tables separate from the existing app's tables. Both logical databases still share the same 1 GB free storage and 30-day expiry.

## Prepare the existing PostgreSQL instance

1. In Render, open **proofforge-db → Connect** and copy its **External Database URL**. Keep the URL private.
2. In PowerShell, run `docker run --rm -it postgres:16 psql "<PASTE_EXTERNAL_DATABASE_URL>"`, replacing the placeholder locally. This uses Docker to open PostgreSQL's command line; it does not change the existing database.
3. At the `psql` prompt, run `CREATE DATABASE forge_ai;`, then run `\q` to exit. If PostgreSQL reports that the database already exists, continue to the next step. Render supports multiple logical databases in one Postgres instance; they share its storage and expiry.
4. Back in Render, open **proofforge-db → Connect** and copy the **Internal Database URL**. Keep it private. Replace only the database name at the end of the URL with `forge_ai`.

## Deploy from the Render dashboard

1. Sign in to [Render](https://dashboard.render.com/) and connect your GitHub account if prompted.
2. Select **New → Blueprint**.
3. If you already created the Blueprint, open it and choose **Sync** after the latest commit appears. Otherwise, select `yogesh-37911/AI-Based-Criminal-Network-Analysis`, branch `main`; Render detects `render.yaml` at the repository root.
4. Confirm both web services show the **Free** plan, and review the limitations below before applying. This Blueprint does not create a database resource.
5. Select **Apply**. This Blueprint creates the API and frontend services; it does not create or alter your existing database. The first Docker builds can take several minutes.
6. Open the API service → **Environment** and add `DATABASE_URL` with the internal URL you prepared above, ending in `/forge_ai`. Also set `ADMIN_PASSWORD` and the provider API keys you want to use. Keep these values private. Because this Blueprint already exists, Render may not prompt again for `sync: false` values; add them here if they are missing. Save and deploy the service. The API may show a failed first deploy until `DATABASE_URL` is set; then redeploy it.
7. Open the API service's **Logs** and wait for it to become Live. Check `https://<your-api-service>.onrender.com/health`; it should return `{"status":"ok","service":"FORGE-AI"}`. The API docs are at `/docs`.
8. Open the frontend service's `onrender.com` URL. Sign in with `admin@forge-ai.local` and the `ADMIN_PASSWORD` value you supplied.

The API service seeds the administrator on startup. `SEED_DEMO_DATA=true` also loads the synthetic demo investigations, and the seeder skips cases that already exist. Uploaded files use the API's temporary filesystem; case records are stored in the dedicated `forge_ai` database on your existing free Render Postgres instance.

## Free-tier limitations

- Free web services spin down after 15 minutes without traffic and may take about a minute to wake.
- Files uploaded to the API are temporary and can be lost during sleep, restart, or redeploy. Free web services do not support persistent disks.
- The existing free Render Postgres instance is limited to 1 GB total and expires 30 days after creation. Its storage and expiry are shared by all databases on that instance. Export anything you need before expiry.
- If Render still asks for payment, cancel the current Blueprint flow and confirm the latest GitHub `main` contains `plan: free` for both web services and no `disk:` block under the API service. A Blueprint preview can retain the plans from an earlier configuration until refreshed.

## If a service name is unavailable

Render service names must be globally unique. If the Blueprint reports a name conflict, change the relevant `name` in `render.yaml` and update every `fromService` reference to that same name, then push and sync the Blueprint again.

## Updating the deployment

The Blueprint enables automatic deploys from `main`. Push a change to GitHub and check the service's **Events** and **Logs** pages in Render. Keep `DATABASE_URL`, `SECRET_KEY`, and provider keys in Render's environment settings only; never add their values to Git.
