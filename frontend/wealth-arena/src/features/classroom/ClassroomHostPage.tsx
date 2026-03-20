import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARCHETYPES, TIMING_PRESETS } from '@/shared/types/domain';
import type { ArchetypeId, TimingPreset } from '@/shared/types/domain';
import { useAuth } from '@/features/auth/AuthContext';
import ArchetypeCard from '@/shared/components/ArchetypeCard';
import { save } from '@/services/persistence';

export default function ClassroomHostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [archetype, setArchetype] = useState<ArchetypeId>('balanced-core');
  const [timing, setTiming] = useState<TimingPreset>('standard');

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function handleCreate() {
    const code = generateRoomCode();
    const room = {
      roomCode: code,
      roomName: roomName || `${user?.name}'s Room`,
      archetype,
      objective: null,
      timing,
      hostId: user?.id ?? '',
      players: [{ id: user?.id ?? '', name: user?.name ?? 'Host', isHost: true }],
      started: false,
    };
    save('classroom_room', room);
    navigate('/classroom/lobby');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-white mb-2">🎤 Host a Classroom Room</h1>
      <p className="text-arena-text-dim mb-8">Configure the game settings. Students will play the same scenario.</p>

      {/* Room Name */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-arena-text-dim mb-1">Room Name</label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="w-full bg-arena-bg border border-arena-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arena-accent"
          placeholder={`${user?.name}'s Finance Class`}
        />
      </div>

      {/* Archetype */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-1">Choose Archetype for All Players</h2>
        <p className="text-sm text-arena-text-dim mb-4">Everyone plays with the same archetype.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ARCHETYPES.map((a) => (
            <ArchetypeCard key={a.id} archetype={a} selected={archetype === a.id} compact onClick={() => setArchetype(a.id)} />
          ))}
        </div>
      </div>

      {/* Timing */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3">Timer Preset</h2>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(TIMING_PRESETS) as [TimingPreset, typeof TIMING_PRESETS[TimingPreset]][]).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setTiming(key)}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                timing === key
                  ? 'border-arena-accent bg-arena-accent/5'
                  : 'border-arena-border hover:border-white/20 bg-arena-surface'
              }`}
            >
              <p className="font-bold text-white">{preset.label}</p>
              <p className="text-xs text-arena-text-dim mt-1">
                R1: {preset.round1}s • Others: {preset.laterRounds}s
              </p>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        className="w-full bg-arena-accent text-black font-bold py-3 rounded-xl text-lg hover:bg-arena-accent/90 transition-colors"
      >
        Create Room →
      </button>
    </div>
  );
}
