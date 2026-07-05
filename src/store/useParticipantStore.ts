import { create } from "zustand";

export interface ParticipantData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  status: "stuck" | "off-route" | "active" | "inactive" | "emergency";
  isAnomaly?: boolean;
  pathHistory: [number, number][];
}

export interface Anomaly {
  id: string;
  participantId?: string;
  userId?: string;
  type: string;
  message: string;
  timestamp: string;
  severity?: string;
}

export interface EventMetadata {
  id: string;
  name: string;
  dateEvent?: string;
  routeGeoJSON: any; // Type strictly when geojson structure is defined
}

interface ParticipantStore {
  participants: Record<string, ParticipantData>;
  anomalies: Anomaly[];
  eventMetadata: EventMetadata | null;
  selectedParticipantId: string | null;
  socketConnected: boolean;

  setSocketConnected: (status: boolean) => void;
  updateParticipant: (id: string, data: Partial<ParticipantData>) => void;
  addAnomaly: (anomaly: Anomaly) => void;
  addSyncBatch: (userId: string | number, points: any[]) => void;
  setEventMetadata: (metadata: EventMetadata) => void;
  setParticipants: (participants: Record<string, ParticipantData>) => void; // helper for mock data
  setSelectedParticipantId: (id: string | null) => void;
  removeAnomaly: (id: string) => void;
}

export const useParticipantStore = create<ParticipantStore>((set) => ({
  participants: {},
  anomalies: [],
  eventMetadata: null,
  selectedParticipantId: null,
  socketConnected: false,

  setSocketConnected: (status) => set({ socketConnected: status }),

  updateParticipant: (id, data) =>
    set((state) => {
      const existing = state.participants[id] || {
        id,
        name: `User ${id}`,
        lat: 0,
        lng: 0,
        speed: 0,
        battery: 100,
        status: "inactive",
        pathHistory: []
      };

      const newLat = data.lat ?? existing.lat;
      const newLng = data.lng ?? existing.lng;
      const isNewPosition = data.lat !== undefined && data.lng !== undefined && (newLat !== existing.lat || newLng !== existing.lng);

      let newPathHistory = [...existing.pathHistory];
      if (isNewPosition) {
        newPathHistory.push([newLat, newLng]);
        if (newPathHistory.length > 1000) {
          newPathHistory = newPathHistory.slice(-1000);
        }
      }

      // FIX: Preserve real name from initial fetch; only override if new data
      // provides a meaningful name (not a generic fallback)
      const resolvedName = (data.name && !data.name.startsWith('User ') && !data.name.startsWith('Runner '))
        ? data.name
        : existing.name;

      return {
        participants: {
          ...state.participants,
          [id]: {
            ...existing,
            ...data,
            name: resolvedName,
            pathHistory: newPathHistory
          }
        }
      };
    }),

  addSyncBatch: (userId, points) =>
    set((state) => {
      const pId = String(userId);
      const existing = state.participants[pId];
      if (!existing) return state;

      // Extract coords WITH timestamp for proper chronological ordering
      const newHistory: { coord: [number, number]; ts: number }[] = points.map((p: any) => ({
        coord: [parseFloat(p.lat ?? p.latitude), parseFloat(p.lng ?? p.longitude)] as [number, number],
        ts: p.captured_at ? new Date(p.captured_at).getTime() : 0,
      }));

      // Wrap existing history (no timestamps, but they're already in order)
      // Assign incrementing pseudo-timestamps to preserve their relative order
      // Existing live points came AFTER offline points chronologically
      const baseTs = newHistory.length > 0 ? Math.max(...newHistory.map(h => h.ts)) + 1 : Date.now();
      const existingWithTs = existing.pathHistory.map((coord, i) => ({
        coord,
        ts: baseTs + i,
      }));

      // Merge and sort by timestamp to ensure correct chronological path
      let combined = [...newHistory, ...existingWithTs]
        .sort((a, b) => a.ts - b.ts)
        .map(h => h.coord);
      
      if (combined.length > 1000) {
        combined = combined.slice(-1000);
      }

      return {
        participants: {
          ...state.participants,
          [pId]: {
            ...existing,
            pathHistory: combined
          }
        }
      };
    }),

  addAnomaly: (anomaly) =>
    set((state) => {
      const pId = anomaly.userId || anomaly.participantId;
      const participants = { ...state.participants };
      if (pId && participants[pId]) {
        participants[pId] = {
          ...participants[pId],
          isAnomaly: true,
          status: "emergency"
        };
      }
      
      const newAnomaly = {
        ...anomaly,
        id: anomaly.id || `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };

      return {
        anomalies: [newAnomaly, ...state.anomalies].slice(0, 50), // keep last 50
        participants
      };
    }),

  removeAnomaly: (id) =>
    set((state) => ({
      anomalies: state.anomalies.filter((a) => a.id !== id)
    })),

  setEventMetadata: (metadata) =>
    set(() => ({
      eventMetadata: metadata
    })),

  setParticipants: (participants) =>
    set(() => ({
      participants
    })),

  setSelectedParticipantId: (id) =>
    set(() => ({
      selectedParticipantId: id
    }))
}));
