import { useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';

const AI_SYSTEM_PROMPT = `You are the "Market Mentor" AI inside an investment education game for young adults (ages 18-30) who are beginners with no finance background.

Your job is to take raw, jargon-heavy financial news and translate it so a complete beginner can understand what it means for their portfolio.

RULES — follow every single one:
1. TRANSLATION: Rewrite the news in 2 plain-English sentences. No jargon. A high-schooler should understand it.
2. ANALOGY: Provide one real-life analogy that a young adult can relate to. Good domains: running a small online shop, freelancing, splitting rent with roommates, managing a food truck, taking out a car loan, budgeting for a road trip. Do NOT use childish metaphors like apples/oranges or piggy banks.
3. ACTIONABLE LEARNING: End with exactly one sentence starting with "Historically, this type of event causes" and name which asset classes tend to go up and which tend to go down.

FORMAT your response EXACTLY like this (use these exact headers):

**What it means:** <your 2-sentence translation>

**Real-life analogy:** <your analogy in 2-3 sentences>

**What usually happens:** Historically, this type of event causes <X> to <rise/drop> and <Y> to <rise/drop>.`;

const FALLBACK_TRANSLATIONS: Record<string, { translation: string; analogy: string; actionable: string }> = {
  positive: {
    translation: 'This news signals good times for the market. Companies are likely to see increased profits and stock prices may climb.',
    analogy: "Think of it like your freelance business getting a flood of new clients — you're busier, earning more, and your overall value goes up. The economy works the same way when good news hits.",
    actionable: 'Historically, this type of event causes stocks and equity indices to rise, while safe-haven assets like bonds and gold may see less demand.',
  },
  negative: {
    translation: 'This news signals trouble ahead. Companies may see profits shrink and investors often get nervous, causing stock prices to fall.',
    analogy: "Imagine you run a food truck and a major road construction project blocks your best spot for months. Your income drops, you cut back on supplies, and you're stressed. That's what a market downturn feels like for businesses.",
    actionable: 'Historically, this type of event causes stocks to drop while bonds and gold tend to rise as investors seek safety.',
  },
  mixed: {
    translation: "This is a mixed signal — there are both positive and negative aspects. The market may move sideways as investors figure out what it all means.",
    analogy: "It's like getting a job offer with a higher salary but in a more expensive city. The net benefit isn't immediately clear, so you need time to analyze both sides before deciding.",
    actionable: 'Historically, this type of event causes short-term volatility across most asset classes, with no clear directional trend.',
  },
};

type FilterCategory = 'all' | 'positive' | 'negative' | 'mixed';

export default function NewsPage() {
  const { state, dispatch } = useGame();
  const [filterCat, setFilterCat] = useState<FilterCategory>('all');
  const [filterTicker, setFilterTicker] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredNews = state.newsItems.filter(n => {
    if (filterCat !== 'all' && n.impactDirection !== filterCat) return false;
    if (filterTicker) {
      const s = filterTicker.toUpperCase();
      if (!n.title.toUpperCase().includes(s) && !n.tickers.some(t => t.includes(s))) return false;
    }
    return true;
  });

  const fetchAIExplanation = useCallback(async (newsItem: typeof state.newsItems[0]) => {
    if (newsItem.aiTranslation) return;
    setLoadingId(newsItem.id);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey) {
      const fb = FALLBACK_TRANSLATIONS[newsItem.impactDirection] ?? FALLBACK_TRANSLATIONS.mixed;
      dispatch({ type: 'UPDATE_NEWS_AI', id: newsItem.id, translation: fb.translation, analogy: fb.analogy, actionable: fb.actionable, source: 'fallback' });
      setLoadingId(null);
      return;
    }

    try {
      const prompt = `${AI_SYSTEM_PROMPT}\n\nHere is the financial news to translate:\n\nHeadline: ${newsItem.title}\nDetails: ${newsItem.details}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 400 } }),
        }
      );

      if (!res.ok) throw new Error(`Gemini ${res.status}`);

      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

      const matchTrans = text.match(/\*\*What it means:\*\*\s*([\s\S]*?)(?=\*\*Real-life analogy|$)/);
      const matchAnalogy = text.match(/\*\*Real-life analogy:\*\*\s*([\s\S]*?)(?=\*\*What usually happens|$)/);
      const matchAction = text.match(/\*\*What usually happens:\*\*\s*([\s\S]*?)$/);

      dispatch({
        type: 'UPDATE_NEWS_AI',
        id: newsItem.id,
        translation: matchTrans?.[1]?.trim() || text.slice(0, 200),
        analogy: matchAnalogy?.[1]?.trim() || '',
        actionable: matchAction?.[1]?.trim() || '',
        source: 'ai',
      });
    } catch {
      const fb = FALLBACK_TRANSLATIONS[newsItem.impactDirection] ?? FALLBACK_TRANSLATIONS.mixed;
      dispatch({ type: 'UPDATE_NEWS_AI', id: newsItem.id, translation: fb.translation, analogy: fb.analogy, actionable: fb.actionable, source: 'fallback' });
    }
    setLoadingId(null);
  }, [dispatch]);

  // Generate seed news if none exist
  function seedNews() {
    for (let i = 0; i < 5; i++) {
      dispatch({ type: 'ADVANCE_ROUND' });
    }
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Market News</h1>
          <p className="text-xs text-arena-text-dim mt-0.5">AI-translated financial news for learning</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {(['all', 'positive', 'negative', 'mixed'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              filterCat === cat
                ? cat === 'positive' ? 'bg-green-500/20 text-green-400'
                : cat === 'negative' ? 'bg-red-500/20 text-red-400'
                : cat === 'mixed' ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-arena-accent/20 text-arena-accent'
                : 'bg-arena-surface text-arena-text-dim hover:text-white border border-arena-border'
            }`}
          >
            {cat === 'all' ? 'All News' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
        <input
          type="text"
          value={filterTicker}
          onChange={e => setFilterTicker(e.target.value)}
          placeholder="Filter by ticker..."
          className="ml-auto bg-arena-bg border border-arena-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-arena-text-dim w-36 focus:outline-none focus:ring-1 focus:ring-arena-accent/50"
        />
      </div>

      {/* News Feed */}
      {filteredNews.length === 0 ? (
        <div className="bg-arena-surface border border-arena-border rounded-2xl p-12 text-center">
          <p className="text-arena-text-dim text-sm mb-4">No market news yet. Start playing to receive news each quarter.</p>
          <button onClick={seedNews} className="bg-arena-accent hover:bg-arena-accent-dim text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors">
            Generate Sample News
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map(news => (
            <div key={news.id} className="bg-arena-surface border border-arena-border rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    news.impactDirection === 'positive' ? 'bg-green-400' :
                    news.impactDirection === 'negative' ? 'bg-red-400' : 'bg-yellow-400'
                  }`} />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white leading-snug">{news.title}</h3>
                    <p className="text-xs text-arena-text-dim mt-1">{news.details}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-semibold text-arena-text-dim bg-arena-bg px-2 py-0.5 rounded">
                        Round {news.round}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        news.impactDirection === 'positive' ? 'bg-green-500/15 text-green-400' :
                        news.impactDirection === 'negative' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
                      }`}>
                        {news.category}
                      </span>
                      {news.tickers.map(t => (
                        <span key={t} className="text-[10px] font-mono text-arena-accent bg-arena-accent/10 px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Translation */}
              {news.aiTranslation ? (
                <div className="bg-arena-accent/5 border-t border-arena-accent/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🤖</span>
                    <span className="text-[10px] font-bold uppercase text-arena-accent tracking-wider">AI Market Mentor</span>
                    {news.aiSource === 'fallback' && <span className="text-[9px] text-arena-text-dim">(offline mode)</span>}
                  </div>
                  <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
                    <div>
                      <p className="text-[10px] font-bold text-arena-accent mb-0.5">What it means</p>
                      <p>{news.aiTranslation}</p>
                    </div>
                    {news.aiAnalogy && (
                      <div>
                        <p className="text-[10px] font-bold text-purple-400 mb-0.5">Real-life analogy</p>
                        <p>{news.aiAnalogy}</p>
                      </div>
                    )}
                    {news.aiActionable && (
                      <div>
                        <p className="text-[10px] font-bold text-amber-400 mb-0.5">What usually happens</p>
                        <p>{news.aiActionable}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t border-arena-border p-3 flex items-center justify-between">
                  <span className="text-[10px] text-arena-text-dim">Click to get an AI-powered explanation</span>
                  <button
                    onClick={() => fetchAIExplanation(news)}
                    disabled={loadingId === news.id}
                    className="text-[11px] font-semibold text-arena-accent bg-arena-accent/10 hover:bg-arena-accent/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingId === news.id ? 'Translating...' : '🤖 Explain This'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
