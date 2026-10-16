import { ArrowRight, Play } from 'lucide-react'
import { Logo, Reveal } from './ui'
import { Link } from '../lib/router'

export default function Footer({ onStart }) {
  return (
    <footer className="footer">
      <div className="container">
        <Reveal className="cta-band">
          <div>
            <h2>Your strongest self starts <span className="text-gradient">today.</span></h2>
            <p className="muted">Plan it, track it, crush it. Your progress is saved to your account.</p>
          </div>
          <button className="btn btn-primary btn-lg btn-glow" onClick={() => onStart()}>
            <Play size={20} fill="currentColor" /> Start Your Workout
          </button>
        </Reveal>

        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p className="muted small">Train smarter. Get stronger. The gym app built for people who actually lift.</p>
          </div>
          <div>
            <h3>Train</h3>
            <Link to="/library">Workout Library</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/#classes">Classes</Link>
          </div>
          <div>
            <h3>Community</h3>
            <Link to="/dashboard#motivation">Weekly goals</Link>
            <Link to="/dashboard#motivation">Badges</Link>
            <Link to="/dashboard#motivation">Streaks</Link>
          </div>
          <form className="footer-news" onSubmit={(e) => e.preventDefault()}>
            <h3>Weekly programs</h3>
            <div className="news-input">
              <input type="email" placeholder="you@email.com" aria-label="Email" />
              <button className="icon-btn icon-btn-lime" aria-label="Subscribe"><ArrowRight size={18} /></button>
            </div>
          </form>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PulseFit. All rights reserved.</span>
          <span className="muted">Built with sweat & neon.</span>
        </div>
      </div>
    </footer>
  )
}
