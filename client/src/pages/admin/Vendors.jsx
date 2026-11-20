import { useRef, useState } from 'react'
import { Card, Table, Button, Modal, Input, Badge, Toggle, TableSkeleton } from '../../components/ui'
import FieldMapper from '../../components/FieldMapper'
import { api } from '../../api'
import { useFetch } from '../../hooks/useFetch'

const emptyForm = {
  name: '',
  method: 'GET',
  url: '',
  body: '',
  authType: 'none',
  authName: '',
  authSecret: '',
  authConfig: {
    loginUrl: '',
    tokenPath: 'token',
    loginBody: '',
    tokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
    headers: [{ name: '', value: '' }],
  },
  resolve: { url: '', match: '', id: '' },
  mapping: { match: '', total: '', list: '', label: '', qty: '', poQty: '', poExpected: '' },
}

const AUTH_OPTIONS = [
  { value: 'none', label: 'No login needed' },
  { value: 'bearer', label: 'Token (Bearer)' },
  { value: 'header', label: 'API key in a header' },
  { value: 'query', label: 'API key in the web address' },
  { value: 'basic', label: 'Username & password' },
  { value: 'login', label: 'Log in first, then use the token' },
  { value: 'oauth2', label: 'OAuth 2 (client ID & secret)' },
  { value: 'headers', label: 'Several custom headers' },
]

const OTHER = '__other__'

const selectClass =
  'w-full rounded-md border border-sage-grey bg-linen px-3 py-2.5 text-sm outline-none transition-colors duration-150 hover:border-sage-soft focus:border-terracotta focus:ring-2 focus:ring-terracotta/40'

function Select({ id, label, value, onChange, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <select id={id} value={value} onChange={onChange} className={selectClass}>
        {children}
      </select>
      {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  )
}

export default function Vendors() {
  const { data, loading, error: loadError, reload } = useFetch('/api/admin/vendors')
  const vendors = data?.vendors ?? []
  const { data: primary } = useFetch('/api/admin/vendors/primary-names')
  const primaryNames = primary?.names ?? []

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1) // 1 = vendor & connection, 2 = match the fields
  const [typeName, setTypeName] = useState(false)
  const [editing, setEditing] = useState(null) // vendor being edited, or null for a new one
  const [form, setForm] = useState(emptyForm)
  const [hasSecret, setHasSecret] = useState(false)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')

  const [sampleId, setSampleId] = useState('')
  const [probe, setProbe] = useState(null) // { ok, error, paths, preview }
  const testRef = useRef(0)

  function openForm(vendor) {
    setEditing(vendor ?? null)
    setForm(
      vendor
        ? {
            ...emptyForm,
            ...vendor,
            authSecret: '',
            authConfig: { ...emptyForm.authConfig, ...vendor.authConfig, headers: vendor.authConfig?.headers?.length ? vendor.authConfig.headers : emptyForm.authConfig.headers },
            mapping: { ...emptyForm.mapping, ...vendor.mapping },
            resolve: { ...emptyForm.resolve, ...vendor.resolve },
          }
        : emptyForm,
    )
    setStep(1)
    setTypeName(false)
    setHasSecret(Boolean(vendor?.hasSecret))
    setFormError('')
    setProbe(null)
    setSampleId('')
    setOpen(true)
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const updateAuth = (field) => (e) => setForm((f) => ({ ...f, authConfig: { ...f.authConfig, [field]: e.target.value } }))
  const setHeader = (i, field, value) =>
    setForm((f) => ({
      ...f,
      authConfig: { ...f.authConfig, headers: f.authConfig.headers.map((h, j) => (j === i ? { ...h, [field]: value } : h)) },
    }))
  const addHeader = () => setForm((f) => ({ ...f, authConfig: { ...f.authConfig, headers: [...f.authConfig.headers, { name: '', value: '' }] } }))
  const removeHeader = (i) =>
    setForm((f) => ({ ...f, authConfig: { ...f.authConfig, headers: f.authConfig.headers.filter((_, j) => j !== i) } }))

  // "Config": call their API with the sample item, and on success move on to matching fields.
  async function goConfig() {
    const result = await runTest()
    if (result?.ok) setStep(2)
  }

  const payload = () => ({ ...form, id: editing?.id })

  async function runTest(mapping = form.mapping) {
    const requestId = ++testRef.current
    setBusy(true)
    setFormError('')
    try {
      const result = await api.post('/api/admin/vendors/test', { ...payload(), mapping, externalItemId: sampleId })
      if (requestId === testRef.current) setProbe(result)
      return result
    } catch (err) {
      if (requestId === testRef.current) {
        setProbe(null)
        setFormError(err.message)
      }
      return null
    } finally {
      if (requestId === testRef.current) setBusy(false)
    }
  }

  // Every new wire re-runs the test, so the preview always matches what is connected.
  function changeMapping(mapping) {
    setForm((f) => ({ ...f, mapping }))
    runTest(mapping)
  }

  async function save(e) {
    e.preventDefault()
    if (step === 1) return sampleId.trim() && form.url.trim() ? goConfig() : undefined // Enter on step 1 = Config
    setBusy(true)
    setFormError('')
    try {
      if (editing) await api.put(`/api/admin/vendors/${editing.id}`, payload())
      else await api.post('/api/admin/vendors', payload())
      setOpen(false)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(id, active) {
    setPageError('')
    try {
      await api.patch(`/api/admin/vendors/${id}/active`, { active })
      reload()
    } catch (err) {
      setPageError(err.message)
    }
  }

  async function remove(vendor) {
    if (!window.confirm(`Remove ${vendor.name}? Its stock will no longer show on items.`)) return
    setPageError('')
    try {
      await api.del(`/api/admin/vendors/${vendor.id}`)
      reload()
    } catch (err) {
      setPageError(err.message)
    }
  }

  const columns = [
    { key: 'name', label: 'Vendor' },
    {
      key: 'url',
      label: 'API',
      render: (row) => {
        try {
          return <span className="text-ink/70">{new URL(row.url.replace(/\{\{[^}]*\}\}/g, 'x')).host}</span>
        } catch {
          return <span className="text-ink/70">—</span>
        }
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Toggle checked={row.active} onChange={(next) => toggleActive(row.id, next)} label={`Toggle ${row.name}`} />
          <Badge variant={row.active ? 'success' : 'neutral'}>{row.active ? 'On' : 'Off'}</Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-3">
          {/* <button type="button" onClick={() => openForm(row)} className="text-sm font-medium text-terracotta hover:text-terracotta-deep hover:underline">
            Edit
          </button> */}
          <button type="button" onClick={() => remove(row)} className="text-sm font-medium text-terracotta-deep hover:underline">
            Remove
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Vendors</h1>
          <p className="text-sm text-ink/70">
            Connect each vendor's stock API. When an item's vendor matches a name here, its stock is shown on the item.
          </p>
        </div>
        <Button onClick={() => openForm()}>Add Vendor</Button>
      </div>

      {(pageError || loadError) && <p className="text-sm text-terracotta-deep">{pageError || loadError}</p>}

      <Card>
        {loading && !data ? (
          <TableSkeleton columns={4} rows={3} />
        ) : (
          <Table columns={columns} rows={vendors} emptyMessage="No vendors connected yet." onRowClick={openForm} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : 'Add Vendor'}
        size="xl"
        footer={
          <div className="flex justify-between gap-3">
            {step === 2 ? (
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            )}
            {step === 2 && (
              <Button type="submit" form="vendorForm" disabled={busy}>
                {editing ? 'Save Changes' : 'Submit'}
              </Button>
            )}
          </div>
        }
      >
        <form id="vendorForm" className="space-y-5" onSubmit={save}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
            Step {step} of 2 · {step === 1 ? 'Vendor & connection' : 'Match the fields'}
          </p>

          {step === 1 && (
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="space-y-5">
              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/60">1 · Vendor</h4>
                {primaryNames.length > 0 && !typeName && (!form.name || primaryNames.includes(form.name)) ? (
                  <Select
                    id="vName"
                    label="Vendor (from the primary API)"
                    value={primaryNames.includes(form.name) ? form.name : form.name ? OTHER : ''}
                    onChange={(e) => {
                      if (e.target.value === OTHER) setTypeName(true)
                      else setForm((f) => ({ ...f, name: e.target.value }))
                    }}
                    hint="These are the PrimaryVendorName values found on your items."
                  >
                    <option value="">Choose a vendor…</option>
                    {primaryNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value={OTHER}>Not listed — type it</option>
                  </Select>
                ) : (
                  <>
                    <Input
                      id="vName"
                      label="Vendor name"
                      placeholder="R.R.DECOR (P) LTD."
                      value={form.name}
                      onChange={update('name')}
                      required
                    />
                    <p className="-mt-2 text-xs text-ink/60">
                      {primary?.note ?? 'Type it exactly as PrimaryVendorName appears on items.'}
                      {primaryNames.length > 0 && (
                        <button type="button" className="ml-2 text-terracotta hover:underline" onClick={() => setTypeName(false)}>
                          Pick from list
                        </button>
                      )}
                    </p>
                  </>
                )}
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/60">2 · Login (automatic)</h4>
                <p className="-mt-2 text-xs text-ink/60">
                  If the vendor needs a login, set it up here once. Before every stock check we log in ourselves and use the token we get back, so you never paste a token. Nothing from the login reply needs matching.
                </p>
                <Select id="vAuth" label="How do we log in?" value={form.authType} onChange={update('authType')}>
                  {AUTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>

                {['header', 'query', 'basic', 'bearer'].includes(form.authType) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {form.authType !== 'bearer' && (
                      <Input
                        id="vAuthName"
                        label={form.authType === 'basic' ? 'Username' : form.authType === 'header' ? 'Header name' : 'Parameter name'}
                        placeholder={form.authType === 'basic' ? '' : 'x-api-key'}
                        value={form.authName}
                        onChange={update('authName')}
                      />
                    )}
                    <Input
                      id="vSecret"
                      label={form.authType === 'basic' ? 'Password' : form.authType === 'bearer' ? 'Token' : 'Key'}
                      type="password"
                      placeholder={hasSecret ? '•••••••• (saved — leave blank to keep)' : ''}
                      value={form.authSecret}
                      onChange={update('authSecret')}
                    />
                  </div>
                )}

                {form.authType === 'login' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                      <Input
                        id="vLoginUrl"
                        label="Login web address (POST)"
                        placeholder="https://api.vendor.com/api/v1/auth/login"
                        value={form.authConfig.loginUrl}
                        onChange={updateAuth('loginUrl')}
                      />
                      <Input
                        id="vTokenPath"
                        label="Token field in reply"
                        placeholder="token"
                        value={form.authConfig.tokenPath}
                        onChange={updateAuth('tokenPath')}
                      />
                    </div>
                    <div>
                      <label htmlFor="vLoginBody" className="mb-1 block text-sm font-medium text-ink">
                        Login details to send (JSON)
                      </label>
                      <textarea
                        id="vLoginBody"
                        rows={4}
                        value={form.authConfig.loginBody}
                        onChange={updateAuth('loginBody')}
                        placeholder={hasSecret ? '•••••••• (saved — leave blank to keep)' : '{ "login_id": "...", "password": "..." }'}
                        className={`${selectClass} font-mono`}
                      />
                      <p className="mt-1 text-xs text-ink/60">Saved encrypted and never shown again. The returned token is sent as a Bearer token on each stock call.</p>
                    </div>
                  </div>
                )}

                {form.authType === 'oauth2' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input id="vTokenUrl" label="Token web address" value={form.authConfig.tokenUrl} onChange={updateAuth('tokenUrl')} />
                    <Input id="vScope" label="Scope (optional)" value={form.authConfig.scope} onChange={updateAuth('scope')} />
                    <Input id="vClientId" label="Client ID" value={form.authConfig.clientId} onChange={updateAuth('clientId')} />
                    <Input
                      id="vClientSecret"
                      label="Client secret"
                      type="password"
                      placeholder={hasSecret ? '•••••••• (saved — leave blank to keep)' : ''}
                      value={form.authConfig.clientSecret}
                      onChange={updateAuth('clientSecret')}
                    />
                  </div>
                )}

                {form.authType === 'headers' && (
                  <div className="space-y-2">
                    {form.authConfig.headers.map((h, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                        <Input id={`vHN${i}`} label={i === 0 ? 'Header name' : undefined} placeholder="x-api-key" value={h.name} onChange={(e) => setHeader(i, 'name', e.target.value)} />
                        <Input
                          id={`vHV${i}`}
                          label={i === 0 ? 'Value' : undefined}
                          type="password"
                          placeholder={hasSecret && h.name ? '•••••••• (saved)' : ''}
                          value={h.value}
                          onChange={(e) => setHeader(i, 'value', e.target.value)}
                        />
                        <button type="button" aria-label="Remove header" onClick={() => removeHeader(i)} className="pb-2.5 text-ink/50 hover:text-terracotta-deep">
                          ×
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addHeader} className="text-sm font-medium text-terracotta hover:underline">
                      + Add header
                    </button>
                  </div>
                )}
                {form.authType === 'none' && /login|auth|token/i.test(form.url) && (
                  <p className="rounded-md bg-sand/60 p-2 text-xs text-terracotta-deep">
                    The stock address below looks like a login address. If the vendor needs a login, choose "Log in first, then use the token" above and put the login address there. The stock address is the one that returns stock.
                  </p>
                )}
              </section>

              </div>
              <div className="space-y-5">
              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/60">3 · Find the vendor's ID first (optional)</h4>
                <p className="text-xs text-ink/60">
                  Only if their stock address needs their own id and not the item name. We search by name first, take the id from the reply, then call the stock address below with that id (write <code className="rounded bg-sand px-1">{'{{externalItemId}}'}</code> there).
                </p>
                <Input
                  id="vResolveUrl"
                  label="Search address (name goes in {{externalItemId}})"
                  placeholder="https://api.vendor.com/fabrics?search={{externalItemId}}"
                  value={form.resolve.url}
                  onChange={(e) => setForm((f) => ({ ...f, resolve: { ...f.resolve, url: e.target.value } }))}
                />
                {form.resolve.url.trim() && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="vResolveMatch"
                      label="Name field (to pick the right row)"
                      placeholder="data.fabrics[0].name"
                      value={form.resolve.match}
                      onChange={(e) => setForm((f) => ({ ...f, resolve: { ...f.resolve, match: e.target.value } }))}
                    />
                    <Input
                      id="vResolveId"
                      label="Id field"
                      placeholder="data.fabrics[0].id"
                      value={form.resolve.id}
                      onChange={(e) => setForm((f) => ({ ...f, resolve: { ...f.resolve, id: e.target.value } }))}
                    />
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/60">4 · Stock check (this reply is matched)</h4>
                <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                  <Select id="vMethod" label="Type" value={form.method} onChange={update('method')}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </Select>
                  <Input
                    id="vUrl"
                    label="Stock web address (returns the stock)"
                    placeholder="https://api.vendor.com/stock/{{externalItemId}}"
                    value={form.url}
                    onChange={update('url')}
                    required
                  />
                </div>
                <p className="-mt-2 text-xs text-ink/60">
                  Write <code className="rounded bg-sand px-1">{'{{externalItemId}}'}</code> where the item number should go (it comes from the primary API's ExternalItemId). If their API always returns all items, leave it out.
                </p>

                {form.method === 'POST' && (
                  <div>
                    <label htmlFor="vBody" className="mb-1 block text-sm font-medium text-ink">
                      Request body (JSON)
                    </label>
                    <textarea
                      id="vBody"
                      rows={3}
                      value={form.body}
                      onChange={update('body')}
                      placeholder={'{ "sku": "{{externalItemId}}" }'}
                      className={`${selectClass} font-mono`}
                    />
                  </div>
                )}

              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/60">5 · Try it</h4>
                <div className="flex gap-3">
                  <Input
                    id="vSample"
                    placeholder="A vendor item number, e.g. GE02440"
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" disabled={busy || !sampleId.trim() || !form.url.trim()} onClick={goConfig}>
                    {busy ? 'Connecting…' : 'Config →'}
                  </Button>
                </div>
                <p className="text-xs text-ink/60">Config logs in (if set), calls the stock address with this item, and opens the next step where you match the stock reply.</p>
              </section>
              </div>
            </div>
          )}

          {step === 2 && probe?.ok && (
            <section className="space-y-4">
              <p className="text-xs text-ink/60">
                Connected to <span className="font-medium text-ink">{form.name || 'the vendor'}</span>{['login', 'oauth2'].includes(form.authType) ? ' — logged in automatically' : ''}. Left: fields from their reply. Right: the primary API field each one stands for. Drag a field up or down until it sits in the same row, or tap a field and then tap its row.
              </p>
              <FieldMapper paths={probe.paths} mapping={form.mapping} onChange={changeMapping} />

              <div className="rounded-md bg-sand/50 p-3 text-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">Preview</p>
                {probe.preview.matched === false && (
                  <p className="mb-1 text-terracotta-deep">No row in the response has the ID "{sampleId}".</p>
                )}
                <p>
                  Total stock: <span className="font-medium">{probe.preview.stock ?? '—'}</span>
                </p>
                {probe.preview.breakdown.map((b) => (
                  <p key={b.label} className="text-ink/80">
                    {b.label}: <span className="font-medium">{b.qty}</span>
                  </p>
                ))}
                {probe.preview.po && (
                  <p>
                    PO: <span className="font-medium">{probe.preview.po.qty ?? '—'}</span>
                    {probe.preview.po.expected ? ` · expected ${probe.preview.po.expected}` : ''}
                  </p>
                )}
              </div>
            </section>
          )}

          {formError && <p className="text-sm text-terracotta-deep">{formError}</p>}
          {step === 1 && probe && !probe.ok && <p className="text-sm text-terracotta-deep">{probe.error}</p>}

        </form>
      </Modal>
    </div>
  )
}
