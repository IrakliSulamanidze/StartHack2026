import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { load, save } from '@/services/persistence';
import type { ClassroomRoom } from '@/shared/types/domain';

export default function ClassroomJoinPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const room = load<ClassroomRoom>('classroom_room');
    if (room && room.roomCode === code.toUpperCase()) {
      // Add player to room
      const updated = {
        ...room,
        players: [...room.players, { id: user?.id ?? '', name: user?.name ?? 'Player', isHost: false }],
      };
      save('classroom_room', updated);
      navigate('/classroom/lobby');
    } else {
      setError('Room not found. Check the code and try again.');
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white">🎮 Join a Room</h1>
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
          className="w-full bg-arena-accent text-black font-bold py-3 rounded-lg hover:bg-arena-accent/90 transition-colors"
        >
          Join Room
        </button>
      </form>
    </div>
  );
}
