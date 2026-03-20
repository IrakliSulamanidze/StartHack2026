import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIMode } from '@/shared/types/domain';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

function getModel() {
  if (!model && API_KEY) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  if (!API_KEY) console.warn('[Gemini] No API key found — check VITE_GEMINI_API_KEY in .env');
  return model;
}

// ── Full game knowledge injected into every prompt ──

const GAME_KNOWLEDGE = `
=== GAME: "Last Portfolio Standing" ===
A single-player portfolio simulation / financial literacy game. Players allocate a $100,000 portfolio across real financial instruments, react to market headlines, and are scored on performance.

--- GAME MODES ---
• Daily Puzzle: One allocation, one hidden scenario per day. Streak tracking. Quick 2-minute play. Uses "Terminal" AI mode.
• Sandbox: Full 10-round game. Player picks archetype + AI mode. 3 actions/round: Keep, Rebalance, or Custom allocation.
• Classroom: 10-round multiplayer. Host creates room with archetype, timing preset, optional objective. Shows leaderboard.

--- ARCHETYPES (player "investment philosophy") ---
• 🏰 Fortress (defensive): 50% bonds, 20% equities, 20% gold, 10% fx — avoids crashes but misses rallies
• ⚖️ Balanced Core (classic): 45% equities, 35% bonds, 10% gold, 10% fx — works in most conditions
• 🎯 Tactician (flexible): 35% equities, 25% bonds, 15% gold, 15% fx, 10% crypto — can rebalance actively
• 🦅 Hunter (aggressive): 65% equities, 10% bonds, 5% gold, 15% crypto, 5% fx — high growth, high drawdown risk

--- ASSET CATEGORIES & KEY INSTRUMENTS ---
• Equities: SMI, EUROSTOXX50, DJIA, NIKKEI225, DAX, plus 20 US stocks (AAPL, MSFT, AMZN, NVDA, GOOGL, TSLA, JPM, META, V, JNJ, etc.) and 10 Swiss stocks (NESN, NOVN, ROG, UBSG, ABBN, etc.)
• Bonds: CH-BOND-TR, GLOBAL-AGG-TR-CHF, CH-GOV-10Y-YIELD
• Gold: GOLD-USD, GOLD-CHF
• FX: USDCHF, EURCHF
• Crypto: (category exists but currently empty instruments)

--- 10-ROUND SCENARIO PROGRESSION ---
Round 1: Initial Allocation (baseline, all impacts zero)
Round 2: Calm Expansion (+4.2% equities, +0.5% bonds, -1.2% gold, +6.1% crypto)
Round 3: Noise Trap (+0.8% equities, small moves — tests signal filtering)
Round 4: FOMO Rally (+7.5% equities, +15.2% crypto — euphoria test)
Round 5: Rebalance Checkpoint (-1.2% equities, +0.8% gold — mid-game)
Round 6: Inflation Surprise (-4.8% equities, -3.2% bonds, +5.5% gold — inflation shock)
Round 7: Banking Panic (-9.2% equities, +8.0% gold, -22.0% crypto — crisis mode)
Round 8: Recovery Snapback (+5.5% equities, +12.0% crypto — relief rally)
Round 9: Geopolitical Shock (-5.2% equities, +6.5% gold, -10.5% crypto — trade/energy disruption)
Round 10: Final Rotation (+3.8% equities, +0.8% bonds — stabilization)

--- HEADLINE MECHANIC ---
Each round shows 5-7 headlines. Some are SIGNALS (real market-moving info) and others are NOISE (irrelevant/misleading).
Signals: earnings data, GDP/employment reports, rate changes, trade deals, bond yields, gold trends, geopolitical events, central bank actions, inflation data, sector moves.
Noise: celebrity investor gossip, social media trends, one-off fines, astrology, anecdotes, perma-bear crash predictions, rumors.
Players mark which headlines they think are signals. Scoring rewards correct identification.

--- SCORING SYSTEM ---
Sandbox/Classroom scoring (100 pts):
  • Return (40%): Portfolio return from hidden round impacts
  • Resilience (25%): max(0, min(100, 50 + portfolioReturn × 5))
  • Signal Filtering (20%): % of correctly identified signals vs noise
  • Strategy Fidelity (15%): max(0, 100 - drift × 2), where drift = how far allocation strays from archetype

Daily scoring uses the same formula but with fixed hidden impacts: equities +3.2%, bonds +0.8%, gold +2.5%, fx -0.4%, crypto -5.8%.

--- STRATEGY GUIDELINES ---
• Fortress players should lean into bonds and gold during uncertainty (rounds 6-7-9), accept lower returns in rallies.
• Balanced Core is a safe default; small tilts based on macro headlines are appropriate.
• Tactician can shift between offense/defense each round; high signal quality is key.
• Hunter should ride equities/crypto in expansions (rounds 2,4,8) but risks heavy drawdowns in crises (rounds 6,7,9).
• Gold is the best crisis hedge (rounds 6,7,9). Bonds are steady but lose in inflation (round 6).
• High signal filtering scores come from: selecting real macroeconomic data, ignoring celebrity/social-media noise.
• Strategy fidelity matters — drifting far from your archetype costs points even if returns are good.

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
3. REBALANCING ADVICE: If the player asks about rebalancing, explain whether it makes sense FOR THEIR ARCHETYPE right now. Don't just say yes/no — explain the archetype logic. ("Hunters ride volatility — rebalancing now locks in losses your archetype is designed to recover from.")
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

  terminal: `ROLE: Raw data terminal — minimal processing, maximum signal density. You are a TOOL, not an advisor.

YOUR JOB:
1. RAW HEADLINES: When asked about headlines, present them stripped down to their core data point. No commentary. ("ECB rate +25bp. US GDP 2.1%. Gold $2,450. Elon tweets — irrelevant.")
2. RAW EXPOSURE: When asked about portfolio, state exact current allocation numbers and category totals. That's it. ("EQ 45% | BD 35% | AU 10% | FX 10% | Drift: 0%")
3. CONCISE IMPLICATIONS ONLY: If the player prompts well with a specific question, give the shortest possible implication. One line max per point. ("Rate hike → bonds DOWN, gold FLAT, equities MIXED.")
4. REWARD GOOD PROMPTS: If the player asks a vague question ("help me"), give minimal response (">> Specify: headlines, exposure, or scenario?"). If they ask a precise question ("what does the inflation data mean for my gold position?"), give a precise answer.

STRICT FORMAT RULES:
- EVERY line starts with ">> ". No exceptions.
- Maximum 3-4 lines. NEVER exceed 4 lines total.
- Use abbreviations: EQ, BD, AU, FX, CR for asset classes. 
- ALL CAPS for tickers and key data points.
- No paragraphs. No explanations. No hand-holding.
- If the player's prompt is lazy/vague, respond with 1 line asking them to be specific.`,
};

export interface GameContext {
  portfolioValue: number;
  allocation: Record<string, number>;
  archetype?: string;
  scenarioTitle?: string;
  scenarioDescription?: string;
  headlines?: { id: string; text: string; category: string; isSignal: boolean }[];
  selectedHeadlines?: string[];
  gameMode?: 'daily' | 'sandbox' | 'classroom';
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
Coach: 3-5 sentences. Assistant: 6 bullets max. Terminal: 3-4 lines max.`,
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
    return `Hey there! 😊 It looks like I'm having trouble connecting right now, but here's something to think about — take a look at the headlines on your screen and ask yourself: "Does this headline contain hard economic data, or is it just someone's opinion?" That simple question is the key to filtering signal from noise. What patterns do you notice?`;
  }
  if (mode === 'assistant') {
    return `**Connection Issue — Offline Analysis**\n\n• **Status**: AI service temporarily unavailable\n• **Recommendation**: Review headlines for macro indicators (GDP, rates, employment) vs sentiment (opinions, predictions)\n• **Action**: Check your category-level exposure against your archetype targets\n\n_Bottom line: Manual analysis required until connection is restored._`;
  }
  return `>> CONNECTION LOST. Oracle offline.\n>> Fallback protocol: Trust your archetype. Filter noise.\n>> Reconnect and retry.`;
}
