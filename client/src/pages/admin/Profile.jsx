import { useState } from 'react'
import { Card, Input, Button } from '../../components/ui'
import { adminProfile } from '../../mock/data'

export default function Profile() {
  const [form, setForm] = useState(adminProfile)
  const [saved, setSaved] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const initials = form.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setSaved(false)
    }
  }

  function updatePassword(field) {
    return (e) => {
      setPasswords((p) => ({ ...p, [field]: e.target.value }))
      setPasswordSaved(false)
    }
  }

  function handleProfileSubmit(e) {
    e.preventDefault()
    // TODO: wire up to PUT /api/admin/profile once the Express backend exists.
    setSaved(true)
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    if (passwords.next !== passwords.confirm) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    // TODO: wire up to POST /api/admin/change-password once the Express backend exists.
    setPasswordError('')
    setPasswordSaved(true)
    setPasswords({ current: '', next: '', confirm: '' })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Profile</h1>
        <p className="text-sm text-ink/70">Manage your admin account details.</p>
      </div>

      <Card>
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-lg font-semibold text-linen shadow-sm">
            {initials}
          </div>
          <div>
            <p className="text-lg font-medium text-ink">{form.name}</p>
            <p className="text-sm text-ink/60">{form.role}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleProfileSubmit}>
          <Input id="name" label="Name" value={form.name} onChange={update('name')} required />
          <Input id="email" label="Email" type="email" value={form.email} onChange={update('email')} required />
          <Input id="phone" label="Phone" value={form.phone} onChange={update('phone')} required />
          <div className="flex items-center gap-4 pt-2">
            <Button type="submit">Save Changes</Button>
            {saved && <p className="text-sm text-green-livedin">Profile saved.</p>}
          </div>
        </form>
      </Card>

      <Card title="Change Password">
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <Input
            id="currentPassword"
            label="Current Password"
            type="password"
            value={passwords.current}
            onChange={updatePassword('current')}
            required
          />
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            value={passwords.next}
            onChange={updatePassword('next')}
            required
          />
          <Input
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            value={passwords.confirm}
            onChange={updatePassword('confirm')}
            error={passwordError}
            required
          />
          <div className="flex items-center gap-4 pt-2">
            <Button type="submit" variant="secondary">
              Update Password
            </Button>
            {passwordSaved && <p className="text-sm text-green-livedin">Password updated.</p>}
          </div>
        </form>
      </Card>
    </div>
  )
}
