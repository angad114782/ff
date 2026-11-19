import { useState } from 'react'
import { Card, Input, Button } from '../../components/ui'
import { api } from '../../api'
import { useApp } from '../../context/AppContext'

export default function Profile() {
  const { currentUser, setCurrentUser } = useApp()
  const [form, setForm] = useState({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone })
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const initials = currentUser.name
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

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setProfileError('')
    try {
      const { user } = await api.put('/api/auth/profile', form)
      setCurrentUser(user)
      setSaved(true)
    } catch (err) {
      setProfileError(err.message)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordSaved(false)
    if (passwords.next.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    try {
      await api.post('/api/auth/change-password', { current: passwords.current, next: passwords.next })
      setPasswordError('')
      setPasswordSaved(true)
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPasswordError(err.message)
    }
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
            <p className="text-lg font-medium text-ink">{currentUser.name}</p>
            <p className="text-sm text-ink/60">Administrator</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleProfileSubmit}>
          <Input id="name" label="Name" value={form.name} onChange={update('name')} required />
          <Input id="email" label="Email" type="email" value={form.email} onChange={update('email')} required />
          <Input id="phone" label="Phone" value={form.phone} onChange={update('phone')} />
          {profileError && <p className="text-sm text-terracotta-deep">{profileError}</p>}
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
