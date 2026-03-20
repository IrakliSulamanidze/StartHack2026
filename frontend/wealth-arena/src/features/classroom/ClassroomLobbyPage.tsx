import { useNavigate } from 'react-router-dom';
import { load, save } from '@/services/persistence';
import { useAuth } from '@/features/auth/AuthContext';
import type { ClassroomRoom } from '@/shared/types/domain';
import { getArchetype } from '@/shared/types/domain';

export default function ClassroomLobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const room = load<ClassroomRoom>('classroom_room');

  if (!room) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">No Active Room</h1>
        <button onClick={() => navigate('/classroom')} className="text-arena-accent hover:underline">
          Back to Classroom →
        </button>
      </div>
    );
  }

  const isHost = room.hostId === user?.id;
  const arch = getArchetype(room.archetype);

  function handleStart() {
    save('classroom_room', { ...room, started: true });
    navigate('/classroom/play');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white">{room.roomName}</h1>
        <p className="text-arena-text-dim mt-1">Waiting for players to join…</p>
      </div>

      {/* Room Code Display */}
      <div className="bg-arena-surface border border-arena-border rounded-2xl p-8 text-center mb-8">
        <p className="text-sm text-arena-text-dim mb-2">Share this code with your students:</p>
        <div className="text-5xl font-mono font-black text-arena-accent tracking-[0.3em]">
          {room.roomCode}
        </div>
      </div>

      {/* Room Info */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-arena-text-dim">Archetype</p>
            <p className="text-white font-medium">{arch.icon} {arch.name}</p>
          </div>
          <div>
            <p className="text-arena-text-dim">Timing</p>
            <p className="text-white font-medium capitalize">{room.timing}</p>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-white mb-3">
          Players ({room.players.length})
        </h3>
        <div className="space-y-2">
          {room.players.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-arena-bg rounded-lg px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-arena-accent/20 flex items-center justify-center text-sm font-bold text-arena-accent">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-white">{p.name}</span>
              </div>
              {p.isHost && (
                <span className="text-xs bg-arena-accent/20 text-arena-accent px-2 py-0.5 rounded-full font-medium">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isHost ? (
        <button
          onClick={handleStart}
          className="w-full bg-arena-accent text-black font-bold py-3 rounded-xl text-lg hover:bg-arena-accent/90 transition-colors"
        >
          Start Game for Everyone →
        </button>
      ) : (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-arena-text-dim">
            <div className="w-2 h-2 rounded-full bg-arena-accent animate-pulse" />
            Waiting for host to start the game…
          </div>
        </div>
      )}
    </div>
  );
}
