import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARCHETYPES, AI_MODES } from '@/shared/types/domain';
import type { ArchetypeId, AIMode } from '@/shared/types/domain';
import ArchetypeCard from '@/shared/components/ArchetypeCard';
import ModeCard from '@/shared/components/ModeCard';
import { save } from '@/services/persistence';

export default function SandboxSetupPage() {
  const navigate = useNavigate();
  const [archetype, setArchetype] = useState<ArchetypeId>('balanced-core');
  const [aiMode, setAiMode] = useState<AIMode>('coach');

  function handleStart() {
    save('sandbox_config', { archetype, aiMode });
    navigate('/sandbox/play');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white">Sandbox Setup</h1>
        <p className="text-arena-text-dim mt-2">Customize your game. Pick your investor profile and AI mode.</p>
      </div>

      {/* Step 1: Archetype */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">1. Choose Your Investor Profile</h2>
        <p className="text-sm text-arena-text-dim mb-4">Your profile determines your starting allocation and risk level.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARCHETYPES.map((a) => (
            <ArchetypeCard key={a.id} archetype={a} selected={archetype === a.id} onClick={() => setArchetype(a.id)} />
          ))}
        </div>
      </section>

      {/* Step 2: AI Mode */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">2. Pick Your AI Companion</h2>
        <p className="text-sm text-arena-text-dim mb-4">How much help do you want?</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {AI_MODES.map((m) => (
            <ModeCard key={m.id} mode={m} selected={aiMode === m.id} onClick={() => setAiMode(m.id)} />
          ))}
        </div>
      </section>

      {/* Launch */}
      <div className="text-center">
        <button
          onClick={handleStart}
          className="px-12 py-3 bg-arena-accent text-black font-bold rounded-xl text-lg hover:bg-arena-accent/90 transition-colors shadow-lg shadow-arena-accent/20"
        >
          Launch Sandbox Run →
        </button>
      </div>
    </div>
  );
}
