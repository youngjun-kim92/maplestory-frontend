import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import InputPage from './pages/InputPage'
import GoalsPage from './pages/GoalsPage'
import CharactersPage from './pages/CharactersPage'
import SettingsPage from './pages/SettingsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <p className="text-3xl mb-2">🍁</p>
          <p className="text-sm animate-pulse font-diary" style={{ color: 'var(--text-2)' }}>불러오는 중...</p>
        </div>
      </div>
    )
  }
  return user ? <>{children}</> : <Navigate to="/" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/input" element={<InputPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}
