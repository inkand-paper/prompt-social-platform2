// src/main.jsx
// Application entry point.
// Wraps with: ErrorBoundary → BrowserRouter → QueryClientProvider → AuthProvider

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'

import App from './App'

// ── Page imports ──────────────────────────────────────────────
import LoginPage          from './pages/LoginPage'
import RegisterPage       from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage  from './pages/ResetPasswordPage'
import VerifyEmailPage    from './pages/VerifyEmailPage' // Block C #1
import ExplorePage        from './pages/ExplorePage'
import TrendingPage       from './pages/TrendingPage'
import SearchResultsPage  from './pages/SearchResultsPage'
import PromptDetailPage   from './pages/PromptDetailPage'
import UserProfilePage    from './pages/UserProfilePage'
import MyPromptsPage      from './pages/MyPromptsPage'
import CollectionsPage    from './pages/CollectionsPage'
import StarredPage        from './pages/StarredPage'
import NotificationsPage  from './pages/NotificationsPage'
import SettingsPage       from './pages/SettingsPage'

import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        1000 * 60 * 2,  // 2 minutes
      gcTime:           1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry:            1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* ── Public standalone pages (no sidebar layout) ── */}
              <Route path="/login"           element={<LoginPage />} />
              <Route path="/register"        element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password"  element={<ResetPasswordPage />} />
              <Route path="/verify-email"    element={<VerifyEmailPage />} />

              {/* ── Main app shell (Navbar + sidebars) ── */}
              <Route path="/" element={<App />}>
                <Route index                     element={<ExplorePage />} />
                <Route path="explore"            element={<ExplorePage />} />
                <Route path="trending"           element={<TrendingPage />} />
                <Route path="p/:slug"            element={<PromptDetailPage />} />
                <Route path="u/:username"        element={<UserProfilePage />} />
                <Route path="search"             element={<SearchResultsPage />} />

                {/* Protected routes */}
                <Route path="me/prompts"      element={<ProtectedRoute><MyPromptsPage /></ProtectedRoute>} />
                <Route path="me/collections"  element={<ProtectedRoute><CollectionsPage /></ProtectedRoute>} />
                <Route path="me/starred"      element={<ProtectedRoute><StarredPage /></ProtectedRoute>} />
                <Route path="notifications"   element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
