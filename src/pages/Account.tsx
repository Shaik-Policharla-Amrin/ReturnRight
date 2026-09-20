import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import {
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import TopBar from '../components/TopBar'

export default function Account() {
  const navigate = useNavigate()
  const auth = useAuth()

  const profile = auth.user?.profile

  const email =
    typeof profile?.email === 'string'
      ? profile.email
      : 'Email not available'

  const phone =
    typeof profile?.phone_number === 'string'
      ? profile.phone_number
      : 'Not added'

  const name =
    typeof profile?.name === 'string'
      ? profile.name
      : typeof profile?.preferred_username === 'string'
        ? profile.preferred_username
        : email.split('@')[0]

  const initial =
    name?.slice(0, 1).toUpperCase() || 'U'

  async function signOut() {
    // Remove the current Cognito user session
    await auth.removeUser()

    // Cognito Hosted UI logout endpoint
    const domain =
      'https://ap-south-1dtrmpysvm.auth.ap-south-1.amazoncognito.com'

    const logoutUrl =
      `${domain}/logout?` +
      `client_id=${encodeURIComponent(
        '1d1hfq25uin2f3mha98o6vfk66'
      )}` +
      `&logout_uri=${encodeURIComponent(
        'https://main.dtjfzels7mmz4.amplifyapp.com/'
      )}`

    // Redirect back to the live Amplify application
    window.location.assign(logoutUrl)
  }

  return (
    <div className="account-page">
      <TopBar
        title="Account"
        onBack={() => navigate('/dashboard')}
      />

      <main className="account-content">

        <section className="account-hero">
          <div className="account-avatar">
            {initial}
          </div>

          <div>
            <span>YOUR RETURNRIGHT ACCOUNT</span>

            <h1>
              {name || 'ReturnRight user'}
            </h1>

            <p>
              Your invoices and purchase records are private
              to your account.
            </p>
          </div>
        </section>

        <section className="account-card">
          <h2>Profile details</h2>

          <div className="account-detail">
            <div className="account-detail-icon">
              <Mail size={18} />
            </div>

            <div>
              <span>Email address</span>
              <strong>{email}</strong>
            </div>
          </div>

          <div className="account-detail">
            <div className="account-detail-icon">
              <Phone size={18} />
            </div>

            <div>
              <span>Phone number</span>
              <strong>{phone}</strong>
            </div>
          </div>
        </section>

        <section className="account-card account-security">
          <div className="account-detail-icon">
            <ShieldCheck size={18} />
          </div>

          <div>
            <h2>Secure sign-in</h2>

            <p>
              Your account is protected by Amazon Cognito.
            </p>
          </div>
        </section>

        <button
          className="logout-button"
          onClick={signOut}
        >
          <LogOut size={18} />
          Log out
        </button>

      </main>
    </div>
  )
}