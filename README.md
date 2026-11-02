# Musicians World

A responsive, music-first community with a Node.js API. Signed-in musicians can publish creative ideas, post and discover upcoming gigs, build public profiles, and share playable HTTPS audio previews or public Spotify, SoundCloud, and YouTube tracks with likes and comments. The responsive dashboard includes a concert-photo carousel, concert-video picks, animated music-inspired styling, local date/time and weather, and a dark-first purple theme with a higher-contrast light option. The interface can be switched between English, Spanish, French, Portuguese, and Swahili; language selection is saved on the device and account. User-authored posts, artist names, and third-party media titles stay in their original language. Weather coordinates are sent to Open-Meteo and are not added to a musician profile. Member login email stays private from other members unless a user explicitly shares a contact address on their profile or gig listing. Only administrators can access account email, registration country, and account sign-in/sign-out history. The app also supports role-based accounts, email sign-in, and browser-held ECDSA signatures.

Admins can restore deleted accounts from the Deleted accounts archive without setting a password. Restored accounts retain their archived password, and users can optionally change it in Account settings. Accounts deleted before credential archiving was added may not have a recoverable password in the archive.

Users can recover an approved account with an email one-time code when that account has an email address. Set `RESEND_API_KEY` and a verified `EMAIL_FROM` to enable delivery. Recovery codes expire after 10 minutes, allow five verification attempts, and can be sent no more than once per minute or five times per hour per account. A successful recovery changes the password and invalidates existing sessions.

## Run locally

Requirements: Node.js 20 or later and npm. Use the same Node.js installation for dependency installation and startup because `better-sqlite3` includes a native binary tied to the Node.js version. This workspace was installed and checked with Node.js 24.

Copy `.env.example` to `.env` and edit it before starting the server. The app loads `.env` at startup, and process environment variables take precedence. Keep `.env` private.

```powershell
Copy-Item .env.example .env
notepad .env
```

To enable email, configure `RESEND_API_KEY`, a Resend-verified `EMAIL_FROM`, `ADMIN_EMAIL`, and `APP_URL`, then restart Node. Use your current public tunnel URL for `APP_URL` during a temporary demo. Without working Resend settings and an admin email, production self-sign-up is disabled, but admins can still create users from the dashboard.

```powershell
cd "C:\Users\pdena\OneDrive\Desktop\Authentication Login"
$env:Path = "C:\Program Files\nodejs;$env:Path"
node --version
$env:NODE_ENV = "development"
$env:DATABASE_MODE = "sqlite"
$env:AUTH_DATA_DIR = Join-Path (Get-Location) ".local-data"
npm.cmd install
npm.cmd start
```

In Laragon, click **Start All**, open **Menu > Laragon > Terminal**, and run these commands. The PATH line selects Node.js 24 used in this workspace; change it if Node.js is installed elsewhere. Confirm `node --version` prints `v24...`. Then open http://127.0.0.1:8001. Keep the terminal open while you use the app; press **Ctrl+C** to stop it. Do not open `index.html` directly or use VS Code Go Live. This uses a separate demo database in the project's ignored `.local-data` folder so your existing accounts are not exposed in the demo. On first use, create an admin account with a unique password of at least 12 characters. Production self-sign-up email requires Resend settings; without them, use an admin-created demo account.

If you forget a password for this local SQLite demo and email recovery is not configured, stop the server with **Ctrl+C** and run `node scripts/reset-local-password.js` in the same terminal, with `AUTH_DATA_DIR` still set to `.local-data`. The command prompts for a username and new password, hides password input, and resets only that local account's password and failed-login counter. It does not work against a hosted database.

To share a temporary demo link, start the app, open a second Laragon Terminal, and run the command below. Install `cloudflared` from Cloudflare if it is not already installed:

```powershell
& "$env:TEMP\cloudflared.exe" tunnel --url http://127.0.0.1:8001
```

Keep both terminals open and share the generated `trycloudflare.com` URL. Quick Tunnels are temporary demo links; they stop working when the tunnel process exits and are not a production hosting setup. If Cloudflare cannot connect from your network, deploy to a public Node.js host.

In VS Code, press **F5** and select **Live app on port 8001**. This avoids a stale server already using port 8000, starts the Node server in development mode, and opens the actual app URL automatically. Workspace files auto-save after one second; CSS changes update in place, while HTML and JavaScript changes reload the page. Use this launch configuration instead of the Live Preview or Go Live server so the page and `/api` requests use the same app server.

## Expo mobile app

The Expo Android/iOS app is maintained separately in the sibling `Musicians World Mobile` folder, outside this website project. It opens the deployed website and uses the same sign-in flow and API. Configure `EXPO_PUBLIC_SITE_URL` in that project's `.env` for local use or its EAS environment for release builds. Backend credentials such as the Turso token and pepper must stay on the server and must not be added to Expo environment variables.

The browser-based mobile sign-in page is available at `/mobile`. It shares the same account setup, password recovery, Google sign-in, and API as the desktop page; after sign-in it opens the responsive musician dashboard. New viewer requests include a required country selection, saved with the account and shown to administrators in pending approvals, the account directory, and directory exports. Existing accounts without a submitted country remain marked as not provided.

The community hero opens with a muted Pexels gospel concert clip, a typing-effect headline, and an animated gospel singer illustration. Below the hero is a separate row of five click-to-play gospel and worship concert picks from their original YouTube channels. The selected picks are “Nkyinkyim Xperience 2025,” “The Praise · Live” by Diana Hamilton Official, “Spirit Of Praise 7,” a live Worship Together set, and The Icons Music live experience. A separate five-image concert carousel uses Unsplash image URLs. The player embeds YouTube's public videos; users start playback themselves. The hero video is “Vibrant Christian Music Concert with Raised Hands” by Mariano Quintero on [Pexels](https://www.pexels.com/video/vibrant-christian-music-concert-with-raised-hands-37639706/). Video and image availability remain subject to their hosts and creators' settings.

## Deploy on Vercel

This repository uses Vercel to serve the static files and run `api/index.js` as the `/api` Node.js Function. The local `server.js` is for Laragon and local development. Vercel Functions have a read-only filesystem, so configure Turso for persistent production accounts; do not use local SQLite for Vercel production data.

1. Push this project to GitHub and import that repository in Vercel. Set the project root to the repository root. Select the **Other** framework preset; leave the build command empty because the frontend is static and the API is built from `api/index.js`.
2. Create a Turso database and add these in Vercel **Settings > Environment Variables** for Production (and Preview if needed):

   ```text
   NODE_ENV=production
   DATABASE_MODE=turso
   TURSO_DATABASE_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-private-database-token
   AUTH_PEPPER=your-stable-random-secret-at-least-32-characters
   ```

   Generate a new pepper locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Save it as a Vercel secret and keep the exact same value for future deployments. Never use `.local-data` or a Vercel function's local filesystem for production accounts.
3. If using email approval, also configure `RESEND_API_KEY`, a Resend-verified `EMAIL_FROM`, and `ADMIN_EMAIL`. Set `APP_URL` to the production URL, for example `https://your-project.vercel.app`. Email credentials and database tokens belong in Vercel Environment Variables, not in the repository.
4. Deploy. The static website is served from the project root; API calls go to `/api`. On the first visit, create the initial administrator account.
5. If using Google sign-in, set `GOOGLE_CLIENT_ID` and add the exact Vercel origin to the Google OAuth client's authorized JavaScript origins.

Turso provides the persistent remote database. The local AES-encrypted SQLite backup job does not run for Turso; use Turso's database backup and restore features. Vercel automatically detects the Node.js API function in the root `api` directory.
## Deploy on Render

The repository includes a Render Blueprint in `render.yaml` that runs the app with SQLite on a 1 GB persistent disk—no Turso account or database credentials needed. In Render, choose **New > Blueprint**, connect this GitHub repository, and select the Blueprint. It runs `npm ci`, starts with `npm start`, and checks `/healthz`. The Blueprint mounts persistent storage at `/var/data`, sets `AUTH_DATA_DIR=/var/data`, and creates the SQLite database and private pepper there automatically. Persistent disks require a paid Render web service; the Blueprint selects the Starter plan. Keep the disk attached and do not change its mount path. Set `RESEND_API_KEY` and `EMAIL_FROM` to enable email; set `ADMIN_EMAIL` for admin notifications if the admin account does not already have an email address. Render's `RENDER_EXTERNAL_URL` supplies approval links automatically; set `APP_URL` only when using a custom domain.

For signup and approval emails, configure `RESEND_API_KEY` and `EMAIL_FROM` in Render's Environment settings. Set `ADMIN_EMAIL` for admin notifications if the admin account does not already have an email address, and set `APP_URL` only to override the automatic Render URL. Keep secrets out of the repository. Verify the sender domain with Resend; the sender address must belong to that verified domain.

## Deploy to your chosen hosting provider

This is a standard Node.js web app. Choose a host that can run a long-lived Node.js process and provide persistent storage for SQLite, or configure Turso as a remote database. The included `server.js` serves the website and API together.

1. Install Node.js 20 or later and run `npm install` in the project directory.
2. Configure the environment variables below in your host's private settings.
3. Set the host's start command to `npm start`. The server listens on the `PORT` supplied by the host (or port 8001 locally).
4. Use HTTPS in production. Set `NODE_ENV=production` so session cookies are marked secure.

### Database storage

For local SQLite, set `AUTH_DATA_DIR` to a persistent directory on the host. The database, pepper key, backup encryption key, and encrypted daily backups are stored there. Keep this directory across restarts and deployments. Local SQLite is intended for a single app instance; use a shared remote database if you run multiple instances.

For SQLite on Render, the included Blueprint sets `DATABASE_MODE=sqlite` and `AUTH_DATA_DIR=/var/data` on a persistent disk. SQLite creates its pepper key and database in this directory, so no Turso account, token, or separate `AUTH_PEPPER` setting is required. Preserve the disk across restarts and deployments. To connect Turso instead, set `DATABASE_MODE=turso`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN`, and configure a stable `AUTH_PEPPER` secret. Production SQLite on any host requires `AUTH_DATA_DIR` to point to explicitly configured persistent storage.

For a new database, generate a pepper locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` and save the output in the host's secret settings as `AUTH_PEPPER`. Do not commit it or share it in chat. Create a Turso database, get its database URL and auth token, and add them as `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Set `NODE_ENV=production` in the host environment.

To migrate existing local accounts to an empty Turso database, install dependencies locally, configure the two Turso variables (for example in a private `.env.local` file), and run:

```powershell
npm.cmd run migrate:turso
```

The migration copies account hashes, roles, email addresses, signing public keys, and related account fields. It refuses to run if the remote `users` table is not empty. It does not copy browser-held private signing keys. Keep `.env.local` private.

## Email and administrator approval

Public sign-ups create pending viewer accounts. The applicant receives a request-received email, an administrator receives an access-request email, and the applicant cannot sign in until an admin approves the request in the dashboard. The admin's decision is emailed to the applicant. These are sign-up and approval notices, not a message after every sign-in. Accounts created directly by an admin and existing accounts remain approved.

Email is sent through the Resend email API. Add these values to the local environment or your hosting provider's private environment settings:

```text
RESEND_API_KEY=your_private_resend_api_key
EMAIL_FROM=Den Promise <access@your-verified-domain.example>
ADMIN_EMAIL=admin@your-domain.example
APP_URL=https://your-production-domain.example
```

Verify the sender domain with Resend before using a production sender. `ADMIN_EMAIL` can be omitted if an approved admin account already has an email address. Production self-signup stays disabled until mail delivery and an admin notification address are configured. See [Resend's Node.js email guide](https://resend.com/nodejs).

### Google sign-in

Create a Google OAuth client ID with application type **Web application**. Add the app's exact origins under **Authorized JavaScript origins** (for local development, `http://127.0.0.1:8001`; add your HTTPS production origin when deploying), then set this environment variable:

```text
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

The Google button appears only when this value is configured. Google verifies the identity token on the server. A first-time Google sign-in creates a pending viewer request, emails the verified Google address and administrator, and cannot access the app until approved. Returning approved Google users sign in normally. Google sign-in will not automatically link to an existing account with the same email; contact the administrator to avoid taking over or duplicating an account. Configure Resend as above to deliver signup and approval emails.

Turso Cloud provides continuous backups and point-in-time restore; the retention window depends on the current plan. For local SQLite, the app automatically snapshots the database when opened, after database changes, and every 24 hours while the server is running. It keeps the latest daily encrypted database and pepper snapshots for seven days under the `backups` folder inside `AUTH_DATA_DIR`.

Local snapshot files use AES-256-GCM authenticated encryption with a fresh random nonce per file. The 32-byte encryption key is generated once at `AUTH_DATA_DIR/backup.key`; keep that key safe and separate from copied backup files. You can instead set `BACKUP_ENCRYPTION_KEY` to a 32-byte key encoded as 64 hex characters or base64url. Keep the same key to decrypt old backups. To restore, preserve that key (or set the same environment key), then run this with the backup's date:

```powershell
npm.cmd run restore:backup -- 2026-10-10
```

The restore command checks SQLite integrity and writes the restored database and pepper into a new `restored-...` directory. Set `AUTH_DATA_DIR` to that directory before starting the app if you want to run the restored copy.

## Cryptographic protections

- Passwords are pre-hashed with HMAC-SHA-256 using a server-side pepper, then hashed with bcrypt cost 12. Older bcrypt hashes are upgraded after a successful sign-in.
- Session cookies are authenticated with HMAC-SHA-256 using a session key derived with HKDF; cookie signatures are compared in constant time.
- Signed statements use ECDSA P-256 with SHA-256 through the browser Web Crypto API. Private signing keys stay in browser IndexedDB; the server stores public keys.
- Local automatic backups use AES-256-GCM, which encrypts backup contents and detects tampering. Turso Cloud manages backups and point-in-time restore for remote databases.

## Existing local data

The local Node app and migration script use:

```text
%LOCALAPPDATA%\NorthstarAccess\northstar.sqlite
%LOCALAPPDATA%\NorthstarAccess\pepper.key
```

If the previous PHP app used `AUTH_DATA_DIR` or `AUTH_PEPPER`, keep those same values. The password hash format and database schema remain compatible with the prior PHP version.

## Account and signature behavior

- Users sign in with username or email and password.
- Viewer sign-up becomes available after initial admin setup.
- Admins get the team dashboard, where they can review requests, view the account directory, create accounts, remove other accounts, and edit their public profile picture and short bio. Admin profile details appear in the community directory. The final admin and the currently signed-in account cannot be removed.
- Staff and viewers get a separate personal dashboard and cannot view the account directory or admin controls.
- All signed-in members can update their own email address.
- Signed-in members can sign statements with ECDSA P-256/SHA-256. Public keys are stored with the account. Private signing keys remain in browser IndexedDB and are not part of database migration or backup.

Keep production behind HTTPS. Production cookies use the Secure attribute when `NODE_ENV=production`. Changing the session key derivation signs out existing sessions once; users can sign in again.
