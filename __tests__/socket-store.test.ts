import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const socket = {
    auth: {} as Record<string, string | null>,
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    io: { on: vi.fn() },
  };
  socket.disconnect.mockReturnValue(socket);
  return { socket, io: vi.fn(() => socket) };
});

vi.mock("socket.io-client", () => ({ io: mocks.io }));

import { setAccessToken } from "@/lib/api";
import { useSocketStore } from "@/store/useSocketStore";

describe("socket authentication compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.socket.auth = {};
    mocks.socket.connected = false;
    useSocketStore.setState({ socket: null, isConnected: false, activeEventId: null });
  });

  it("sends the access token in handshake auth and reconnects after rotation", () => {
    setAccessToken({ accessToken: "access-1" });

    useSocketStore.getState().connect();

    expect(mocks.io).toHaveBeenCalledWith(
      "http://localhost:3001",
      expect.objectContaining({ auth: { token: "access-1" } }),
    );

    setAccessToken({ accessToken: "access-2" });

    expect(mocks.socket.auth).toEqual({ token: "access-2" });
    expect(mocks.socket.disconnect).toHaveBeenCalled();
    expect(mocks.socket.connect).toHaveBeenCalled();
    useSocketStore.getState().disconnect();
  });

  it("joins the backend room using the numeric event contract", () => {
    useSocketStore.setState({ socket: mocks.socket as never });
    mocks.socket.connected = true;

    useSocketStore.getState().joinEvent("42");

    expect(mocks.socket.emit).toHaveBeenCalledWith("joinEventRoom", { eventId: 42 });
  });
});
