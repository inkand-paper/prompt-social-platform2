// src/components/SharePromptModal.jsx
// Modal for creating/sharing a new prompt. Wires to POST /api/v1/prompts/. 
// MOCK_MODE is controlled in feedApi.js — flip to false when backend is live.

import { useState } from 'react'
import { useForm } from 'react-hook-form'

const PROMPT_TYPES = ['text', 'image', 'video', 'audio', 'code']
const AI_MODELS = ['ChatGPT-4o', 'Claude 3.5', 'Midjourney v6', 'Stable Diffusion XL', 'Gemini 1.5 Pro', 'DALL-E 3', 'Other']

export default function SharePromptModal({ onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { prompt_type: 'text', visibility: 'public' }
  })

  async function onSubmit(data) {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // PRODUCTION: uncomment below
      // const { data: result } = await api.post('/prompts/', data)
      // onSuccess(result)

      // MOCK: simulate success
      await new Promise((r) => setTimeout(r, 700))
      onSuccess({ ...data, id: `mock-${Date.now()}` })
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Failed to share prompt. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">

        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">Share a Prompt</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form id="share-prompt-form" onSubmit={handleSubmit(onSubmit)} className="modal-form" noValidate>

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="prompt-title">Title <span className="req">*</span></label>
            <input
              id="prompt-title"
              className={`form-input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g. Viral product launch email"
              {...register('title', { required: 'Title is required', maxLength: { value: 200, message: 'Max 200 characters' } })}
            />
            {errors.title && <span className="field-error">{errors.title.message}</span>}
          </div>

          {/* Type + Model row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="prompt-type">Type</label>
              <select id="prompt-type" className="form-input form-select" {...register('prompt_type')}>
                {PROMPT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="target-model">Target AI Model</label>
              <select id="target-model" className="form-input form-select" {...register('target_model')}>
                <option value="">Any</option>
                {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="form-group">
            <label className="form-label" htmlFor="prompt-body">
              Prompt Body <span className="req">*</span>
              <span className="form-hint">Use [PLACEHOLDERS] for variables, e.g. [PRODUCT_NAME]</span>
            </label>
            <textarea
              id="prompt-body"
              className={`form-input form-textarea ${errors.body ? 'input-error' : ''}`}
              placeholder="Write your full prompt here…"
              rows={6}
              {...register('body', { required: 'Prompt body is required', minLength: { value: 10, message: 'Too short — be more specific' } })}
            />
            {errors.body && <span className="field-error">{errors.body.message}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="prompt-desc">
              Description <span className="form-hint">Explain when and how to use this prompt</span>
            </label>
            <textarea
              id="prompt-desc"
              className="form-input form-textarea"
              placeholder="Optional: describe what this prompt does and what results to expect"
              rows={3}
              {...register('description')}
            />
          </div>

          {/* Visibility */}
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <div className="visibility-options">
              {['public', 'unlisted', 'private'].map((v) => (
                <label key={v} className="radio-option">
                  <input type="radio" value={v} {...register('visibility')} />
                  <span className="radio-label">
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {submitError && <div className="form-api-error">{submitError}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="share-btn modal-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sharing…' : '+ Share Prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
