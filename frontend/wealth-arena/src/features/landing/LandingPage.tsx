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
            <span className="text-2xl">⚔️</span>
            <span className="text-xl font-bold tracking-tight">Last Portfolio Standing</span>
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
            Choose your archetype. Read the headlines. Allocate your portfolio.
            Compete in daily puzzles, sandbox runs, or live classrooms.
            Every decision matters. Only the best portfolios survive.
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
            { step: '1', icon: '🏰', title: 'Pick Your Archetype', desc: 'Choose from 4 strategies — from Fortress (defensive) to Hunter (aggressive).' },
            { step: '2', icon: '📰', title: 'Read Headlines', desc: 'Each round delivers market news. Some are signal, some are noise. Can you tell the difference?' },
            { step: '3', icon: '💼', title: 'Allocate Capital', desc: 'Distribute your portfolio across equities, bonds, gold, FX, and crypto. Every choice has consequences.' },
            { step: '4', icon: '🏆', title: 'Get Scored', desc: 'Your performance is evaluated on returns, risk management, signal detection, and strategy fidelity.' },
          ].map((item) => (
            <div key={item.step} className="bg-arena-surface border border-arena-border rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-xs text-arena-accent font-bold mb-2">STEP {item.step}</div>
              <h3 className="font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-arena-text-dim">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Archetypes Preview */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Choose Your Archetype</h2>
        <p className="text-center text-arena-text-dim mb-12">Five distinct investment philosophies. Which one matches you?</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ARCHETYPES.map((a) => (
            <div
              key={a.id}
              className="bg-arena-surface border border-arena-border rounded-xl p-5 text-center hover:border-white/20 transition-colors"
            >
              <div className="text-4xl mb-2">{a.icon}</div>
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
          {[
            { icon: '📅', title: 'Daily Puzzle', desc: 'Same scenario every day. Compare your score against everyone else. Streak rewards for consistency.', color: 'arena-accent' },
            { icon: '🏗️', title: 'Sandbox', desc: 'Full customization. Pick any archetype, set any objective, choose your AI mode. Practice at your own pace.', color: 'blue-400' },
            { icon: '🏫', title: 'Classroom', desc: 'Host creates a room, students join with a code. Live competition with real-time rankings. Perfect for Kahoot-style learning.', color: 'purple-400' },
          ].map((mode) => (
            <div key={mode.title} className="bg-arena-surface border border-arena-border rounded-xl p-8">
              <div className="text-4xl mb-4">{mode.icon}</div>
              <h3 className={`text-xl font-bold mb-2 text-${mode.color}`}>{mode.title}</h3>
              <p className="text-sm text-arena-text-dim leading-relaxed">{mode.desc}</p>
            </div>
          ))}
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
        <p>⚔️ Last Portfolio Standing — Built for StartHack 2026</p>
      </footer>
    </div>
  );
}
