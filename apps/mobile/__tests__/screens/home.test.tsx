/**
 * Home screen tests — event list, loading state, empty state
 * Spec: 016-mobile-app (T022)
 *
 * Constitution II: Test-first development
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the api-client
const mockGet = jest.fn();
jest.mock("../../lib/api-client", () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import HomeScreen from "../../app/(tabs)/index";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const MOCK_EVENTS = {
  events: [
    {
      id: "evt-1",
      title: "Morning AcroYoga Flow",
      startsAt: "2026-04-10T09:00:00Z",
      location: "Central Park",
      category: "Workshop",
      spotsLeft: 3,
      imageUrl: null,
    },
    {
      id: "evt-2",
      title: "Partner Acrobatics Intro",
      startsAt: "2026-04-12T14:00:00Z",
      location: "Brooklyn Studio",
      category: "Class",
      spotsLeft: null,
      imageUrl: null,
    },
  ],
};

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading indicator while fetching events", () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { toJSON } = renderWithClient(<HomeScreen />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("ActivityIndicator");
  });

  it("renders event list when data is available", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENTS, error: null });

    renderWithClient(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("Morning AcroYoga Flow")).toBeTruthy();
    });

    expect(screen.getByText("Partner Acrobatics Intro")).toBeTruthy();
    expect(screen.getByText("Central Park")).toBeTruthy();
  });

  it("shows empty state when no events", async () => {
    mockGet.mockResolvedValue({ data: { events: [] }, error: null });

    renderWithClient(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("No upcoming events")).toBeTruthy();
    });

    expect(
      screen.getByText("Check back later for new events in your area."),
    ).toBeTruthy();
  });

  it("shows error state on fetch failure", async () => {
    mockGet.mockResolvedValue({ data: null, error: "Network error" });

    renderWithClient(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load events")).toBeTruthy();
    });

    expect(screen.getByText("Tap to retry")).toBeTruthy();
  });

  it("navigates to event detail on tap", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENTS, error: null });

    renderWithClient(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("Morning AcroYoga Flow")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Morning AcroYoga Flow"));
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/events/evt-1");
  });

  it("shows spots-left badge for events with few spots", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENTS, error: null });

    renderWithClient(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("3 spots left")).toBeTruthy();
    });
  });
});
