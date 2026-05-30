// src/components/SkeletonCard.jsx
// Reusable skeleton loading state for prompt cards

export default function SkeletonCard({ type = 'text' }) {
  if (type === 'image') {
    return (
      <div className="prompt-block sk-fade" style={{ marginBottom: 20 }}>
        <div className="sk sk-block" style={{ height: 180, borderRadius: 10 }} />
        <div style={{ padding: '8px 2px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="sk sk-av" style={{ width: 20, height: 20 }} />
          <div className="sk sk-line" style={{ width: '50%' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="text-block sk-fade" style={{ paddingLeft: 12 }}>
      <div className="sk sk-line" style={{ width: '15%', marginBottom: 8 }} />
      <div className="sk sk-line" style={{ width: '50%', height: 18, marginBottom: 12 }} />
      <div className="sk sk-line" style={{ width: '100%', marginBottom: 6 }} />
      <div className="sk sk-line" style={{ width: '90%', marginBottom: 6 }} />
      <div className="sk sk-line" style={{ width: '70%', marginBottom: 16 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="sk sk-av" style={{ width: 22, height: 22 }} />
        <div className="sk sk-line" style={{ width: '20%' }} />
      </div>
    </div>
  )
}
