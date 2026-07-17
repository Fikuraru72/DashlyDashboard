import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import LeaderboardPage from "../src/app/dashboard/events/[eventId]/leaderboard/page";
import { useSocketStore } from "@/store/useSocketStore";
import { useParams, useRouter } from "next/navigation";

// Mock Next.js hooks
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock Zustand store
vi.mock("@/store/useSocketStore", () => ({
  useSocketStore: vi.fn(),
}));

describe("LeaderboardPage", () => {
  const mockConnect = vi.fn();
  const mockJoinEvent = vi.fn();
  const mockLeaveEvent = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useParams as Mock).mockReturnValue({ eventId: "1" });
    (useRouter as Mock).mockReturnValue({ back: mockBack });

    (useSocketStore as unknown as Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          connect: mockConnect,
          joinEvent: mockJoinEvent,
          leaveEvent: mockLeaveEvent,
          leaderboard: [],
          isConnected: false,
        };
        return selector(state);
      },
    );
  });

  it("renders header correctly and shows connecting status", () => {
    render(<LeaderboardPage />);
    expect(screen.getByText("Live Leaderboard")).toBeInTheDocument();
    expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
  });

  it("renders connected status when isConnected is true", () => {
    (useSocketStore as unknown as Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          connect: mockConnect,
          joinEvent: mockJoinEvent,
          leaveEvent: mockLeaveEvent,
          leaderboard: [],
          isConnected: true,
        };
        return selector(state);
      },
    );

    render(<LeaderboardPage />);
    expect(screen.getByText(/Live Updates/i)).toBeInTheDocument();
  });

  it("renders empty state when leaderboard is empty", () => {
    render(<LeaderboardPage />);
    expect(screen.getByText(/No leaderboard data available yet/i)).toBeInTheDocument();
  });

  it("renders leaderboard data correctly", () => {
    (useSocketStore as unknown as Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          connect: mockConnect,
          joinEvent: mockJoinEvent,
          leaveEvent: mockLeaveEvent,
          isConnected: true,
          leaderboard: [
            {
              userId: 1,
              name: "John Doe",
              rank: 1,
              progressPercentage: 50.5,
              distanceCovered: 5050,
              speedCalculated: 2.5, // 9 km/h
              estimatedFinishTime: new Date("2026-01-01T10:00:00Z").toISOString(),
            },
          ],
        };
        return selector(state);
      },
    );

    render(<LeaderboardPage />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("50.5%")).toBeInTheDocument();
    expect(screen.getByText("5.05 km")).toBeInTheDocument();
    expect(screen.getByText("9.0 km/h")).toBeInTheDocument();
  });

  it("calls connect and joinEvent on mount", () => {
    render(<LeaderboardPage />);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockJoinEvent).toHaveBeenCalledWith("1");
  });
});
