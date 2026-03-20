import type { Archetype } from '@/shared/types/domain';

interface Props {
  archetype: Archetype;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export default function ArchetypeCard({ archetype, selected, compact, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 transition-all ${
        selected
          ? 'border-current shadow-lg shadow-current/10 bg-white/5'
          : 'border-arena-border hover:border-white/20 bg-arena-surface'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ borderColor: selected ? archetype.color : undefined, color: archetype.color }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{archetype.icon}</span>
        <div>
          <h3 className="font-bold text-white text-base">{archetype.name}</h3>
          <p className="text-xs text-arena-text-dim">{archetype.tagline}</p>
        </div>
      </div>

      {!compact && (
        <>
          <p className="text-sm text-arena-text-dim mb-3 leading-relaxed">{archetype.description}</p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-xs font-semibold text-arena-accent mb-1">Strengths</p>
              {archetype.strengths.map((s, i) => (
                <p key={i} className="text-xs text-arena-text-dim">+ {s}</p>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-arena-danger mb-1">Weaknesses</p>
              {archetype.weaknesses.map((w, i) => (
                <p key={i} className="text-xs text-arena-text-dim">- {w}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-arena-text-dim mb-1">Typical Allocation</p>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
              {Object.entries(archetype.allocation).map(([asset, weight]) => (
                <div
                  key={asset}
                  className="h-full rounded-sm"
                  style={{
                    width: `${weight}%`,
                    backgroundColor: asset === 'equities' ? '#3b82f6' : asset === 'bonds' ? '#22c55e' : asset === 'gold' ? '#eab308' : asset === 'fx' ? '#a855f7' : '#f97316',
                  }}
                  title={`${asset}: ${weight}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(archetype.allocation).map(([asset, weight]) => (
                <span key={asset} className="text-[10px] text-arena-text-dim">{asset} {weight}%</span>
              ))}
            </div>
          </div>
        </>
      )}
    </button>
  );
}
