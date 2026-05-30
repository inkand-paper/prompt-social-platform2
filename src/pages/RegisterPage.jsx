// src/pages/RegisterPage.jsx
// Registration form. Calls AuthContext.register().

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register: authRegister } = useAuth()
  const navigate = useNavigate()
  const [apiError, setApiError]   = useState(null)
  const [success, setSuccess]     = useState(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const password = watch('password', '')

  async function onSubmit({ username, email, password }) {
    setApiError(null)
    const result = await authRegister(username, email, password)
    if (result.success) {
      setSuccess(result.message)
    } else {
      setApiError(result.error)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-success">
          <div className="success-icon">✓</div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">{success}</p>
          <Link to="/login" className="auth-submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Go to Login
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

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join thousands of AI prompt creators</p>

        <form id="register-form" onSubmit={handleSubmit(onSubmit)} noValidate className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              className={`form-input ${errors.username ? 'input-error' : ''}`}
              placeholder="alexjohnson"
              autoComplete="username"
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'At least 3 characters' },
                maxLength: { value: 30, message: 'Max 30 characters' },
                pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Only letters, numbers, underscores' }
              })}
            />
            {errors.username && <span className="field-error">{errors.username.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
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

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type="password"
              className={`form-input ${errors.confirm ? 'input-error' : ''}`}
              placeholder="Repeat your password"
              autoComplete="new-password"
              {...register('confirm', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match'
              })}
            />
            {errors.confirm && <span className="field-error">{errors.confirm.message}</span>}
          </div>

          {apiError && <div className="form-api-error" role="alert">{apiError}</div>}

          <button
            id="register-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>

        <p className="auth-terms">
          By creating an account you agree to our{' '}
          <a href="#" className="auth-switch-link">Terms of Service</a> and{' '}
          <a href="#" className="auth-switch-link">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
