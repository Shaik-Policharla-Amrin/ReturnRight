import { useNavigate } from 'react-router-dom'
import { Bell, User, Camera, Upload, ArrowUpRight, Sparkles } from 'lucide-react'
import { theme } from '../theme'
import { usePurchases } from '../context/PurchaseContext'
import BottomNav from '../components/BottomNav'

export default function Dashboard() {
  const navigate = useNavigate()
  const { purchases, atRisk, riskTotal } = usePurchases()

  return (
    <div className="dashboard-page">
      <header className="dashboard-header page-width">
        <div>
          <span className="brand">ReturnRight</span>
          <p className="page-subtitle">Keep every return, refund, and warranty deadline in sight.</p>
        </div>
        <div className="header-actions">
          <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
          <button className="icon-button" onClick={() => navigate('/account')} aria-label="Account"><User size={19} /></button>
        </div>
      </header>

      <section className="risk-card page-width">
        <div className="risk-copy">
          <span className="eyebrow">Money at risk</span>
          <div className="risk-amount">₹{riskTotal.toLocaleString('en-IN')}</div>
          <span className="risk-caption">across {atRisk.length} purchase{atRisk.length !== 1 ? 's' : ''} closing soon</span>
        </div>
        <div className="risk-status">
          <span className="risk-status-dot" />
          {atRisk.length ? 'Action needed soon' : 'You’re all caught up'}
        </div>
        {purchases.length > 0 && (
          <div className="risk-purchases">
            {purchases.slice(0, 3).map((purchase) => (
              <div key={purchase.id} className="risk-purchase">
                <span>{purchase.name}</span>
                <span className={purchase.status === 'soon' ? 'risk-soon' : 'risk-safe'}>
                  ₹{purchase.amount.toLocaleString('en-IN')} · {purchase.status === 'soon' ? `${purchase.daysLeft}d left` : 'on track'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <main className="dashboard-main page-width">
        <section className="scan-section">
          <button onClick={() => navigate('/scan')} className="scan-card">
            <div className="scan-icon"><Camera size={22} color={theme.ink} /></div>
            <div className="scan-copy">
              <div className="scan-title">Scan a purchase</div>
              <div className="scan-description">Photograph an invoice or receipt</div>
            </div>
            <ArrowUpRight className="scan-arrow" size={20} />
          </button>
          <button onClick={() => navigate('/scan')} className="phone-upload">
            <Upload size={15} /> Upload from phone instead
          </button>
        </section>

        <section className="expiring-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Your timeline</span>
              <h1>Expiring soon</h1>
            </div>
            {purchases.length > 0 && <span className="count-pill">{purchases.length}</span>}
          </div>

          {purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Sparkles size={19} /></div>
              <div>
                <strong>No purchases yet</strong>
                <span>Scan an invoice to start protecting your returns.</span>
              </div>
            </div>
          ) : (
            purchases.map((purchase) => (
              <button key={purchase.id} onClick={() => navigate(`/purchase/${purchase.id}`)} className="purchase-row">
                <div className="purchase-info">
                  <div>{purchase.name}</div>
                  <span>₹{purchase.amount.toLocaleString('en-IN')}</span>
                </div>
                <span className={`deadline-pill ${purchase.status}`}>{purchase.daysLeft}d left</span>
              </button>
            ))
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
