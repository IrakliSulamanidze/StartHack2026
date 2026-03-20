interface Props {
  current: number;
  total: number;
  titles?: string[];
}

export default function RoundProgressBar({ current, total, titles }: Props) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white">Round {current} / {total}</span>
        <span className="text-xs text-arena-text-dim">
          {titles?.[current - 1] ?? `Round ${current}`}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all ${
              i < current
                ? 'bg-arena-accent'
                : i === current
                  ? 'bg-arena-accent/40 animate-pulse'
                  : 'bg-arena-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
