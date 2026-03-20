import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARCHETYPES, TIMING_PRESETS } from '@/shared/types/domain';
import type { ArchetypeId, TimingPreset } from '@/shared/types/domain';
import { useAuth } from '@/features/auth/AuthContext';
import ArchetypeCard from '@/shared/components/ArchetypeCard';
import { save } from '@/services/persistence';
import { createRoom } from '@/services/partyApi';

export default function PartyHostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [archetype, setArchetype] = useState<ArchetypeId>('balanced-core');
  const [timing, setTiming] = useState<TimingPreset>('standard');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      const room = await createRoom(
        roomName || `${user?.name}'s Room`,
        archetype,
        timing,
      );
      // Save to localStorage for the play page to pick up
      save('party_room', {
        roomCode: room.room_code,
        roomName: room.room_name,
        archetype: room.archetype,
        objective: null,
        timing: room.timing,
        hostId: room.host_id,
        players: room.players.map((p: { id: string; name: string; isHost: boolean }) => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
        })),
        started: false,
      });
      navigate('/party/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-white mb-2">Host a Party Room</h1>
      <p className="text-arena-text-dim mb-8">Configure the game settings. Players will play the same scenario.</p>

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
        <h2 className="text-lg font-bold text-white mb-1">Choose Investor Profile for All Players</h2>
        <p className="text-sm text-arena-text-dim mb-4">Everyone plays with the same profile.</p>
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

      {error && <p className="text-sm text-arena-danger mb-4">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full bg-arena-accent text-black font-bold py-3 rounded-xl text-lg hover:bg-arena-accent/90 transition-colors disabled:opacity-50"
      >
        {creating ? 'Creating…' : 'Create Room →'}
      </button>
    </div>
  );
}
