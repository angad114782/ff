# F&F Stock Checker

React PWA (`client/`) + Express API (`server/`). Stock comes live from Microsoft Business Central
(`TradeApp_API_SearchStock`); the app keeps only its own users, activity logs, uploaded media and the
BC connection settings (client secret encrypted with AES-256-GCM).

Requires Node 24+ and a MongoDB database (Atlas, or a local `mongod`).

## Run locally

```sh
npm install
cp server/.env.example server/.env   # set MONGODB_URI (that is the only required setting)
npm run dev:server                   # API on :4000
npm run dev:client                   # Vite on :5173, proxies /api to :4000
npm test                             # API + mapper tests
```

On first visit the site asks you to create the admin account. Then **API Config -> Primary API** to enter the
Business Central Tenant ID, Environment, Company, Client ID and Secret and press *Test Connection*.

## Production

The server serves the built client, so it is one process behind HTTPS (session cookies are `Secure`).

```sh
docker build -t ff-stock .
docker run -d --name ff-stock -p 4000:4000 -e MONGODB_URI='mongodb+srv://…' ff-stock
```

**`MONGODB_URI` is the only required setting.** Session/encryption secrets are generated and stored in the
database, uploaded media is stored in the database (GridFS), and the Business Central and vendor settings are
entered in the admin UI. The first visit shows a one-time "create admin" screen.

- Put it behind a TLS-terminating proxy (hosting platforms do this for you). `TRUST_PROXY` defaults to `1` in production.
- **Back up the database.** Secrets live in it too (collection `settings`, `_id: "secrets"`). To keep the encryption key out of the database, set `APP_ENCRYPTION_KEY` (and `JWT_SECRET`) as env vars instead.
- Moving from the old SQLite version: `MONGODB_URI=… node server/scripts/migrate-sqlite.js server/data/app.db server/data/uploads`.
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
