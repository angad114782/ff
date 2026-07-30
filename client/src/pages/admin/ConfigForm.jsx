import { useState } from 'react'
import { Card, Input, Button } from '../../components/ui'

const ERP_PROVIDERS = [
  { value: 'business_central', label: 'Microsoft Business Central' },
  { value: 'other', label: 'Other ERP' },
]

const initialState = {
  erpProvider: 'business_central',
  bcClientId: '',
  bcClientSecret: '',
  bcTenantId: '',
  otherErpName: '',
  otherErpBaseUrl: '',
  otherErpApiKey: '',
  dealerLogin: '',
  dealerApiKey: '',
  ftpEnabled: false,
  ftpHost: '',
  ftpPort: '21',
  ftpUsername: '',
  ftpPassword: '',
  ftpPath: '/',
  ftpSyncFrequency: '360',
  domain: '',
  hostingPreference: 'shared',
}

export default function ConfigForm() {
  const [form, setForm] = useState(initialState)
  const [saved, setSaved] = useState(false)

  function update(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setForm((f) => ({ ...f, [field]: value }))
      setSaved(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: wire up to POST /api/admin/config once the Express backend exists.
    // Credentials must be sent over HTTPS and stored encrypted server-side, never in client state beyond this form.
    setSaved(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">API Configuration</h1>
        <p className="text-sm text-ink/70">Connect an ERP (via API or FTP), the dealer portal, and hosting.</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card title="ERP Data Source — API">
          <p className="mb-4 text-xs text-ink/60">
            Live pull straight from the ERP's REST API. Pick your provider — Business Central uses OAuth
            (Client ID/Secret/Tenant); any other ERP just needs its API base URL and key.
          </p>

          <div className="mb-4 flex rounded-lg border border-sage-grey p-1 md:w-fit">
            {ERP_PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, erpProvider: p.value }))}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  form.erpProvider === p.value ? 'bg-terracotta text-linen shadow-sm' : 'text-ink hover:bg-sand'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {form.erpProvider === 'business_central' ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Input id="bcClientId" label="Client ID" value={form.bcClientId} onChange={update('bcClientId')} />
              <Input
                id="bcClientSecret"
                label="Client Secret"
                type="password"
                value={form.bcClientSecret}
                onChange={update('bcClientSecret')}
              />
              <Input id="bcTenantId" label="Tenant ID" value={form.bcTenantId} onChange={update('bcTenantId')} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                id="otherErpName"
                label="ERP Name"
                placeholder="e.g. SAP, Zoho, Tally"
                value={form.otherErpName}
                onChange={update('otherErpName')}
              />
              <Input
                id="otherErpBaseUrl"
                label="API Base URL"
                placeholder="https://erp.example.com/api"
                value={form.otherErpBaseUrl}
                onChange={update('otherErpBaseUrl')}
              />
              <Input
                id="otherErpApiKey"
                label="API Key"
                type="password"
                value={form.otherErpApiKey}
                onChange={update('otherErpApiKey')}
              />
            </div>
          )}
        </Card>

        <Card title="ERP Data Source — FTP">
          <div className="mb-4 flex items-center justify-between">
            <p className="max-w-xl text-xs text-ink/60">
              For ERPs without an API: they drop a stock CSV/Excel file on their FTP server on a schedule, and
              our backend connects out to pull the latest file periodically (not real-time). Use this instead
              of — or alongside — the API source above.
            </p>
            <label className="ml-4 flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={form.ftpEnabled}
                onChange={update('ftpEnabled')}
                className="h-4 w-4 cursor-pointer accent-terracotta"
              />
              Enable FTP source
            </label>
          </div>

          {form.ftpEnabled && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="ftpHost"
                label="Host"
                placeholder="ftp.erp-vendor.com"
                value={form.ftpHost}
                onChange={update('ftpHost')}
              />
              <Input id="ftpPort" label="Port" value={form.ftpPort} onChange={update('ftpPort')} />
              <Input id="ftpUsername" label="Username" value={form.ftpUsername} onChange={update('ftpUsername')} />
              <Input
                id="ftpPassword"
                label="Password"
                type="password"
                value={form.ftpPassword}
                onChange={update('ftpPassword')}
              />
              <Input
                id="ftpPath"
                label="Remote Folder Path"
                placeholder="/exports/stock"
                value={form.ftpPath}
                onChange={update('ftpPath')}
              />
              <div>
                <label htmlFor="ftpSyncFrequency" className="mb-1 block text-sm font-medium text-ink">
                  Pull Frequency
                </label>
                <select
                  id="ftpSyncFrequency"
                  value={form.ftpSyncFrequency}
                  onChange={update('ftpSyncFrequency')}
                  className="w-full rounded-md border border-sage-grey px-3 py-2.5 text-sm outline-none transition-colors duration-150 hover:border-sage-soft focus:border-terracotta focus:ring-2 focus:ring-terracotta/40"
                >
                  <option value="60">Every hour</option>
                  <option value="360">Every 6 hours</option>
                  <option value="1440">Once a day</option>
                </select>
              </div>
            </div>
          )}
        </Card>

        <Card title="Dealer Portal">
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="dealerLogin" label="Login" value={form.dealerLogin} onChange={update('dealerLogin')} />
            <Input
              id="dealerApiKey"
              label="API Key"
              type="password"
              value={form.dealerApiKey}
              onChange={update('dealerApiKey')}
            />
          </div>
        </Card>

        <Card title="Domain & Hosting">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="domain"
              label="Domain"
              placeholder="stock.fandf.in"
              value={form.domain}
              onChange={update('domain')}
            />
            <div>
              <label htmlFor="hostingPreference" className="mb-1 block text-sm font-medium text-ink">
                Hosting Preference
              </label>
              <select
                id="hostingPreference"
                value={form.hostingPreference}
                onChange={update('hostingPreference')}
                className="w-full rounded-md border border-sage-grey px-3 py-2.5 text-sm outline-none transition-colors duration-150 hover:border-sage-soft focus:border-terracotta focus:ring-2 focus:ring-terracotta/40"
              >
                <option value="shared">Shared Hosting</option>
                <option value="cloud">Cloud (AWS/Azure)</option>
                <option value="dedicated">Dedicated Server</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit">Save Configuration</Button>
          {saved && <p className="text-sm text-green-livedin">Configuration saved.</p>}
        </div>
      </form>
    </div>
  )
}
