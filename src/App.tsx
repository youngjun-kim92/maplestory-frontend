import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LedgerPage from './pages/LedgerPage'
import BossPage from './pages/BossPage'
import HuntingPage from './pages/HuntingPage'
import GoalsPage from './pages/GoalsPage'
import CharactersPage from './pages/CharactersPage'
import StatsPage from './pages/StatsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-orange-400 text-xl animate-pulse">로딩 중...</div>
      </div>
    )
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  return user ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/" element={<LedgerPage />} />
            <Route path="/boss" element={<BossPage />} />
            <Route path="/hunting" element={<HuntingPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
