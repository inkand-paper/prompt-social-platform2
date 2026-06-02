// src/pages/VerifyEmailPage.jsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Invalid verification link.')
      return
    }

    async function verify() {
      try {
        await api.post('/auth/verify-email/', { token })
        setStatus('success')
        setTimeout(() => navigate('/login'), 3500)
      } catch (err) {
        setStatus('error')
        setError(err.response?.data?.error || 'Verification failed. The link may have expired.')
      }
    }
    verify()
  }, [token, navigate])

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
        {status === 'verifying' && (
          <>
            <div className="spinner" style={{ margin: '0 auto 24px' }}></div>
            <h1 className="auth-title">Verifying your email…</h1>
            <p className="auth-subtitle">Just a moment while we secure your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>✨</div>
            <h1 className="auth-title">Email Verified!</h1>
            <p className="auth-subtitle">
              Your account is now fully active. 
              <br />
              Redirecting you to login...
            </p>
            <Link to="/login" className="share-btn" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '24px' }}>
              Proceed to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>❌</div>
            <h1 className="auth-title">Verification Failed</h1>
            <p className="auth-subtitle">{error}</p>
            <Link to="/register" className="share-btn" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '24px' }}>
              Back to Registration
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
