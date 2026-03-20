import type { Headline } from '@/shared/types/domain';

interface Props {
  headlines: Headline[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export default function HeadlineBundle({ headlines, selectedIds, onToggle, disabled }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">📰 Market Headlines</h3>
        <span className="text-xs text-arena-text-dim">
          {selectedIds.length} signal{selectedIds.length !== 1 ? 's' : ''} marked
        </span>
      </div>
      {headlines.map((h) => {
        const isSelected = selectedIds.includes(h.id);
        return (
          <button
            key={h.id}
            onClick={() => !disabled && onToggle(h.id)}
            disabled={disabled}
            className={`w-full text-left rounded-lg border p-3 transition-all ${
              isSelected
                ? 'border-arena-accent bg-arena-accent/10'
                : 'border-arena-border bg-arena-surface hover:border-white/20'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs mt-0.5">
                {h.category === 'macro' ? '🌐' : h.category === 'equity' ? '📈' : h.category === 'commodity' ? '🪙' : h.category === 'geopolitical' ? '🌍' : '📋'}
              </span>
              <div className="flex-1">
                <p className="text-sm text-white font-medium leading-snug">{h.text}</p>
                <p className="text-xs text-arena-text-dim mt-1">{h.detail}</p>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isSelected ? 'border-arena-accent bg-arena-accent' : 'border-arena-border'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
