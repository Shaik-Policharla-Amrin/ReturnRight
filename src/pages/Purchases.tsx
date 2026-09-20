import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ClipboardCheck, ReceiptText } from 'lucide-react'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'
import { usePurchases } from '../context/PurchaseContext'

export default function Purchases() {
  const navigate = useNavigate()
  const { purchases } = usePurchases()
  const needsReview = purchases.filter((purchase) => purchase.needsPolicyReview).length

  return <div className="purchases-page">
    <TopBar title="All purchases" onBack={() => navigate('/dashboard')} />
    <main className="purchases-content">
      <section className="purchase-summary"><div><span>YOUR RECORDS</span><h1>{purchases.length} purchase{purchases.length === 1 ? '' : 's'} saved</h1></div><ReceiptText size={27} /></section>
      {needsReview > 0 && <div className="review-banner"><ClipboardCheck size={19} /><span><strong>{needsReview} purchase{needsReview === 1 ? '' : 's'} need{needsReview === 1 ? 's' : ''} a return-policy check.</strong> Open each one to set its deadline.</span></div>}
      {purchases.length === 0 ? <div className="purchases-empty"><ReceiptText size={26} /><strong>Your purchase history is empty</strong><span>Scan a receipt to begin tracking it here.</span><button onClick={() => navigate('/scan')}>Scan a purchase</button></div> : <div className="purchase-list">
        {purchases.map((purchase) => <button key={purchase.id} className="purchase-list-card" onClick={() => navigate(`/purchase/${purchase.id}`)}>
          <div className="purchase-avatar">{purchase.name.slice(0, 1).toUpperCase()}</div><div className="purchase-list-copy"><strong>{purchase.name}</strong><span>{purchase.purchaseDate} · {purchase.amount ? `₹${purchase.amount.toLocaleString('en-IN')}` : 'Amount not found'}</span></div><div className="purchase-list-status"><span className={purchase.needsPolicyReview ? 'review' : purchase.status}>{purchase.needsPolicyReview ? 'Review policy' : `${purchase.daysLeft}d left`}</span><ArrowUpRight size={18} /></div>
        </button>)}
      </div>}
    </main>
    <BottomNav />
  </div>
}
