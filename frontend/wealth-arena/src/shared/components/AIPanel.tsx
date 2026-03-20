import { useState } from 'react';
import type { AIMode } from '@/shared/types/domain';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  mode: AIMode;
  onAsk: (question: string) => Promise<string>;
}

const MODE_CONFIG = {
  coach: { name: 'Coach', icon: '🎓', placeholder: 'Ask your coach for guidance...', color: 'arena-accent' },
  assistant: { name: 'Assistant', icon: '🤖', placeholder: 'Ask for data analysis...', color: 'blue-400' },
  terminal: { name: 'Terminal', icon: '💀', placeholder: 'Query the oracle...', color: 'arena-danger' },
} as const;

/** Lightweight markdown-ish renderer for AI responses */
function renderMarkdown(text: string) {
  // Split into paragraphs on double newlines or single newlines
  const blocks = text.split(/\n{2,}/).filter(Boolean);

  return blocks.map((block, bi) => {
    const lines = block.split('\n');
    const rendered = lines.map((line, li) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // Terminal-style >> lines
      if (trimmed.startsWith('>> ')) {
        return (
          <div key={li} className="font-mono text-arena-accent/90">
            {formatInline(trimmed)}
          </div>
        );
      }

      // Bullet points: * or • at start
      if (/^[*•]\s/.test(trimmed)) {
        return (
          <div key={li} className="flex gap-1.5 ml-2">
            <span className="text-arena-accent shrink-0">•</span>
            <span>{formatInline(trimmed.replace(/^[*•]\s+/, ''))}</span>
          </div>
        );
      }

      // Regular line
      return <div key={li}>{formatInline(trimmed)}</div>;
    });

    return (
      <div key={bi} className={bi > 0 ? 'mt-2' : ''}>
        {rendered}
      </div>
    );
  });
}

/** Handles **bold**, _italic_, and `code` inline formatting */
function formatInline(text: string) {
  // Process bold, italic, and code in order
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Find the earliest match
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/_(.+?)_/);
    const codeMatch = remaining.match(/`(.+?)`/);

    const candidates: { idx: number; len: number; el: JSX.Element; full: string }[] = [];
    if (boldMatch?.index !== undefined) {
      candidates.push({
        idx: boldMatch.index,
        len: boldMatch[0].length,
        el: <strong key={key++} className="text-white font-semibold">{boldMatch[1]}</strong>,
        full: boldMatch[0],
      });
    }
    if (italicMatch?.index !== undefined) {
      candidates.push({
        idx: italicMatch.index,
        len: italicMatch[0].length,
        el: <em key={key++} className="text-arena-text-dim/80 italic">{italicMatch[1]}</em>,
        full: italicMatch[0],
      });
    }
    if (codeMatch?.index !== undefined) {
      candidates.push({
        idx: codeMatch.index,
        len: codeMatch[0].length,
        el: <code key={key++} className="bg-white/10 px-1 rounded text-arena-accent font-mono">{codeMatch[1]}</code>,
        full: codeMatch[0],
      });
    }

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    // Pick earliest match
    candidates.sort((a, b) => a.idx - b.idx);
    const winner = candidates[0];

    if (winner.idx > 0) {
      parts.push(remaining.slice(0, winner.idx));
    }
    parts.push(winner.el);
    remaining = remaining.slice(winner.idx + winner.len);
  }

  return <>{parts}</>;
}

export default function AIPanel({ mode, onAsk }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: getIntro(mode) },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const cfg = MODE_CONFIG[mode];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setIsLoading(true);
    try {
      const answer = await onAsk(question);
      setMessages((prev) => [...prev, { role: 'ai', text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Something went wrong. Try again.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-arena-border">
        <span>{cfg.icon}</span>
        <span className="text-sm font-semibold text-white">{cfg.name} Mode</span>
        <span className={`ml-auto w-2 h-2 rounded-full bg-${cfg.color} animate-pulse`} />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-arena-accent/20 text-arena-accent'
                  : 'bg-white/5 text-arena-text-dim'
              }`}
            >
              {m.role === 'user' ? m.text : renderMarkdown(m.text)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 text-arena-text-dim rounded-lg px-3 py-2 text-xs animate-pulse">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-arena-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={cfg.placeholder}
            className="flex-1 bg-arena-bg border border-arena-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-arena-text-dim focus:outline-none focus:border-arena-accent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-arena-accent text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-arena-accent/90 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function getIntro(mode: AIMode): string {
  switch (mode) {
    case 'coach':
      return "Hey! I'm your strategy coach 🎓 I'll help you figure out which headlines matter for your archetype, whether rebalancing makes sense right now, and how your strategy plays out in the real world. What are you thinking about?";
    case 'assistant':
      return "Analysis mode. I'll summarize and cluster the headlines for you, and flag which asset classes they touch. Ask me for inference if you want my read on implications.";
    case 'terminal':
      return ">> TERMINAL ONLINE. Raw data feed.\n>> Query: headlines | exposure | scenario\n>> Prompt precisely. Vague input = vague output.";
  }
}
