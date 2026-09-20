import { Routes, Route } from 'react-router-dom'
import { PurchaseProvider } from './context/PurchaseContext'
import { AuthProvider } from 'react-oidc-context'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Scan from './pages/Scan'
import PurchaseDetails from './pages/PurchaseDetails'
import Purchases from './pages/Purchases'
import Account from './pages/Account'

import { cognitoAuthConfig } from './authConfig'

export default function App() {
  return (
    <AuthProvider
      {...cognitoAuthConfig}
      onSigninCallback={() => {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )
      }}
    >
      <PurchaseProvider>
        <div className="app-shell">
          <div className="app-frame">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/scan/result" element={<PurchaseDetails />} />
              <Route path="/purchase/:id" element={<PurchaseDetails />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </div>
        </div>
      </PurchaseProvider>
    </AuthProvider>
  )
}
