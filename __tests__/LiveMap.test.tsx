import { render, screen } from "@testing-library/react";
import LiveMap from "@/components/map/LiveMap";

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: ({ positions }: { positions: unknown[] }) => <div data-testid="route-line">{positions.length}</div>,
  Marker: ({ children, position }: { children: React.ReactNode; position: unknown }) => (
    <div data-testid="participant-marker" data-position={JSON.stringify(position)}>{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: jest.fn() }),
}));

jest.mock("leaflet", () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(() => ({})),
}));

describe("LiveMap", () => {
  it("renders moving participant markers from dashboard store status", () => {
    render(
      <LiveMap
        routeGeojson={{ type: "LineString", coordinates: [[106.1, -6.1], [106.2, -6.2]] }}
        livePositions={{
          7: {
            userId: 7,
            lat: -6.1,
            lng: 106.1,
            speed: 2,
            status: "active",
            name: "Runner 7",
          },
        }}
      />,
    );

    expect(screen.getByTestId("route-line")).toHaveTextContent("2");
    expect(screen.getByTestId("participant-marker")).toBeInTheDocument();
    expect(screen.getByText("Runner 7")).toBeInTheDocument();
  });

  it("keeps alert markers visible", () => {
    render(
      <LiveMap
        livePositions={{
          sos: {
            id: "sos",
            lat: -6.1,
            lng: 106.1,
            speed: 0,
            status: "emergency",
            name: "SOS Runner",
          },
          off: {
            id: "off",
            lat: -6.2,
            lng: 106.2,
            speed: 1,
            status: "off-route",
            name: "Off Route Runner",
          },
        }}
      />,
    );

    expect(screen.getAllByTestId("participant-marker")).toHaveLength(2);
    expect(screen.getByText("SOS Runner")).toBeInTheDocument();
    expect(screen.getByText("Off Route Runner")).toBeInTheDocument();
  });
});
