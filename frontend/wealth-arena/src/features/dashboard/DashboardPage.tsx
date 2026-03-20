import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import MetricCard from '@/shared/components/MetricCard';
import { loadDailyStreak } from '@/services/persistence';

export default function DashboardPage() {
  const { user } = useAuth();
  const streak = loadDailyStreak();

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Welcome back, {user?.name ?? 'Investor'} 👋</h1>
        <p className="text-arena-text-dim mt-1">Choose your next challenge or review your performance.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <MetricCard label="Games Played" value={0} icon="🎮" />
        <MetricCard label="Daily Streak" value={streak} subtitle="days" icon="🔥" />
        <MetricCard label="Last Archetype" value="—" icon="🎯" />
      </div>

      {/* Game Modes */}
      <h2 className="text-xl font-bold text-white mb-4">Play Now</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <GameModeCard
          to="/daily"
          icon="📅"
          title="Daily Puzzle"
          description="Today's market challenge. Same scenario for all players. One attempt per day."
          cta="Play Today's Puzzle"
          accentClass="from-arena-accent/20 to-arena-accent/5"
        />
        <GameModeCard
          to="/sandbox/setup"
          icon="🏗️"
          title="Sandbox"
          description="Customize everything. Pick archetype, objective, and AI mode. Practice and experiment."
          cta="Start Sandbox Run"
          accentClass="from-blue-500/20 to-blue-500/5"
        />
        <GameModeCard
          to="/classroom"
          icon="🏫"
          title="Classroom"
          description="Host or join a live competition room. Great for groups and classes."
          cta="Enter Classroom"
          accentClass="from-purple-500/20 to-purple-500/5"
        />
      </div>

      {/* Recent Activity */}
      <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
      <div className="bg-arena-surface border border-arena-border rounded-xl p-8 text-center">
        <p className="text-arena-text-dim">No games played yet. Start your first challenge! 🚀</p>
      </div>
    </div>
  );
}

function GameModeCard({ to, icon, title, description, cta, accentClass }: {
  to: string;
  icon: string;
  title: string;
  description: string;
  cta: string;
  accentClass: string;
}) {
  return (
    <Link
      to={to}
      className="group bg-arena-surface border border-arena-border rounded-xl p-6 hover:border-white/20 transition-all"
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${accentClass} flex items-center justify-center text-2xl mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-arena-text-dim mb-4 leading-relaxed">{description}</p>
      <span className="text-sm font-semibold text-arena-accent group-hover:underline">{cta} →</span>
    </Link>
  );
}
