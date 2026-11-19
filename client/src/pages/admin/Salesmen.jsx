import { useState } from 'react'
import { api } from '../../api'
import { useFetch } from '../../hooks/useFetch'
import { Card, Table, Button, Modal, Input, Badge, Toggle, TableSkeleton } from '../../components/ui'

const emptyForm = { name: '', email: '', phone: '', branch: '', password: '' }
const emptyResetForm = { password: '', confirm: '' }

export default function Salesmen() {
  const { data, loading: isLoading, error: loadError, reload } = useFetch('/api/admin/salesmen')
  const salesmen = data?.salesmen ?? []
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetForm, setResetForm] = useState(emptyResetForm)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(salesman) {
    setEditingId(salesman.id)
    setForm({ ...emptyForm, name: salesman.name, email: salesman.email, phone: salesman.phone, branch: salesman.branch })
    setFormError('')
    setModalOpen(true)
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      if (editingId) await api.put(`/api/admin/salesmen/${editingId}`, form)
      else await api.post('/api/admin/salesmen', form)
      setModalOpen(false)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleActive(id, nextActive) {
    setPageError('')
    try {
      await api.patch(`/api/admin/salesmen/${id}/active`, { active: nextActive })
      reload()
    } catch (err) {
      setPageError(err.message)
    }
  }

  function openReset(salesman) {
    setResetTarget(salesman)
    setResetForm(emptyResetForm)
    setResetError('')
    setResetSuccess(false)
    setResetOpen(true)
  }

  function updateReset(field) {
    return (e) => {
      setResetForm((f) => ({ ...f, [field]: e.target.value }))
      setResetError('')
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    if (resetForm.password.length < 8) {
      setResetError('Password must be at least 8 characters.')
      return
    }
    if (resetForm.password !== resetForm.confirm) {
      setResetError('Passwords do not match.')
      return
    }
    try {
      await api.post(`/api/admin/salesmen/${resetTarget.id}/reset-password`, { password: resetForm.password })
      setResetSuccess(true)
    } catch (err) {
      setResetError(err.message)
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'branch', label: 'Branch' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Toggle
            checked={row.active}
            onChange={(next) => handleToggleActive(row.id, next)}
            label={`Toggle ${row.name} active status`}
          />
          <Badge variant={row.active ? 'success' : 'neutral'}>{row.active ? 'Active' : 'Inactive'}</Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="text-sm font-medium text-terracotta transition-colors hover:text-terracotta-deep hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => openReset(row)}
            className="text-sm font-medium text-terracotta transition-colors hover:text-terracotta-deep hover:underline"
          >
            Reset Password
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Salesmen</h1>
          <p className="text-sm text-ink/70">Manage the salesman roster across branches.</p>
        </div>
        <Button onClick={openAdd}>Add Salesman</Button>
      </div>

      {(pageError || loadError) && <p className="text-sm text-terracotta-deep">{pageError || loadError}</p>}

      <Card>
        {isLoading && !data ? (
          <TableSkeleton columns={5} rows={3} />
        ) : (
          <Table columns={columns} rows={salesmen} emptyMessage="No salesmen added yet." />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Salesman' : 'Add Salesman'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input id="name" label="Name" value={form.name} onChange={update('name')} required />
          <Input id="email" label="Email" type="email" value={form.email} onChange={update('email')} required />
          <Input id="phone" label="Phone" value={form.phone} onChange={update('phone')} required />
          <Input id="branch" label="Branch" value={form.branch} onChange={update('branch')} required />
          {!editingId && (
            <Input
              id="initialPassword"
              label="Initial Password"
              type="password"
              minLength={8}
              value={form.password}
              onChange={update('password')}
              required
            />
          )}
          {formError && <p className="text-sm text-terracotta-deep">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {editingId ? 'Save Changes' : 'Add Salesman'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title={`Reset Password — ${resetTarget?.name ?? ''}`}>
        {resetSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-green-livedin">Password reset for {resetTarget?.name}.</p>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleResetSubmit}>
            <Input
              id="newPassword"
              label="New Password"
              type="password"
              value={resetForm.password}
              onChange={updateReset('password')}
              required
            />
            <Input
              id="confirmResetPassword"
              label="Confirm Password"
              type="password"
              value={resetForm.confirm}
              onChange={updateReset('confirm')}
              error={resetError}
              required
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Reset Password</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
