import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    if (auth.isAuthenticated) navigate('/dashboard', { replace: true })
  }, [auth.isAuthenticated, navigate])

  if (auth.isLoading) return <div className="login-page"><div className="login-loading">Loading your secure session…</div></div>
  if (auth.error) return <div className="login-page"><main className="login-card"><ShieldCheck size={30} /><h1>We couldn&apos;t sign you in</h1><p>{auth.error.message}</p><button onClick={() => auth.signinRedirect()}>Try again</button></main></div>

  return <div className="login-page">
    <div className="login-orb login-orb-one" /><div className="login-orb login-orb-two" />
    <main className="login-card">
      <div className="login-mark"><ShieldCheck size={28} /></div>
      <span className="login-kicker"><Sparkles size={13} /> NEVER MISS A DEADLINE</span>
      <h1>ReturnRight</h1>
      <p>Keep every return, refund, and warranty deadline in one protected place.</p>
      <button className="login-action" onClick={() => auth.signinRedirect()}>Sign in / Create account <ArrowUpRight size={18} /></button>
      <span className="login-security">Secure authentication powered by Amazon Cognito</span>
    </main>
  </div>
}
