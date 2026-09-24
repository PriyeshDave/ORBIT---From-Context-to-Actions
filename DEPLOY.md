# Deploying Orbit to GCP — project `orbit-509521`

Every command below is scoped to your actual project. This assumes you'll `git push` this
codebase and then clone it onto the VM, as you described.

## What's already handled in the code

- The frontend makes **same-origin** requests by default — no hardcoded `localhost:8000`
  baked into the build. nginx (inside the frontend container) forwards `/api/*` to the
  backend container. Same image works on any IP or domain, HTTP or HTTPS, without a rebuild.
- `frontend/nginx.conf` reverse-proxies `/api/*`, including WebSocket upgrade support
  (Readiness's live chat) and streaming-safe settings (Catch Up's and Daily Plan's live
  pipeline views).
- `docker-compose.yml` maps the frontend to **port 80**, so the deployed app is reachable at
  `http://<VM_IP>/` with no port number.
- `npm run dev` locally also works out of the box via a Vite dev-server proxy — no `.env`
  needed for local development either.
- Root-level `.env.example` is what Docker Compose actually reads (`backend/.env.example` is
  only for running the backend directly, without Docker).

## Before you push to git — one thing to check yourself

I found real API keys sitting in a `.env.example` file in an earlier copy of this codebase you
shared with me. I've made sure the copy here only has placeholders, but **please double check
your own working copy before `git add`** — run this from the project root:

```bash
git grep -n "sk-proj-\|sk-ant-\|lsv2_" -- '*.example' '*.md' 2>/dev/null
```

If that returns anything, remove it before committing. `.env` itself is gitignored correctly,
but `.env.example` is not (it's meant to be committed as a template).

## Step 1 — Set your project as the active gcloud config

```bash
gcloud config set project orbit-509521
gcloud auth login   # if you haven't already
```

## Step 2 — Enable the APIs you'll need

```bash
gcloud services enable compute.googleapis.com
```

## Step 3 — Create the VM

```bash
gcloud compute instances create orbit-vm \
  --project=orbit-509521 \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=http-server
```

`e2-medium` (2 vCPU, 4 GB RAM) is enough — this is a FastAPI backend plus a static frontend
behind nginx, nothing heavy runs server-side. Bump to `e2-standard-2` if you're demoing to a
live audience and want headroom.

## Step 4 — Open port 80

```bash
gcloud compute firewall-rules create allow-http \
  --project=orbit-509521 \
  --allow=tcp:80 \
  --target-tags=http-server \
  --description="Allow HTTP for Orbit"
```

## Step 5 — SSH in and install Docker

```bash
gcloud compute ssh orbit-vm --project=orbit-509521 --zone=us-central1-a
```

Once connected, on the VM:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out (`exit`) and SSH back in for the group change to take effect:

```bash
gcloud compute ssh orbit-vm --project=orbit-509521 --zone=us-central1-a
docker --version
docker compose version
```

## Step 6 — Clone your repo

```bash
git clone <your-github-repo-url> orbit
cd orbit
```

## Step 7 — Configure secrets

```bash
cp .env.example .env
nano .env
```

Set at minimum:
```
OPENAI_API_KEY=sk-your-real-key-here
```

**Use a freshly rotated key here** if you followed the rotation step above — don't reuse the
one that was exposed. Leave `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` blank — that's what makes
the same-origin setup work regardless of the VM's IP.

## Step 8 — Build and run

```bash
docker compose up --build -d
```

First build takes a few minutes. Check health:

```bash
docker compose ps
docker compose logs -f backend    # Ctrl+C to stop following
```

Look for `Uvicorn running on http://0.0.0.0:8000` in the backend logs and no restart-looping
in `docker compose ps`.

## Step 9 — Smoke test

From the VM:
```bash
curl http://localhost/api/health
```
Expect `{"status":"ok",...}`. Then get the VM's external IP:

```bash
gcloud compute instances describe orbit-vm \
  --project=orbit-509521 \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Open `http://<that-IP>/` in a browser. Log in as any persona (`Orbit@2026`) and click through
Catch Up, Daily Plan, Incidents, and Readiness — including the WebSocket-based Readiness chat
and the Daily Plan's live streaming build — to confirm the whole stack works through the proxy,
not just the static page.

## Managing it afterward

```bash
docker compose logs -f              # tail both services
docker compose restart backend      # restart just one service
docker compose down                 # stop everything
```

To deploy a code update:
```bash
git pull
docker compose up --build -d
```

## Optional — reserve a static IP

By default the VM's external IP changes on stop/restart:

```bash
gcloud compute addresses create orbit-ip --project=orbit-509521 --region=us-central1
gcloud compute instances delete-access-config orbit-vm --project=orbit-509521 --zone=us-central1-a --access-config-name="External NAT"
gcloud compute instances add-access-config orbit-vm --project=orbit-509521 --zone=us-central1-a --access-config-name="External NAT" \
  --address=$(gcloud compute addresses describe orbit-ip --project=orbit-509521 --region=us-central1 --format='get(address)')
```

## Optional — a real domain and HTTPS

Works fine on the bare IP over HTTP for a demo. For a domain with HTTPS:
1. Point your domain's DNS A record at the VM's external IP.
2. Open port 443: `gcloud compute firewall-rules create allow-https --project=orbit-509521 --allow=tcp:443 --target-tags=http-server`
3. Put Caddy or an nginx+certbot sidecar in front of the existing `frontend` container rather
   than modifying `frontend/nginx.conf` directly — ask me and I'll wire that up as a fourth
   Compose service if you want to go this route.

## Troubleshooting

- **Backend restart-looping** → almost always a missing/invalid `OPENAI_API_KEY`. Check with
  `docker compose logs backend`.
- **Frontend loads but every action fails** → open the browser's Network tab; if `/api/...`
  calls are going to `localhost:8000` instead of a relative path, the frontend was built with
  `VITE_API_BASE_URL` set — remove it from `.env` and `docker compose up --build -d` again.
- **Readiness's chat won't connect** → confirm you're on port 80, not some other port.
- **"port is already allocated"** → something else on the VM is using port 80. Change
  `FRONTEND_PORT` in `.env` and access the app on that port instead.
