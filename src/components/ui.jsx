import { useId } from 'react'
import { Activity } from 'lucide-react'
import { useCountUp, useInView } from '../hooks'
import { Link } from '../lib/router'

export function Logo({ size = 'md' }) {
  return (
    <Link to="/" className={`logo logo-${size}`} aria-label="PulseFit home">
      <span className="logo-mark">
        <Activity strokeWidth={3} />
      </span>
      <span className="logo-text">PulseFit</span>
    </Link>
  )
}

export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, inView] = useInView(0.15)
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Counter({ value, decimals = 0, prefix = '', suffix = '', duration }) {
  const [ref, inView] = useInView(0.4)
  const current = useCountUp(value, inView, duration)
  const text = current.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <span ref={ref} className="counter">
      {prefix}
      {text}
      {suffix}
    </span>
  )
}

export function Ring({ progress, size = 120, stroke = 10, from = '#c6ff00', to = '#00e5ff', children, animate = true }) {
  const id = useId()
  const [ref, inView] = useInView(0.3)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const safe = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  const shown = animate ? (inView ? safe : 0) : safe
  return (
    <div ref={ref} className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-value"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ filter: `drop-shadow(0 0 6px ${from}88)` }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

export function SectionHeader({ eyebrow, title, accent, text }) {
  return (
    <Reveal className="section-header">
      <span className="eyebrow">{eyebrow}</span>
      <h2>
        {title} <span className="text-gradient">{accent}</span>
      </h2>
      {text && <p>{text}</p>}
    </Reveal>
  )
}

// 1234 -> { value: 1.2, decimals: 1, suffix: 'K' } so counters stay short
export function compact(n) {
  if (n >= 1_000_000) return { value: n / 1_000_000, decimals: 1, suffix: 'M' }
  if (n >= 10_000) return { value: Math.round(n / 1000), decimals: 0, suffix: 'K' }
  if (n >= 1_000) return { value: n / 1000, decimals: 1, suffix: 'K' }
  return { value: n, decimals: 0, suffix: '' }
}

// Shimmering glass placeholder while data loads
export function Skeleton({ width = '100%', height = 14, radius = 8, className = '', style }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`glass card skeleton-card ${className}`} aria-hidden="true">
      <Skeleton width="40%" height={12} />
      <Skeleton width="70%" height={24} radius={10} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={`${90 - i * 12}%`} />
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && (
        <span className="empty-icon">
          <Icon size={26} />
        </span>
      )}
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  )
}
