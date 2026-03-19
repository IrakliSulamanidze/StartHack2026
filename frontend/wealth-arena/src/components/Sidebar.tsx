import { useGame, type GamePage } from '../context/GameContext';

const NAV_ITEMS: { id: GamePage; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'game', label: 'Game', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'trading', label: 'Invest', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'news', label: 'News', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function Sidebar() {
  const { state, navigate, netWorth } = useGame();

  return (
    <aside className="w-[72px] lg:w-[220px] bg-arena-surface border-r border-arena-border flex flex-col shrink-0 h-screen sticky top-0 shadow-md">
      {/* Logo */}
      <div className="px-3 py-5 border-b border-arena-border flex items-center gap-2.5">
        <span className="text-2xl">⚔️</span>
        <span className="text-white font-bold text-sm hidden lg:block">Wealth<span className="text-arena-accent">Arena</span></span>
      </div>

      {/* Portfolio mini */}
      <div className="px-3 py-3 border-b border-arena-border hidden lg:block">
        <p className="text-[10px] uppercase text-arena-text-dim tracking-wider">
          {state.scenarioId ? 'Portfolio' : 'Net Worth'}
        </p>
        {(() => {
          const val = state.scenarioId
            ? (state.lastTurnResult?.portfolio_value ?? 100_000)
            : netWorth;
          const base = state.scenarioId ? 100_000 : state.startingCash;
          return (
            <p className={`text-lg font-bold font-mono ${val >= base ? 'text-arena-accent' : 'text-red-400'}`}>
              ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          );
        })()}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(item => {
          const active = state.page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-arena-accent/15 text-arena-accent shadow-md shadow-arena-accent/10'
                  : 'text-arena-text-dim hover:text-white hover:bg-arena-bg'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="hidden lg:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mode badge */}
      <div className="px-3 py-3 border-t border-arena-border">
        <div className={`text-center text-[10px] font-bold uppercase px-2 py-1.5 rounded-lg ${
          state.mode === 'beginner' ? 'bg-green-500/15 text-green-400' :
          state.mode === 'intermediate' ? 'bg-yellow-500/15 text-yellow-400' :
          'bg-red-500/15 text-red-400'
        }`}>
          <span className="hidden lg:inline">{state.mode}</span>
          <span className="lg:hidden">{state.mode[0].toUpperCase()}</span>
        </div>
      </div>
    </aside>
  );
}
