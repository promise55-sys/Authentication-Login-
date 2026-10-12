# Den Promise Access

A responsive team login and directory app with a Node.js API. It supports role-based accounts, email sign-in, and browser-held ECDSA signatures.

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
$env:NODE_ENV = "production"
$env:DATABASE_MODE = "sqlite"
$env:AUTH_DATA_DIR = Join-Path (Get-Location) ".local-data"
npm.cmd install
npm.cmd start
```

In Laragon, click **Start All**, open **Menu > Laragon > Terminal**, and run these commands. The PATH line selects Node.js 24 used in this workspace; change it if Node.js is installed elsewhere. Confirm `node --version` prints `v24...`. Then open http://127.0.0.1:8000. Keep the terminal open while you use the app; press **Ctrl+C** to stop it. If port 8000 is busy, run `$env:PORT=8001` before `npm.cmd start` and open http://127.0.0.1:8001. Do not open `index.html` directly or use VS Code Go Live. This uses a separate demo database in the project's ignored `.local-data` folder so your existing accounts are not exposed in the demo. On first use, create an admin account with a unique password of at least 12 characters. Production self-sign-up email requires Resend settings; without them, use an admin-created demo account.

To share a temporary demo link, start the app, open a second Laragon Terminal, and run the command below. Install `cloudflared` from Cloudflare if it is not already installed:

```powershell
& "$env:TEMP\cloudflared.exe" tunnel --url http://127.0.0.1:8000
```

Keep both terminals open and share the generated `trycloudflare.com` URL. Quick Tunnels are temporary demo links; they stop working when the tunnel process exits and are not a production hosting setup. If Cloudflare cannot connect from your network, deploy to a public Node.js host.

In VS Code, you can also press **F5** and select **Run app on port 8000**. This starts the Node server and opens the app at its working local URL.

## Deploy to your chosen hosting provider

This is a standard Node.js web app. Choose a host that can run a long-lived Node.js process and provide persistent storage for SQLite, or use Turso as the remote database. The included `server.js` serves the website and API together.

1. Install Node.js 20 or later and run `npm install` in the project directory.
2. Configure the environment variables below in your host's private settings.
3. Set the host's start command to `npm start`. The server listens on the `PORT` supplied by the host (or port 8000 locally).
4. Use HTTPS in production. Set `NODE_ENV=production` so session cookies are marked secure.

### Database storage

For local SQLite, set `AUTH_DATA_DIR` to a persistent directory on the host. The database, pepper key, backup encryption key, and encrypted daily backups are stored there. Keep this directory across restarts and deployments. Local SQLite is intended for a single app instance; use a shared remote database if you run multiple instances.

For the selected Turso setup, set `DATABASE_MODE=turso`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN`. Configure a stable `AUTH_PEPPER` secret in the host environment; remote database mode requires it. To keep existing accounts working, use the secret inside the outer `*` characters in `%LOCALAPPDATA%\NorthstarAccess\pepper.key` (do not include the `*` characters). Keep it private and do not rotate it unless you are prepared to reset passwords. Production SQLite mode requires `AUTH_DATA_DIR` so the database is placed on an explicitly configured persistent volume.

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

Create a Google OAuth client ID with application type **Web application**. Add the app's exact origins under **Authorized JavaScript origins** (for local development, `http://127.0.0.1:8000`; add your HTTPS production origin when deploying), then set this environment variable:

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
- Admins get the team dashboard, where they can review requests, view the account directory, create accounts, and remove other accounts. The final admin and the currently signed-in account cannot be removed.
- Staff and viewers get a separate personal dashboard and cannot view the account directory or admin controls.
- All signed-in members can update their own email address.
- Signed-in members can sign statements with ECDSA P-256/SHA-256. Public keys are stored with the account. Private signing keys remain in browser IndexedDB and are not part of database migration or backup.

Keep production behind HTTPS. Production cookies use the Secure attribute when `NODE_ENV=production`. Changing the session key derivation signs out existing sessions once; users can sign in again.






