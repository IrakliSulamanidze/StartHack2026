import { Link } from 'react-router-dom';
import { ARCHETYPES } from '@/shared/types/domain';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-arena-bg text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-arena-accent/10 via-transparent to-arena-danger/5" />
        <nav className="relative z-10 max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Endgame Securities" className="h-32 w-auto" />
            <span className="text-xl font-bold tracking-tight">Endgame Securities</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm text-arena-text-dim hover:text-white transition-colors">
              Log In
            </Link>
            <Link to="/signup" className="px-4 py-2 text-sm bg-arena-accent text-black font-semibold rounded-lg hover:bg-arena-accent/90 transition-colors">
              Sign Up Free
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-28 text-center">
          <div className="inline-block px-3 py-1 bg-arena-accent/15 text-arena-accent text-xs font-semibold rounded-full mb-6">
            A market survival game for finance learners
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            Can You Survive<br />
            <span className="text-arena-accent">10 Rounds</span> of Market Chaos?
          </h1>
          <p className="text-lg md:text-xl text-arena-text-dim max-w-2xl mx-auto mb-10">
            Choose your investor profile. Read the headlines. Allocate your portfolio.
            Practice in daily puzzles, sandbox runs, or live parties.
            Learn how diversification, risk management, and patience drive long-term success.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/signup" className="px-8 py-3 bg-arena-accent text-black font-bold rounded-xl text-lg hover:bg-arena-accent/90 transition-colors shadow-lg shadow-arena-accent/20">
              Start Playing →
            </Link>
            <Link to="/login" className="px-8 py-3 border border-arena-border text-white font-medium rounded-xl text-lg hover:bg-white/5 transition-colors">
              I Have an Account
            </Link>
          </div>
        </div>
      </header>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-center text-arena-text-dim mb-12 max-w-xl mx-auto">
          A 10-round market simulation where your financial literacy is your weapon.
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Pick Your Strategy', desc: 'Choose from 3 investor profiles — from Fortress (conservative) to Growth Builder (long-term growth).' },
            { step: '2', title: 'Read Headlines', desc: 'Each round delivers market news. Some are signal, some are noise. Can you tell the difference?' },
            { step: '3', title: 'Allocate Capital', desc: 'Distribute your portfolio across equities, bonds, gold, and FX. Every choice has consequences.' },
            { step: '4', title: 'Get Scored', desc: 'Your performance is evaluated on returns, risk management, signal detection, and strategy fidelity.' },
          ].map((item) => (
            <div key={item.step} className="bg-arena-surface border border-arena-border rounded-xl p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-arena-accent/15 text-arena-accent font-black text-lg flex items-center justify-center mx-auto mb-3">{item.step}</div>
              <h3 className="font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-arena-text-dim">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Archetypes Preview */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Choose Your Investor Profile</h2>
        <p className="text-center text-arena-text-dim mb-12">Three distinct investment philosophies. Which one matches your risk comfort?</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {ARCHETYPES.map((a) => (
            <div
              key={a.id}
              className="bg-arena-surface border border-arena-border rounded-xl p-5 text-center hover:border-white/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${a.color}20` }}>
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: a.color }} />
              </div>
              <h3 className="font-bold text-white mb-1" style={{ color: a.color }}>{a.name}</h3>
              <p className="text-xs text-arena-text-dim">{a.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Game Modes */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Three Ways to Play</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Daily Puzzle */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-8">
            <div className="w-12 h-12 rounded-xl bg-arena-accent/15 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-arena-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-arena-accent">Daily Puzzle</h3>
            <p className="text-sm text-arena-text-dim leading-relaxed">Same scenario every day. Compare your score against everyone else. Streak rewards for consistency.</p>
          </div>
          {/* Sandbox */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-8">
            <div className="w-12 h-12 rounded-xl bg-blue-400/15 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-blue-400">Sandbox</h3>
            <p className="text-sm text-arena-text-dim leading-relaxed">Full customization. Pick any investor profile, set any objective, choose your AI mode. Practice at your own pace.</p>
          </div>
          {/* Party */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-8">
            <div className="w-12 h-12 rounded-xl bg-purple-400/15 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-purple-400">Party</h3>
            <p className="text-sm text-arena-text-dim leading-relaxed">Host creates a room, players join with a code. Live competition with real-time rankings. Perfect for Kahoot-style learning.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-black mb-4">Ready to Test Your Financial IQ?</h2>
        <p className="text-arena-text-dim mb-8">Free to play. No credit card required. Start surviving in seconds.</p>
        <Link to="/signup" className="inline-block px-10 py-4 bg-arena-accent text-black font-bold rounded-xl text-lg hover:bg-arena-accent/90 transition-colors shadow-lg shadow-arena-accent/20">
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-arena-border py-8 text-center text-xs text-arena-text-dim">
        <p>Endgame Securities — Built for StartHack 2026</p>
      </footer>
    </div>
  );
}
