import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Welcome back, {user?.name ?? 'Investor'}</h1>
        <p className="text-arena-text-dim mt-1">Choose your next challenge or review your performance.</p>
      </div>

      {/* Game Modes */}
      <h2 className="text-xl font-bold text-white mb-4">Play Now</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <GameModeCard
          to="/daily"
          title="Daily Puzzle"
          description="Today's market challenge. Same scenario for all players. One attempt per day."
          cta="Play Today's Puzzle"
          accentClass="from-arena-accent/20 to-arena-accent/5"
          iconColor="text-arena-accent"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
        />
        <GameModeCard
          to="/sandbox/setup"
          title="Sandbox"
          description="Customize everything. Pick investor profile, objective, and AI mode. Practice and experiment."
          cta="Start Sandbox Run"
          accentClass="from-blue-500/20 to-blue-500/5"
          iconColor="text-blue-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5" /></svg>}
        />
        <GameModeCard
          to="/party"
          title="Party"
          description="Host or join a live competition room. Great for groups and classes."
          cta="Enter Party"
          accentClass="from-purple-500/20 to-purple-500/5"
          iconColor="text-purple-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>}
        />
      </div>

    </div>
  );
}

function GameModeCard({ to, icon, iconColor, title, description, cta, accentClass }: {
  to: string;
  icon: React.ReactNode;
  iconColor: string;
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
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${accentClass} flex items-center justify-center mb-4 ${iconColor}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-arena-text-dim mb-4 leading-relaxed">{description}</p>
      <span className="text-sm font-semibold text-arena-accent group-hover:underline">{cta} →</span>
    </Link>
  );
}
