import { render, screen } from '@testing-library/react';
import LeaderboardPage from '../src/app/dashboard/events/[eventId]/leaderboard/page';
import { useSocketStore } from '@/store/useSocketStore';
import { useParams, useRouter } from 'next/navigation';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock Zustand store
jest.mock('@/store/useSocketStore', () => ({
  useSocketStore: jest.fn(),
}));

describe('LeaderboardPage', () => {
  const mockConnect = jest.fn();
  const mockJoinEvent = jest.fn();
  const mockLeaveEvent = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useParams as jest.Mock).mockReturnValue({ eventId: '1' });
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack });

    (useSocketStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        connect: mockConnect,
        joinEvent: mockJoinEvent,
        leaveEvent: mockLeaveEvent,
        leaderboard: [],
        isConnected: false,
      };
      return selector(state);
    });
  });

  it('renders header correctly and shows connecting status', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText('Live Leaderboard')).toBeInTheDocument();
    expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
  });

  it('renders connected status when isConnected is true', () => {
    (useSocketStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        connect: mockConnect,
        joinEvent: mockJoinEvent,
        leaveEvent: mockLeaveEvent,
        leaderboard: [],
        isConnected: true,
      };
      return selector(state);
    });

    render(<LeaderboardPage />);
    expect(screen.getByText(/Live Updates/i)).toBeInTheDocument();
  });

  it('renders empty state when leaderboard is empty', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText(/No leaderboard data available yet/i)).toBeInTheDocument();
  });

  it('renders leaderboard data correctly', () => {
    (useSocketStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        connect: mockConnect,
        joinEvent: mockJoinEvent,
        leaveEvent: mockLeaveEvent,
        isConnected: true,
        leaderboard: [
          {
            userId: 1,
            name: 'John Doe',
            rank: 1,
            progressPercentage: 50.5,
            distanceCovered: 5050,
            speedCalculated: 2.5, // 9 km/h
            estimatedFinishTime: new Date('2026-01-01T10:00:00Z').toISOString(),
          },
        ],
      };
      return selector(state);
    });

    render(<LeaderboardPage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('50.5%')).toBeInTheDocument();
    expect(screen.getByText('5.05 km')).toBeInTheDocument();
    expect(screen.getByText('9.0 km/h')).toBeInTheDocument();
  });

  it('calls connect and joinEvent on mount', () => {
    render(<LeaderboardPage />);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockJoinEvent).toHaveBeenCalledWith('1');
  });
});
