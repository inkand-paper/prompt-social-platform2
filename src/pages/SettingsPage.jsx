// src/pages/SettingsPage.jsx — Profile settings + password change

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile, uploadAvatar } from '../lib/userApi'
import Avatar from '../components/Avatar'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
}

const SETTING_TABS = ['Profile', 'Account', 'Notifications']

export default function SettingsPage() {
  const { user, updateUser } = useAuth() // Block B #4: use updateUser instead of logout
  const [activeTab, setTab] = useState('Profile')

  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website_url: user?.website_url || '',
  })
  const [saving, setSaving]     = useState(false)
  const [saved,  setSaved]      = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await updateProfile(form)
      // Block B #4: Sync local context state
      updateUser(result)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Update failed', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const result = await uploadAvatar(file)
      // Block B #4: Sync local context state with new avatar_url
      updateUser({ avatar_url: result.avatar_url })
    } catch (err) {
      console.error('Avatar upload failed', err)
    } finally {
      setAvatarUploading(false)
    }
  }

  const initials = getInitials(form.display_name || user?.display_name || '')

  return (
    <div className="feed">
      <div className="feed-section settings-page">
        <h1 className="settings-title">Settings</h1>

        {/* Tabs */}
        <div className="feed-header" style={{ marginBottom: 32 }}>
          <div className="feed-tabs">
            {SETTING_TABS.map((tab) => (
              <div
                key={tab}
                className={`feed-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>

        {activeTab === 'Profile' && (
          <form className="settings-form" onSubmit={handleSave}>

            {/* Avatar upload */}
            <div className="settings-section">
              <div className="settings-section-label">Profile Photo</div>
              <div className="avatar-upload-row">
                <Avatar
                  initials={initials}
                  avatarUrl={user?.avatar_url}
                  avatarColor={user?.avatar_color || '#3282B8'}
                  size="lg"
                />
                <div className="avatar-upload-actions">
                  <label className="avatar-upload-btn" htmlFor="avatar-file-input">
                    {avatarUploading ? 'Uploading…' : 'Upload Photo'}
                    <input
                      id="avatar-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                    />
                  </label>
                  <p className="avatar-upload-hint">JPG, PNG or WebP. Max 5MB.</p>
                </div>
              </div>
            </div>

            <div className="settings-divider" />

            {/* Fields */}
            <div className="settings-section">
              <div className="settings-section-label">Basic Info</div>

              <div className="settings-fields">
                <div className="form-group">
                  <label className="form-label" htmlFor="settings-display-name">Display Name</label>
                  <input
                    id="settings-display-name"
                    name="display_name"
                    className="form-input"
                    value={form.display_name}
                    onChange={handleChange}
                    maxLength={80}
                    placeholder="Your name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-bio">Bio</label>
                  <textarea
                    id="settings-bio"
                    name="bio"
                    className="form-input form-textarea"
                    value={form.bio}
                    onChange={handleChange}
                    rows={3}
                    maxLength={300}
                    placeholder="Tell the community about yourself…"
                  />
                  <span className="char-hint">{form.bio.length}/300</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="settings-location">Location</label>
                    <input
                      id="settings-location"
                      name="location"
                      className="form-input"
                      value={form.location}
                      onChange={handleChange}
                      maxLength={100}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="settings-website">Website</label>
                    <input
                      id="settings-website"
                      name="website_url"
                      type="url"
                      className="form-input"
                      value={form.website_url}
                      onChange={handleChange}
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="settings-save-row">
              {saved && <span className="settings-saved-msg">✓ Changes saved</span>}
              <button
                type="submit"
                className="share-btn"
                style={{ width: 'auto', padding: '10px 28px' }}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'Account' && (
          <div className="settings-form">
            <div className="settings-section">
              <div className="settings-section-label">Email Address</div>
              <div className="settings-readonly-field">
                <span>{user?.email || 'Not set'}</span>
                <button className="settings-change-link">Change</button>
              </div>
            </div>

            <div className="settings-divider" />

            <div className="settings-section">
              <div className="settings-section-label">Password</div>
              <div className="settings-fields">
                <div className="form-group">
                  <label className="form-label" htmlFor="cur-pass">Current Password</label>
                  <input id="cur-pass" type="password" className="form-input" placeholder="••••••••" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-pass">New Password</label>
                    <input id="new-pass" type="password" className="form-input" placeholder="••••••••" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="confirm-pass">Confirm Password</label>
                    <input id="confirm-pass" type="password" className="form-input" placeholder="••••••••" />
                  </div>
                </div>
                <button className="share-btn" style={{ width: 'auto', padding: '9px 24px' }}>
                  Update Password
                </button>
              </div>
            </div>

            <div className="settings-divider" />

            {/* Danger zone */}
            <div className="settings-section danger-zone">
              <div className="settings-section-label" style={{ color: 'var(--danger)' }}>Danger Zone</div>
              <p className="danger-text">Once you delete your account, all your prompts, collections, and data will be permanently removed. This action cannot be undone.</p>
              <button className="danger-btn">Delete Account</button>
            </div>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div className="settings-form">
            <div className="settings-section">
              <div className="settings-section-label">Email Notifications</div>
              <div className="notif-prefs">
                {[
                  { label: 'New ratings on my prompts', id: 'n-rating' },
                  { label: 'Comments on my prompts',    id: 'n-comment' },
                  { label: 'New followers',              id: 'n-follow' },
                  { label: 'Prompt featured',            id: 'n-featured' },
                  { label: 'Weekly digest',              id: 'n-digest' },
                ].map(({ label, id }) => (
                  <label key={id} className="notif-pref-row" htmlFor={id}>
                    <div className="notif-pref-label">{label}</div>
                    <div className="toggle-wrap">
                      <input type="checkbox" id={id} className="toggle-input" defaultChecked />
                      <span className="toggle-slider" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="settings-save-row" style={{ marginTop: 24 }}>
              <button className="share-btn" style={{ width: 'auto', padding: '10px 28px' }}>
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
