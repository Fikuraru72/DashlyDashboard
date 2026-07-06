import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Position {
  userId: number;
  lat: number;
  lng: number;
  speed: number;
  state: string;
  name?: string;
  bibNumber?: string;
  isOffline?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: number;
  score: number;
  progressPercentage: number;
  distanceCovered: number;
  speedCalculated: number;
  estimatedFinishTime?: string;
  name?: string;
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  activeEventId: string | null;
  livePositions: Record<number, Position>;
  leaderboard: LeaderboardEntry[];
  sosAlerts: any[];
  offRouteAlerts: any[];
  connect: (token?: string) => void;
  disconnect: () => void;
  joinEvent: (eventId: string) => void;
  leaveEvent: (eventId: string) => void;
  setInitialPositions: (positions: Position[]) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  activeEventId: null,
  livePositions: {},
  leaderboard: [],
  sosAlerts: [],
  offRouteAlerts: [],

  connect: (token?: string) => {
    const currentSocket = get().socket;
    if (currentSocket) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Attempt to extract token from cookies if not provided
    if (!token && typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
      if (match) token = match[2];
    }

    const socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      const { activeEventId } = get();
      if (activeEventId) {
        socket.emit('joinEventRoom', { eventId: parseInt(activeEventId) });
      }
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // Handle incoming position batch
    socket.on('position_batch', (data: { eventId: number; positions: Position[] }) => {
      if (data.eventId.toString() !== get().activeEventId) return;

      set((state) => {
        const newPositions = { ...state.livePositions };
        data.positions.forEach(p => {
          // Merge with existing to preserve name/bib if not sent in every tick
          newPositions[p.userId] = {
            ...newPositions[p.userId],
            ...p,
          };
        });
        return { livePositions: newPositions };
      });
    });

    // Handle Leaderboard Updates
    socket.on('ranking_update', (data: { eventId: number; rankings: LeaderboardEntry[] }) => {
      if (data.eventId.toString() !== get().activeEventId) return;
      set({ leaderboard: data.rankings });
    });

    // Handle SOS
    socket.on('sos_triggered', (data: any) => {
      set((state) => {
        const uid = data.userId || data.participantId;
        const newPositions = { ...state.livePositions };
        if (uid && newPositions[uid]) {
          newPositions[uid] = { ...newPositions[uid], state: 'FROZEN' };
        }
        return {
          livePositions: newPositions,
          sosAlerts: [{ ...data, type: 'SOS_EMERGENCY', id: Date.now(), read: false }, ...state.sosAlerts].slice(0, 50)
        };
      });
    });

    socket.on('anomaly_detected', (data: any) => {
      if (data.type === 'SOS_ALERT' || data.type === 'SOS_EMERGENCY') {
        set((state) => {
          const uid = data.userId || data.participantId;
          const newPositions = { ...state.livePositions };
          if (uid && newPositions[uid]) {
            newPositions[uid] = { ...newPositions[uid], state: 'FROZEN' };
          }
          return {
            livePositions: newPositions,
            sosAlerts: [{ ...data, id: Date.now(), read: false }, ...state.sosAlerts].slice(0, 50)
          };
        });
      }
    });

    // Handle Off Route
    socket.on('off_route_alert', (data: any) => {
      set((state) => {
        const uid = data.userId || data.participantId;
        const distance = data.distance ?? data.offRouteDistance ?? 0;
        const newPositions = { ...state.livePositions };
        if (uid && newPositions[uid]) {
          newPositions[uid] = { ...newPositions[uid], state: 'OFF_ROUTE' };
        }
        return {
          livePositions: newPositions,
          offRouteAlerts: [{ ...data, distance, id: Date.now(), read: false }, ...state.offRouteAlerts].slice(0, 50)
        };
      });
    });

    socket.on('sos_recovered', (data: any) => {
      set((state) => {
        const uid = data.userId || data.participantId || data.id;
        const newPositions = { ...state.livePositions };
        if (uid && newPositions[uid]) {
          newPositions[uid] = { ...newPositions[uid], state: 'TRACKING' };
        }
        return { livePositions: newPositions };
      });
    });

    socket.on('user_stopped', (data: any) => {
      set((state) => ({
        offRouteAlerts: [{ ...data, type: 'STOP', id: Date.now(), read: false }, ...state.offRouteAlerts].slice(0, 50)
      }));
    });

    socket.on('participant_finished', (data: any) => {
      set((state) => {
        const uid = data.userId || data.participantId || data.id;
        const newPositions = { ...state.livePositions };
        if (uid && newPositions[uid]) {
          newPositions[uid] = { ...newPositions[uid], state: 'FINISHED' };
        }
        return { livePositions: newPositions };
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, activeEventId: null, livePositions: {}, leaderboard: [] });
    }
  },

  joinEvent: (eventId: string) => {
    const { socket, activeEventId } = get();
    
    if (activeEventId === eventId) return;

    if (socket && socket.connected) {
      if (activeEventId) {
        socket.emit('leaveEventRoom', { eventId: parseInt(activeEventId) });
      }
      socket.emit('joinEventRoom', { eventId: parseInt(eventId) });
    }
    
    set({ activeEventId: eventId, livePositions: {}, leaderboard: [] });
  },

  leaveEvent: (eventId: string) => {
    const { socket, activeEventId } = get();
    if (socket && socket.connected && activeEventId === eventId) {
      socket.emit('leaveEventRoom', { eventId: parseInt(eventId) });
      set({ activeEventId: null, livePositions: {}, leaderboard: [] });
    }
  },

  setInitialPositions: (positions: Position[]) => {
    const positionsMap: Record<number, Position> = {};
    positions.forEach(p => {
      positionsMap[p.userId] = p;
    });
    set({ livePositions: positionsMap });
  }
}));
