// src/pages/CollectionsPage.jsx — User's prompt collections

import { useState, useEffect } from 'react'
import { fetchCollections, createCollection } from '../lib/userApi'

function CollectionCard({ collection, onOpen }) {
  const vis = collection.visibility === 'private'
    ? { icon: '🔒', label: 'Private' }
    : { icon: '🌐', label: 'Public' }

  return (
    <div className="collection-card" onClick={() => onOpen(collection)}>
      <div className="collection-card-emoji">📁</div>
      <div className="collection-card-info">
        <div className="collection-card-name">{collection.name}</div>
        {collection.description && (
          <div className="collection-card-desc">{collection.description}</div>
        )}
        <div className="collection-card-meta">
          <span>{collection.prompt_count} prompt{collection.prompt_count !== 1 ? 's' : ''}</span>
          <span className="collection-card-vis">{vis.icon} {vis.label}</span>
        </div>
      </div>
    </div>
  )
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [form,        setForm]        = useState({ name: '', description: '', visibility: 'public' })

  useEffect(() => {
    let cancelled = false
    fetchCollections().then((data) => {
      if (!cancelled) { setCollections(data); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const created = await createCollection(form)
      setCollections((prev) => [created, ...prev])
      setShowCreate(false)
      setForm({ name: '', description: '', visibility: 'public' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <div className="feed-tabs">
          <div className="feed-tab active">
            Collections
            {!loading && collections.length > 0 && (
              <span className="tab-badge" style={{ marginLeft: 6 }}>{collections.length}</span>
            )}
          </div>
        </div>
        <button
          className="share-btn"
          style={{ width: 'auto', padding: '7px 16px', fontSize: 'var(--fs-sm)' }}
          onClick={() => setShowCreate((v) => !v)}
        >
          + New Collection
        </button>
      </div>

      {/* New collection form */}
      {showCreate && (
        <div className="collection-create-panel">
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" htmlFor="coll-name">Collection Name <span className="req">*</span></label>
              <input
                id="coll-name"
                className="form-input"
                placeholder="e.g. Marketing Arsenal"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" htmlFor="coll-desc">Description</label>
              <input
                id="coll-desc"
                className="form-input"
                placeholder="What's this collection for?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Visibility</label>
              <div className="visibility-options">
                {['public', 'private'].map((v) => (
                  <label key={v} className="radio-option">
                    <input type="radio" value={v} checked={form.visibility === v} onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))} />
                    <span className="radio-label">{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="share-btn" style={{ flex: 1 }} disabled={creating || !form.name.trim()}>
                {creating ? 'Creating…' : 'Create Collection'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="feed-section">
        {loading ? (
          <div className="collections-grid">
            {[1,2,3].map((i) => (
              <div key={i} className="sk sk-block" style={{ height: 100 }} />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="page-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <div className="page-placeholder-text">No collections yet</div>
            <div className="page-placeholder-sub">
              Create a collection to organise your favourite prompts.
            </div>
          </div>
        ) : (
          <div className="collections-grid">
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} onOpen={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
