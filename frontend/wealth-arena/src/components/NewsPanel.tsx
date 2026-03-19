import type { BackendNewsArticle } from '../types/backend';

/**
 * NewsPanel — renders a single backend-provided NewsArticle.
 * Designed to slot into GamePage and NewsPage with existing styling.
 */
export default function NewsPanel({ article }: { article: BackendNewsArticle }) {
  return (
    <div className="bg-arena-surface border border-arena-border rounded-2xl overflow-hidden">
      {/* Headline + Bulletin */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">📰</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white leading-snug">{article.headline}</h3>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">{article.short_bulletin}</p>
          </div>
        </div>
      </div>

      {/* Beginner Explanation */}
      <div className="bg-arena-accent/5 border-t border-arena-accent/20 px-4 py-3">
        <p className="text-[10px] font-bold uppercase text-arena-accent tracking-wider mb-1">What this means for you</p>
        <p className="text-xs text-gray-300 leading-relaxed">{article.beginner_explanation}</p>
      </div>

      {/* Historical Example (if present) */}
      {article.historical_example && (
        <div className="bg-purple-500/5 border-t border-purple-500/20 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm">📚</span>
            <p className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Historical Parallel</p>
          </div>
          <p className="text-xs font-semibold text-white mb-1">{article.historical_example.title}</p>
          <div className="space-y-1.5 text-xs text-gray-300 leading-relaxed">
            <p><span className="text-purple-400 font-semibold">Why similar:</span> {article.historical_example.why_similar}</p>
            <p><span className="text-arena-blue font-semibold">What happened:</span> {article.historical_example.what_happened}</p>
            <p><span className="text-arena-accent font-semibold">Takeaway:</span> {article.historical_example.beginner_takeaway}</p>
          </div>
        </div>
      )}

      {/* Meta line */}
      <div className="border-t border-arena-border px-4 py-2 flex items-center justify-between">
        <span className="text-[9px] text-arena-text-dim font-mono">
          mode: {article.generation_mode}
        </span>
        {article.validation_flags.length > 0 && (
          <span className="text-[9px] text-arena-text-dim font-mono truncate max-w-[200px]">
            flags: {article.validation_flags.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}
