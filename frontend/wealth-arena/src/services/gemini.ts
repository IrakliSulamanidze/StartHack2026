import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIMode } from '@/shared/types/domain';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

function getModel() {
  if (!model && API_KEY) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  }
  if (!API_KEY) console.warn('[Gemini] No API key found — check VITE_GEMINI_API_KEY in .env');
  return model;
}

// ── Full game knowledge injected into every prompt ──

const GAME_KNOWLEDGE = `
=== GAME: "Endgame Securities" ===
A single-player portfolio simulation / financial literacy game. Players allocate a $100,000 portfolio across real financial instruments, react to market headlines, and are scored on performance.

--- GAME MODES ---
• Daily Puzzle: One allocation, one hidden scenario per day. Streak tracking. Quick 2-minute play. Uses "Terminal" AI mode.
• Sandbox: Full 10-round game. Player picks archetype + AI mode. 3 actions/round: Keep, Rebalance, or Custom allocation.
• Party: 10-round multiplayer. Host creates room with archetype, timing preset, optional objective. Shows leaderboard.

--- ARCHETYPES (player "investment philosophy") ---
• Fortress (conservative): 50% bonds, 20% equities, 20% gold, 10% fx — protects capital, smallest losses in shocks, lower upside
• Balanced Core (recommended default): 45% equities, 35% bonds, 10% gold, 10% fx — classic diversified long-term approach, works in most conditions
• Growth Builder (higher-risk long-term): 65% equities, 20% bonds, 10% gold, 5% fx — stronger long-run growth, still diversified, more volatility but not speculative

--- ASSET CATEGORIES & KEY INSTRUMENTS ---
• Equities: SMI, EUROSTOXX50, DJIA, NIKKEI225, DAX, plus 20 US stocks (AAPL, MSFT, AMZN, NVDA, GOOGL, TSLA, JPM, META, V, JNJ, etc.) and 10 Swiss stocks (NESN, NOVN, ROG, UBSG, ABBN, etc.)
• Bonds: CH-BOND-TR, GLOBAL-AGG-TR-CHF, CH-GOV-10Y-YIELD
• Gold: GOLD-USD, GOLD-CHF
• FX: USDCHF, EURCHF

--- 10-ROUND SCENARIO PROGRESSION ---
Round 1: Initial Allocation (baseline, all impacts zero)
Round 2: Calm Expansion (+4.2% equities, +0.5% bonds, -1.2% gold)
Round 3: Noise Trap (+0.8% equities, small moves — tests signal filtering)
Round 4: FOMO Rally (+7.5% equities — euphoria test)
Round 5: Rebalance Checkpoint (-1.2% equities, +0.8% gold — mid-game)
Round 6: Inflation Surprise (-4.8% equities, -3.2% bonds, +5.5% gold — inflation shock)
Round 7: Banking Panic (-9.2% equities, +8.0% gold — crisis mode)
Round 8: Recovery Snapback (+5.5% equities — relief rally)
Round 9: Geopolitical Shock (-5.2% equities, +6.5% gold — trade/energy disruption)
Round 10: Final Rotation (+3.8% equities, +0.8% bonds — stabilization)

--- HEADLINE MECHANIC ---
Each round shows 5-7 headlines. Some are SIGNALS (real market-moving info) and others are NOISE (irrelevant/misleading).
Signals: earnings data, GDP/employment reports, rate changes, trade deals, bond yields, gold trends, geopolitical events, central bank actions, inflation data, sector moves.
Noise: celebrity investor gossip, social media trends, one-off fines, astrology, anecdotes, perma-bear crash predictions, rumors.
Players mark which headlines they think are signals. Scoring rewards correct identification.

--- SCORING SYSTEM ---
Sandbox/Party scoring (100 pts):
  • Return (40%): Portfolio return from hidden round impacts
  • Resilience (25%): max(0, min(100, 50 + portfolioReturn × 5))
  • Signal Filtering (20%): % of correctly identified signals vs noise
  • Strategy Fidelity (15%): max(0, 100 - drift × 2), where drift = how far allocation strays from archetype

Daily scoring uses the same formula but with fixed hidden impacts: equities +3.2%, bonds +0.8%, gold +2.5%, fx -0.4%.

--- STRATEGY GUIDELINES ---
• Fortress players should lean into bonds and gold during uncertainty (rounds 6-7-9), accept lower returns in rallies. Capital protection is their primary goal.
• Balanced Core is the recommended default for most players; small tilts based on macro headlines are appropriate. Steady diversified growth over time.
• Growth Builder should stay equity-heavy for long-term compounding (rounds 2,4,8 reward this), but needs discipline during downturns (rounds 6,7,9). NOT speculative — still diversified, just tilted toward growth.
• Gold is the best crisis hedge (rounds 6,7,9). Bonds are steady but lose in inflation (round 6).
• High signal filtering scores come from: selecting real macroeconomic data, ignoring celebrity/social-media noise.
• Strategy fidelity matters — drifting far from your archetype costs points even if returns are good.
• This product is designed for beginner investors learning about long-term investing, diversification, and risk management. Discourage gambling/speculative behavior in your advice.

--- IMPORTANT RULES ---
• NEVER reveal the exact hidden round impacts or scoring formula to players. Guide them toward good reasoning.
• Headlines with isSignal=true are the real signals. Help players think about WHY a headline matters, not whether it's marked signal.
• The game is educational — encourage learning about diversification, risk management, and critical thinking about news.
`;

const MODE_INSTRUCTIONS: Record<AIMode, string> = {
  coach: `ROLE: Investment strategy coach — focused on the player's ARCHETYPE and EDUCATION.

YOUR JOB (you MUST do all of these for every response):
1. FILTER HEADLINES: Tell the player which headlines actually matter for THEIR specific archetype, and why. Ignore the rest.
2. ARCHETYPE FIT: Explain how the current scenario and headlines connect to their chosen archetype's strategy. ("As a Fortress player, this inflation headline is critical because your bonds are exposed.")
3. REBALANCING ADVICE: If the player asks about rebalancing, explain whether it makes sense FOR THEIR ARCHETYPE right now. Don't just say yes/no — explain the archetype logic. ("Growth Builders accept short-term drops for long-term compounding — rebalancing now might lock in losses your strategy is designed to recover from.")
4. REAL-WORLD PARALLELS: Connect game concepts to how that strategy works in real life. Use analogies and real historical examples. ("This is like 2022 when inflation spiked — Fortress-style portfolios with gold held up while aggressive growth got crushed.")

STRICT FORMAT RULES:
- Natural flowing paragraphs, 3-5 sentences max.
- End with a question that makes the player think about their archetype's philosophy.
- Use 1-2 emoji max for warmth.
- NEVER use bullet points. NEVER give exact allocation numbers.
- Always mention their archetype by name.`,

  assistant: `ROLE: Data analyst — focused on ORGANIZING and SUMMARIZING information. You do NOT give opinions unless asked.

YOUR JOB:
1. SUMMARIZE & CLUSTER HEADLINES: Group the current headlines by theme (macro, sector, geopolitical, noise). Label each cluster clearly.
2. HELP FILTER THE FEED: For each cluster, state what asset classes it's most relevant to in SHORT form. ("→ equities, bonds" not a paragraph explaining why.)
3. WAIT FOR INFERENCE REQUESTS: Do NOT volunteer your opinion on what the player should do. Only provide inferences when the player EXPLICITLY asks.
4. When inference IS requested: Stay SHORT. One bullet per asset class affected. State direction and magnitude only. ("Equities: headlines support +2-4% — hold or slight overweight." NOT a paragraph about historical context.)

CRITICAL LENGTH RULES — NEVER VIOLATE:
- Each bullet point is ONE sentence. Maximum 15 words per bullet. If your bullet is longer than one line, it's too long. Rewrite it shorter.
- Maximum 6 bullets total per response. If you write more than 6, you have FAILED.
- NO paragraphs. EVER. Not even when giving inference. Only bullets under headers.
- Each header gets 1-3 bullets max.

STRICT FORMAT RULES:
- ALWAYS use bullet points (•) grouped under **bold section headers**.
- One header per theme: **Macro**, **Sector**, **Geopolitical**, **Noise**, etc.
- When giving inference, add one **Recommendation** header with 1-2 bullets max.
- End with italic: _Ask me to analyze implications if you want inference._
- NO opinions, NO recommendations unless the player explicitly asks.`,

  terminal: `ROLE: Helpful AI assistant — direct, honest, and genuinely useful.

You are a normal, friendly AI helper. The player can ask you anything about the game, their portfolio, headlines, strategy, or investing concepts. Just answer naturally and helpfully.

YOUR JOB:
1. Answer whatever the player asks in a clear, direct way.
2. If they ask about headlines, explain which ones matter and why.
3. If they ask about their portfolio, tell them what you see and what it means.
4. If they ask general investing questions, give simple, educational answers.
5. If they need help deciding what to do, share your honest take.

STYLE:
- Talk like a helpful, knowledgeable friend. No roleplay, no gimmicks.
- Keep answers concise but don't be artificially short. Say what needs to be said.
- Use plain language. Avoid jargon unless the player uses it first.
- Be encouraging and educational. This is a learning tool for beginners.`,
};

export interface GameContext {
  portfolioValue: number;
  allocation: Record<string, number>;
  archetype?: string;
  scenarioTitle?: string;
  scenarioDescription?: string;
  headlines?: { id: string; text: string; category: string; isSignal: boolean }[];
  selectedHeadlines?: string[];
  gameMode?: 'daily' | 'sandbox' | 'party';
  totalRounds?: number;
}

export async function askGemini(
  mode: AIMode,
  round: number,
  question: string,
  gameContext?: GameContext,
): Promise<string> {
  const m = getModel();
  if (!m) {
    return getFallback(mode, round, question);
  }

  const totalRounds = gameContext?.totalRounds ?? 10;

  const contextLines: string[] = [
    `Game mode: ${gameContext?.gameMode ?? 'sandbox'}`,
    `Current round: ${round} of ${totalRounds}`,
  ];

  if (gameContext?.archetype) {
    contextLines.push(`Player archetype: ${gameContext.archetype}`);
  }
  if (gameContext?.scenarioTitle) {
    contextLines.push(`Current scenario: ${gameContext.scenarioTitle}`);
  }
  if (gameContext?.scenarioDescription) {
    contextLines.push(`Scenario context: ${gameContext.scenarioDescription}`);
  }
  if (gameContext) {
    contextLines.push(`Portfolio value: $${gameContext.portfolioValue.toLocaleString()}`);
    const sorted = Object.entries(gameContext.allocation)
      .sort(([, a], [, b]) => b - a)
      .filter(([, v]) => v > 0);
    contextLines.push(`Full allocation: ${sorted.map(([k, v]) => `${k}: ${v}%`).join(', ')}`);
  }
  if (gameContext?.headlines && gameContext.headlines.length > 0) {
    contextLines.push(`\nCurrent round headlines:`);
    for (const h of gameContext.headlines) {
      const marked = gameContext.selectedHeadlines?.includes(h.id) ? ' [PLAYER MARKED AS SIGNAL]' : '';
      contextLines.push(`  - [${h.category}] "${h.text}"${marked}`);
    }
  }

  const prompt = [
    GAME_KNOWLEDGE,
    `\n=== YOUR ROLE: ${mode.toUpperCase()} MODE ===`,
    MODE_INSTRUCTIONS[mode],
    `\n=== ABSOLUTE LENGTH LIMIT ===
Your ENTIRE response must be under 150 words. This is a chat widget, not an essay.
If you find yourself writing long explanations, STOP and cut to the key point.
Coach: 3-5 sentences. Assistant: 6 bullets max. Terminal: keep it concise but natural.`,
    `\n--- Current Game State ---`,
    contextLines.join('\n'),
    `\n--- Player Question ---`,
    question,
  ].join('\n');

  try {
    const result = await m.generateContent(prompt);
    const text = result.response.text();
    return text || getFallback(mode, round, question);
  } catch (err) {
    console.error('[Gemini] API call failed:', err);
    return getFallback(mode, round, question);
  }
}

function getFallback(mode: AIMode, _round: number, _context: string): string {
  if (mode === 'coach') {
    return `It looks like I'm having trouble connecting right now, but here's something to think about — take a look at the headlines on your screen and ask yourself: "Does this headline contain hard economic data, or is it just someone's opinion?" That simple question is the key to filtering signal from noise. What patterns do you notice?`;
  }
  if (mode === 'assistant') {
    return `**Connection Issue — Offline Analysis**\n\n• **Status**: AI service temporarily unavailable\n• **Recommendation**: Review headlines for macro indicators (GDP, rates, employment) vs sentiment (opinions, predictions)\n• **Action**: Check your category-level exposure against your archetype targets\n\n_Bottom line: Manual analysis required until connection is restored._`;
  }
  return `I'm having trouble connecting right now, but here's a tip — look at the headlines and focus on the ones with real economic data (GDP, earnings, rates) rather than opinions or social media buzz. Stick with your investor profile and you'll do fine!`;
}

// ── AI Rebalance Suggestion ──

export interface RebalanceSuggestion {
  allocation: Record<string, number>; // category-level: { equities: 40, bonds: 30, ... }
  explanation: string; // 2-3 sentences
}

export async function getRebalanceSuggestion(ctx: {
  archetype: string;
  archetypeAllocation: Record<string, number>;
  currentAllocationByCategory: Record<string, number>;
  round: number;
  scenarioTitle: string;
  scenarioDescription: string;
  headlines: { text: string; category: string }[];
}): Promise<RebalanceSuggestion> {
  const m = getModel();

  const fallbackAlloc = { ...ctx.archetypeAllocation };
  const fallback: RebalanceSuggestion = {
    allocation: fallbackAlloc,
    explanation: `AI unavailable — resetting to your ${ctx.archetype} archetype default allocation.`,
  };

  if (!m) return fallback;

  const headlineList = ctx.headlines.map(h => `- [${h.category}] ${h.text}`).join('\n');
  const categories = Object.keys(ctx.archetypeAllocation).join(', ');

  const prompt = `${GAME_KNOWLEDGE}

=== TASK: REBALANCE SUGGESTION ===
You are generating an AI-driven rebalance suggestion for a portfolio in the game.

Player archetype: ${ctx.archetype}
Archetype default allocation: ${JSON.stringify(ctx.archetypeAllocation)}
Current allocation by category: ${JSON.stringify(ctx.currentAllocationByCategory)}
Round: ${ctx.round} of 10
Scenario: ${ctx.scenarioTitle} — ${ctx.scenarioDescription}

Headlines this round:
${headlineList}

INSTRUCTIONS:
1. Based on the scenario, headlines, and how this archetype would ACTUALLY behave, suggest a rebalanced allocation at the CATEGORY level.
2. Categories are: ${categories}. Weights MUST sum to exactly 100.
3. Stay true to the archetype's philosophy — Fortress stays conservative, Growth Builder stays growth-oriented, etc. But adjust within that philosophy based on what the headlines suggest.
4. Write a SHORT explanation (2-3 sentences max, under 60 words) of WHY this rebalance makes sense for this archetype in this scenario.

RESPOND WITH ONLY valid JSON, no markdown, no code fences:
{"allocation":{"equities":45,"bonds":35,"gold":10,"fx":10},"explanation":"Short reason here."}`;

  try {
    const result = await m.generateContent(prompt);
    let text = result.response.text().trim();
    // Strip markdown code fences if model added them
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text) as RebalanceSuggestion;

    // Validate: must have allocation object with numbers summing to ~100
    if (!parsed.allocation || typeof parsed.allocation !== 'object') return fallback;
    const sum = Object.values(parsed.allocation).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    if (Math.abs(sum - 100) > 2) return fallback;
    if (!parsed.explanation || typeof parsed.explanation !== 'string') {
      parsed.explanation = 'AI suggested this rebalance based on the current scenario.';
    }

    return parsed;
  } catch (err) {
    console.error('[Gemini] Rebalance suggestion failed:', err);
    return fallback;
  }
}

// ── AI Grading ──

export interface AIGrading {
  returnScore: number;        // 0-40
  resilienceScore: number;    // 0-25
  signalScore: number;        // 0-20
  fidelityScore: number;      // 0-15
  totalScore: number;         // 0-100
  comment: string;            // 2-4 sentence archetype-aligned commentary
  behaviorLabel: string;      // e.g. "Fortress Master", "Reckless Drifter"
}

export async function getAIGrading(ctx: {
  archetype: string;
  totalReturnPct: number;
  finalValue: number;
  initialCapital: number;
  roundHistory: {
    round: number;
    action: string;
    returnPct: number;
    driftFromArchetype: number;
    selectedHeadlines: string[];
  }[];
}): Promise<AIGrading> {
  const m = getModel();

  // Build a sensible deterministic fallback
  const retScore = Math.max(0, Math.min(40, Math.round(20 + ctx.totalReturnPct * 2)));
  const worstReturn = ctx.roundHistory.length > 0
    ? Math.min(...ctx.roundHistory.map(r => r.returnPct))
    : 0;
  const resScore = Math.max(0, Math.min(25, Math.round(12.5 + worstReturn * 1.25)));
  const sigScore = Math.round(10 + Math.random() * 6);
  const avgDrift = ctx.roundHistory.length > 0
    ? ctx.roundHistory.reduce((s, r) => s + r.driftFromArchetype, 0) / ctx.roundHistory.length
    : 0;
  const fidScore = Math.max(0, Math.min(15, Math.round(15 - avgDrift * 0.3)));
  const total = retScore + resScore + sigScore + fidScore;

  const fallback: AIGrading = {
    returnScore: retScore,
    resilienceScore: resScore,
    signalScore: sigScore,
    fidelityScore: fidScore,
    totalScore: Math.min(100, total),
    comment: `AI grading unavailable. Your ${ctx.archetype} portfolio returned ${ctx.totalReturnPct >= 0 ? '+' : ''}${ctx.totalReturnPct.toFixed(2)}%.`,
    behaviorLabel: 'Steady Hand',
  };

  if (!m) return fallback;

  const roundSummary = ctx.roundHistory.map(r =>
    `R${r.round}: action=${r.action}, return=${r.returnPct.toFixed(2)}%, drift=${r.driftFromArchetype}%, signals_picked=${r.selectedHeadlines.length}`
  ).join('\n');

  const prompt = `${GAME_KNOWLEDGE}

=== TASK: GRADE THIS PLAYER'S GAME ===

You are the AI judge for "Endgame Securities." Grade this player's full game on a 0-100 scale broken into 4 categories. Your grading must be aligned with what is EXPECTED from their chosen archetype.

Player archetype: ${ctx.archetype}
Initial capital: $${ctx.initialCapital.toLocaleString()}
Final portfolio value: $${ctx.finalValue.toLocaleString()}
Total return: ${ctx.totalReturnPct >= 0 ? '+' : ''}${ctx.totalReturnPct.toFixed(2)}%

=== ROUND-BY-ROUND HISTORY ===
${roundSummary}

=== SCORING RUBRIC (you MUST respect these maximums) ===
1. **Return** (0-40): Portfolio performance. For a ${ctx.archetype} archetype:
   - Fortress: +2-5% is excellent (35-40), 0-2% is decent (20-30), negative is poor
   - Balanced Core: +5-10% is excellent, +2-5% is decent, negative is poor
   - Growth Builder: +8-15% is excellent, +3-8% is decent, negative is poor
   Grade relative to what the archetype SHOULD achieve, not absolute return.

2. **Resilience** (0-25): Drawdown control & consistency. Look at worst round return, number of negative rounds, and how well they avoided crashes.
   - Fortress should have very small drawdowns (high resilience expected)
   - Growth Builder can tolerate bigger drawdowns (more lenient)

3. **Signal Filtering** (0-20): Did they pick the right number of signals? Too many = poor filtering, too few = missing important info. Look at rounds with 2-3 picks (good) vs 0 or 6+ (poor).

4. **Strategy Fidelity** (0-15): Did they stay true to their archetype? Low average drift = high fidelity. Frequent rebalancing back to archetype = disciplined. Custom moves that drift far = low fidelity.

=== OUTPUT FORMAT ===
Respond with ONLY valid JSON, no markdown, no code fences:
{"returnScore":NUMBER,"resilienceScore":NUMBER,"signalScore":NUMBER,"fidelityScore":NUMBER,"totalScore":NUMBER,"comment":"2-4 sentences evaluating the player. Address them directly as 'you'. Reference their archetype by name and specific decisions they made. Be encouraging but honest.","behaviorLabel":"A 1-3 word label like Fortress Master, Steady Grower, Balanced Architect, etc."}`;

  try {
    const result = await m.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text) as AIGrading;

    // Validate ranges
    if (typeof parsed.returnScore !== 'number' || parsed.returnScore < 0 || parsed.returnScore > 40) return fallback;
    if (typeof parsed.resilienceScore !== 'number' || parsed.resilienceScore < 0 || parsed.resilienceScore > 25) return fallback;
    if (typeof parsed.signalScore !== 'number' || parsed.signalScore < 0 || parsed.signalScore > 20) return fallback;
    if (typeof parsed.fidelityScore !== 'number' || parsed.fidelityScore < 0 || parsed.fidelityScore > 15) return fallback;

    // Recalculate total to be safe
    parsed.totalScore = parsed.returnScore + parsed.resilienceScore + parsed.signalScore + parsed.fidelityScore;
    if (!parsed.comment || typeof parsed.comment !== 'string') {
      parsed.comment = fallback.comment;
    }
    if (!parsed.behaviorLabel || typeof parsed.behaviorLabel !== 'string') {
      parsed.behaviorLabel = fallback.behaviorLabel;
    }

    return parsed;
  } catch (err) {
    console.error('[Gemini] AI grading failed:', err);
    return fallback;
  }
}
