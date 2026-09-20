import { ArrowLeft } from 'lucide-react'
import { theme } from '../theme'

interface TopBarProps {
  title: string
  onBack?: () => void
  dark?: boolean
}

export default function TopBar({ title, onBack, dark }: TopBarProps) {
  const color = dark ? '#fff' : theme.ink
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 8px' }}>
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Go back"
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
        >
          <ArrowLeft size={22} color={color} />
        </button>
      )}
      <span style={{ fontWeight: 800, fontSize: 17, color, letterSpacing: -0.2 }}>{title}</span>
    </div>
  )
}
