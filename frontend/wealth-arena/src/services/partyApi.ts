/**
 * Party WebSocket service — real-time room sync.
 */

import { getToken } from '@/services/auth';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL?.replace(/\/+$/, '') ?? `ws://${window.location.hostname}:8000`;
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? `http://${window.location.hostname}:8000`;

// ── REST helpers (need auth token) ──

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createRoom(roomName: string, archetype: string, timing: string) {
  const res = await fetch(`${API_BASE}/party/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room_name: roomName, archetype, timing }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Failed to create room' }));
    throw new Error(body.detail || 'Failed to create room');
  }
  return res.json();
}

export async function joinRoom(roomCode: string) {
  const res = await fetch(`${API_BASE}/party/join/${encodeURIComponent(roomCode)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Failed to join room' }));
    throw new Error(body.detail || 'Failed to join room');
  }
  return res.json();
}

export async function getRoom(roomCode: string) {
  const res = await fetch(`${API_BASE}/party/${encodeURIComponent(roomCode)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Room not found');
  return res.json();
}

export async function startRoom(roomCode: string) {
  const res = await fetch(`${API_BASE}/party/${encodeURIComponent(roomCode)}/start`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to start game');
  return res.json();
}

export async function getRankings(roomCode: string) {
  const res = await fetch(`${API_BASE}/party/${encodeURIComponent(roomCode)}/rankings`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}


// ── WebSocket connection ──

export type WSMessage =
  | { type: 'room_update'; room: RoomData }
  | { type: 'player_joined'; player: { id: string; name: string } }
  | { type: 'player_left'; userId: string; name: string }
  | { type: 'game_started' }
  | { type: 'rankings'; rankings: RankingEntry[] }
  | { type: 'player_round_complete'; userId: string; name: string; round: number }
  | { type: 'player_game_complete'; userId: string; name: string }
  | { type: 'error'; message: string };

export interface RoomData {
  room_code: string;
  room_name: string;
  archetype: string;
  timing: string;
  host_id: string;
  started: boolean;
  current_round: number;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    portfolioValue: number;
    totalReturnPct: number;
    currentRound: number;
  }[];
}

export interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
}

export class PartySocket {
  private ws: WebSocket | null = null;
  private listeners: ((msg: WSMessage) => void)[] = [];
  private roomCode: string;

  constructor(roomCode: string) {
    this.roomCode = roomCode.toUpperCase();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = getToken();
      if (!token) {
        reject(new Error('Not authenticated'));
        return;
      }

      this.ws = new WebSocket(`${WS_BASE}/party/ws/${this.roomCode}`);

      this.ws.onopen = () => {
        // First message must be auth
        this.ws!.send(JSON.stringify({ type: 'auth', token }));
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          for (const listener of this.listeners) {
            listener(msg);
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      this.ws.onerror = () => reject(new Error('WebSocket error'));
      this.ws.onclose = () => {
        // Notify listeners of disconnect
      };
    });
  }

  onMessage(listener: (msg: WSMessage) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  sendRoundComplete(round: number, portfolioValue: number, returnPct: number, action: string, allocation?: Record<string, number>) {
    this.send({
      type: 'round_complete',
      round,
      portfolioValue,
      returnPct,
      action,
      allocation,
    });
  }

  sendGameComplete(portfolioValue: number, returnPct: number, round: number) {
    this.send({
      type: 'game_complete',
      portfolioValue,
      returnPct,
      round,
    });
  }

  sendStartGame() {
    this.send({ type: 'start_game' });
  }

  requestRankings() {
    this.send({ type: 'request_rankings' });
  }

  private send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners = [];
  }
}
