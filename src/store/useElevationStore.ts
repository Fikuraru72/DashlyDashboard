import { create } from 'zustand';
import { AltitudePoint, ChartDataPoint } from '@/types/elevation';
import { downsampleProfile } from '@/lib/elevation/downsampler';
import { interpolateAtDistance } from '@/lib/elevation/interpolation';

interface ElevationState {
  // Static route profile data
  altitudeProfile: AltitudePoint[] | null;
  chartData: ChartDataPoint[];
  totalDistance: number;
  totalElevationGain: number;
  maxElevation: number;
  minElevation: number;
  isReady: boolean;

  // Interactions
  hoveredDistance: number | null;
  hoveredPoint: { lat: number; lng: number; elevation: number; grade: number } | null;
  clickedDistance: number | null;
  selectedParticipantId: string | null;

  // Actions
  initializeRoute: (profile: AltitudePoint[]) => void;
  setHoveredDistance: (distance: number | null) => void;
  setClickedDistance: (distance: number | null) => void;
  setSelectedParticipantId: (id: string | null) => void;
  reset: () => void;
}

export const useElevationStore = create<ElevationState>((set, get) => ({
  altitudeProfile: null,
  chartData: [],
  totalDistance: 0,
  totalElevationGain: 0,
  maxElevation: 0,
  minElevation: 0,
  isReady: false,

  hoveredDistance: null,
  hoveredPoint: null,
  clickedDistance: null,
  selectedParticipantId: null,

  initializeRoute: (profile: AltitudePoint[]) => {
    if (!profile || profile.length === 0) {
      set({
        altitudeProfile: null,
        chartData: [],
        totalDistance: 0,
        totalElevationGain: 0,
        maxElevation: 0,
        minElevation: 0,
        isReady: false,
      });
      return;
    }

    const downsampled = downsampleProfile(profile, 2000);
    const totalDist = profile[profile.length - 1].distance;
    const totalGain = profile[profile.length - 1].cumGain || 0;

    let min = Infinity;
    let max = -Infinity;
    for (const p of profile) {
      if (p.elevation < min) min = p.elevation;
      if (p.elevation > max) max = p.elevation;
    }

    set({
      altitudeProfile: profile,
      chartData: downsampled,
      totalDistance: totalDist,
      totalElevationGain: totalGain,
      minElevation: min === Infinity ? 0 : min,
      maxElevation: max === -Infinity ? 0 : max,
      isReady: true,
    });
  },

  setHoveredDistance: (distance: number | null) => {
    if (distance === null) {
      set({ hoveredDistance: null, hoveredPoint: null });
      return;
    }

    const profile = get().altitudeProfile;
    const point = profile ? interpolateAtDistance(profile, distance) : null;
    set({ hoveredDistance: distance, hoveredPoint: point });
  },

  setClickedDistance: (distance: number | null) => {
    set({ clickedDistance: distance });
  },

  setSelectedParticipantId: (id: string | null) => {
    set({ selectedParticipantId: id });
  },

  reset: () => {
    set({
      altitudeProfile: null,
      chartData: [],
      totalDistance: 0,
      totalElevationGain: 0,
      maxElevation: 0,
      minElevation: 0,
      isReady: false,
      hoveredDistance: null,
      hoveredPoint: null,
      clickedDistance: null,
      selectedParticipantId: null,
    });
  },
}));
