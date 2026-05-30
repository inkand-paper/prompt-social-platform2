// src/pages/ForgotPasswordPage.jsx
// Sends a password reset email via POST /auth/forgot-password/.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'

export default function ForgotPasswordPage() {
  const [sent, setSent]      = useState(false)
  const [apiError, setApiError] = useState(null)
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm()

  async function onSubmit({ email }) {
    setApiError(null)
    try {
      // PRODUCTION: await api.post('/auth/forgot-password/', { email })
      await new Promise((r) => setTimeout(r, 600))
      setSent(true)
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Something went wrong. Try again.')
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-success">
          <div className="success-icon">✉</div>
          <h1 className="auth-title">Check your inbox</h1>
          <p className="auth-subtitle">
            We sent a reset link to <strong>{getValues('email')}</strong>.<br />
            It expires in 30 minutes.
          </p>
          <Link to="/login" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark" style={{ width: 36, height: 36 }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="white" stroke="none" />
            </svg>
          </div>
          <span className="auth-brand">PromptAtlas</span>
        </div>

        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

        <form id="forgot-form" onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' }
              })}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>

          {apiError && <div className="form-api-error" role="alert">{apiError}</div>}

          <button
            id="forgot-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-switch">
          Remember it?{' '}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
