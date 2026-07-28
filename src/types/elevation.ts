/** Point in altitude profile received from backend */
export interface AltitudePoint {
  distance: number;     // meters from start
  elevation: number;    // meters above sea level
  lat: number;
  lng: number;
  cumGain: number;
  cumLoss: number;
}

/** Point optimized for chart rendering (downsampled) */
export interface ChartDataPoint {
  distance: number;     // X-axis (meters)
  elevation: number;    // Y-axis (meters)
  grade: number;        // Slope percentage (for gradient coloring)
  lat: number;          // For map sync on click
  lng: number;          // For map sync on click
}

/** Animated participant pointer position on chart */
export interface ParticipantPointerState {
  participantId: string;
  userId: string;
  bibNumber?: string;
  name?: string;
  color?: string;
  
  // Real-time backend targets
  targetDistance: number;
  targetElevation: number;
  
  // Smoothly lerped display positions
  displayDistance: number;
  displayElevation: number;
  
  // Stats
  speed: number;
  progressPercent: number;
  rank: number;
  isOffline: boolean;
}

/** Chart interaction state */
export interface ChartInteractionState {
  hoveredDistance: number | null;
  hoveredPoint: { lat: number; lng: number; elevation: number } | null;
  clickedDistance: number | null;
  selectedParticipantId: string | null;
}
