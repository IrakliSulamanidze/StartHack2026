import { Link } from 'react-router-dom';

export default function ClassroomPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white">🏫 Classroom Mode</h1>
        <p className="text-arena-text-dim mt-2">
          Compete live in a shared room. Perfect for classes, workshops, and group challenges.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Host */}
        <Link
          to="/classroom/host"
          className="bg-arena-surface border border-arena-border rounded-xl p-8 hover:border-arena-accent/40 transition-all group"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-arena-accent/20 to-arena-accent/5 flex items-center justify-center text-3xl mb-4">
            🎤
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Host a Room</h2>
          <p className="text-sm text-arena-text-dim mb-4 leading-relaxed">
            Create a classroom room, set the archetype and timing, then share the room code with your students.
          </p>
          <span className="text-sm font-semibold text-arena-accent group-hover:underline">Create Room →</span>
        </Link>

        {/* Join */}
        <Link
          to="/classroom/join"
          className="bg-arena-surface border border-arena-border rounded-xl p-8 hover:border-purple-400/40 transition-all group"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400/20 to-purple-400/5 flex items-center justify-center text-3xl mb-4">
            🎮
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Join a Room</h2>
          <p className="text-sm text-arena-text-dim mb-4 leading-relaxed">
            Enter the room code given by your host. You'll compete against other players in real-time.
          </p>
          <span className="text-sm font-semibold text-purple-400 group-hover:underline">Join Room →</span>
        </Link>
      </div>

      {/* Info */}
      <div className="mt-10 bg-arena-surface border border-arena-border rounded-xl p-6">
        <h3 className="font-bold text-white mb-3">How Classroom Mode Works</h3>
        <div className="grid sm:grid-cols-4 gap-4 text-sm text-arena-text-dim">
          <div>
            <span className="text-arena-accent font-bold">1.</span> Host creates a room and chooses the archetype and timing preset.
          </div>
          <div>
            <span className="text-arena-accent font-bold">2.</span> Students join using a 6-character room code.
          </div>
          <div>
            <span className="text-arena-accent font-bold">3.</span> Everyone plays the same 10-round scenario simultaneously with a timer.
          </div>
          <div>
            <span className="text-arena-accent font-bold">4.</span> Live rankings update after each round. Final results show top performers.
          </div>
        </div>
      </div>
    </div>
  );
}
