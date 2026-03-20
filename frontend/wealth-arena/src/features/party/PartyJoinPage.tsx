import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { save } from '@/services/persistence';
import { joinRoom } from '@/services/partyApi';

export default function PartyJoinPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setJoining(true);
    try {
      const room = await joinRoom(code.toUpperCase());
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
        started: room.started,
      });
      navigate('/party/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room not found. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white">Join a Room</h1>
        <p className="text-arena-text-dim mt-2">Enter the 6-character code from your host.</p>
      </div>

      <form onSubmit={handleJoin} className="bg-arena-surface border border-arena-border rounded-xl p-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-arena-text-dim mb-2">Room Code</label>
          <input
            type="text"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full bg-arena-bg border border-arena-border rounded-lg px-4 py-4 text-white text-center text-3xl font-mono tracking-[0.5em] uppercase focus:outline-none focus:border-arena-accent"
            placeholder="______"
          />
        </div>

        {error && <p className="text-sm text-arena-danger mb-4">{error}</p>}

        <button
          type="submit"
          disabled={joining}
          className="w-full bg-arena-accent text-black font-bold py-3 rounded-lg hover:bg-arena-accent/90 transition-colors disabled:opacity-50"
        >
          {joining ? 'Joining…' : 'Join Room'}
        </button>
      </form>
    </div>
  );
}
