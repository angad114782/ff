import { useEffect, useState } from 'react'
import { Card, Input, Button } from '../../components/ui'
import { api } from '../../api'

const emptyBc = { tenantId: '', environment: '', company: '', clientId: '', clientSecret: '' }

export default function ConfigForm() {
  // Business Central is the primary API and is persisted server-side; the secret is
  // write-only, so `hasSecret` just says whether one is already stored.
  const [bc, setBc] = useState(emptyBc)
  const [hasSecret, setHasSecret] = useState(false)
  const [bcStatus, setBcStatus] = useState({ kind: '', message: '' }) // kind: 'ok' | 'error' | 'busy'

  useEffect(() => {
    api
      .get('/api/admin/config/bc')
      .then(({ hasClientSecret, odataRoot: _root, ...rest }) => {
        setBc({ ...emptyBc, ...rest, clientSecret: '' })
        setHasSecret(hasClientSecret)
      })
      .catch((err) => setBcStatus({ kind: 'error', message: err.message }))
  }, [])

  function updateBc(field) {
    return (e) => {
      setBc((b) => ({ ...b, [field]: e.target.value }))
      setBcStatus({ kind: '', message: '' })
    }
  }

  async function saveBc() {
    setBcStatus({ kind: 'busy', message: 'Saving…' })
    try {
      const { hasClientSecret } = await api.put('/api/admin/config/bc', bc)
      setHasSecret(hasClientSecret)
      setBc((b) => ({ ...b, clientSecret: '' }))
      setBcStatus({ kind: 'ok', message: 'Business Central settings saved.' })
    } catch (err) {
      setBcStatus({ kind: 'error', message: err.message })
    }
  }

  async function testBc() {
    setBcStatus({ kind: 'busy', message: 'Testing connection…' })
    try {
      await api.post('/api/admin/config/bc/test')
      setBcStatus({ kind: 'ok', message: 'Connected — Business Central responded.' })
    } catch (err) {
      setBcStatus({ kind: 'error', message: err.message })
    }
  }

  const odataRoot = `https://api.businesscentral.dynamics.com/v2.0/${bc.tenantId || '{tenant_id}'}/${bc.environment || '{environment}'}/ODataV4`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">API Configuration</h1>
        <p className="text-sm text-ink/70">Connect the primary API. Vendors and their APIs are added under Vendors.</p>
      </div>

      <div className="space-y-6">
        <Card title="Primary API — Microsoft Business Central">
          <p className="mb-4 text-xs text-ink/60">
            Stock search (item no, name, SKU, barcode) runs live against Business Central. Credentials are
            saved on the server and the secret is never shown again once stored.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Input id="bcTenantId" label="Tenant ID" value={bc.tenantId} onChange={updateBc('tenantId')} />
            <Input
              id="bcEnvironment"
              label="Environment"
              placeholder="PRODUCTION"
              value={bc.environment}
              onChange={updateBc('environment')}
            />
            <Input id="bcClientId" label="Client ID" value={bc.clientId} onChange={updateBc('clientId')} />
            <Input
              id="bcClientSecret"
              label="Client Secret"
              type="password"
              placeholder={hasSecret ? '•••••••• (saved — leave blank to keep)' : ''}
              value={bc.clientSecret}
              onChange={updateBc('clientSecret')}
            />
            <Input
              id="bcCompany"
              label="Company"
              placeholder="F&F India Pvt. Limited."
              value={bc.company}
              onChange={updateBc('company')}
              className="md:col-span-2"
            />
          </div>

          <div className="mt-4 space-y-1 rounded-md bg-sand/50 p-3 text-xs text-ink/70">
            <p>
              <span className="font-medium text-ink">OData root: </span>
              <span className="break-all">{odataRoot}</span>
            </p>
            <p>
              <span className="font-medium text-ink">Search endpoint: </span>
              <span className="break-all">
                {odataRoot}/TradeApp_API_SearchStock?company={encodeURIComponent(bc.company || '{company}')}
              </span>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={saveBc} disabled={bcStatus.kind === 'busy'}>
              Save Business Central
            </Button>
            <Button type="button" variant="secondary" onClick={testBc} disabled={bcStatus.kind === 'busy'}>
              Test Connection
            </Button>
            {bcStatus.message && (
              <p
                className={`text-sm ${
                  bcStatus.kind === 'ok'
                    ? 'text-green-livedin'
                    : bcStatus.kind === 'error'
                      ? 'text-terracotta-deep'
                      : 'text-ink/60'
                }`}
              >
                {bcStatus.message}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
