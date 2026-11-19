# F&F Stock Checker

React PWA (`client/`) + Express API (`server/`). Stock comes live from Microsoft Business Central
(`TradeApp_API_SearchStock`); the app keeps only its own users, activity logs, uploaded media and the
BC connection settings (client secret encrypted with AES-256-GCM).

Requires Node 24+ (uses the built-in `node:sqlite`).

## Run locally

```sh
npm install
cp server/.env.example server/.env   # set ADMIN_EMAIL / ADMIN_PASSWORD; secrets are auto-generated in dev
npm run dev:server                   # API on :4000
npm run dev:client                   # Vite on :5173, proxies /api to :4000
npm test                             # API + mapper tests
```

Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set, then **API Config -> Primary API** to enter the
Business Central Tenant ID, Environment, Company, Client ID and Secret and press *Test Connection*.

## Production

The server serves the built client, so it is one process behind HTTPS (session cookies are `Secure`).

```sh
docker build -t ff-stock .
docker run -d --name ff-stock -p 4000:4000 -v ff-data:/data --env-file server/.env ff-stock
```

Required env: `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (see `server/.env.example`).
The server refuses to start in production without them. Put it behind a TLS-terminating proxy and set
`TRUST_PROXY=1`.

- **Back up the data volume** (`/data`: `app.db` + `uploads/`). Keep `APP_ENCRYPTION_KEY` safe; without it the stored BC secret cannot be decrypted (re-enter it in API Config).
- Changing `JWT_SECRET` signs everyone out.
- Health check: `GET /api/health`.

## Roles

- **Admin**: API config, salesmen, activity logs, dashboard content, full item detail (purchase price, vendor).
- **Salesman**: search / scan and item stock. Cost and vendor data is stripped server-side, not just hidden in the UI.

## Vendor stock / PO

Vendors are set up in **Admin -> Vendors**, with no code per vendor. Enter the API's address and login, press
Test, then drag each response field opposite what it means. A vendor is matched to items by `PrimaryVendorName`
and called with `ExternalItemId`. Total Stock is our stock plus vendor stock; if a vendor is not set up or its
API fails or times out (8s), Total is our stock only. See `docs/13. Integrations.md`.

## Password resets

There is no email delivery. A salesman's *Forgot password* request is recorded under **Logs -> Reset requests**
and an admin sets a new password in **Salesmen**.
