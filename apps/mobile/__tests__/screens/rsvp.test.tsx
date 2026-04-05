/**
 * RSVP flow tests — role selection, submission, error handling
 * Spec: 016-mobile-app (T023)
 *
 * Constitution II: Test-first development
 */
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert } from "react-native";

// Mock the api-client
const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock("../../../lib/api-client", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
}));

// Mock expo-router
const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "evt-1" }),
  useRouter: () => mockRouter,
}));

// Spy on Alert
jest.spyOn(Alert, "alert");

import EventDetailScreen from "../../../app/(tabs)/events/[id]";

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

const MOCK_EVENT = {
  id: "evt-1",
  title: "Morning AcroYoga Flow",
  description: "An energizing morning session for all levels.",
  startsAt: "2026-04-10T09:00:00Z",
  endsAt: "2026-04-10T11:00:00Z",
  location: "Central Park",
  category: "Workshop",
  capacity: 20,
  attendeeCount: 17,
  spotsLeft: 3,
  isRsvped: false,
  organizer: { id: "usr-1", displayName: "Jane Doe" },
};

const MOCK_EVENT_FULL = {
  ...MOCK_EVENT,
  attendeeCount: 20,
  spotsLeft: 0,
};

describe("RSVP Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows RSVP button for non-RSVP'd events with spots", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("RSVP")).toBeTruthy();
    });
  });

  it("shows Join Waitlist button for full events", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT_FULL, error: null });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Join Waitlist")).toBeTruthy();
    });
  });

  it("opens role selection sheet when RSVP is pressed", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("RSVP")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("RSVP"));

    expect(screen.getByText("Select your role")).toBeTruthy();
    expect(screen.getByText("Base")).toBeTruthy();
    expect(screen.getByText("Flyer")).toBeTruthy();
    expect(screen.getByText("Hybrid")).toBeTruthy();
  });

  it("allows selecting a role and confirming", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
    mockPost.mockResolvedValue({
      data: { id: "rsvp-1", status: "confirmed" },
      error: null,
    });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("RSVP")).toBeTruthy();
    });

    // Open role sheet
    fireEvent.press(screen.getByText("RSVP"));

    // Select Base role
    fireEvent.press(screen.getByText("Base"));

    // Confirm
    await act(async () => {
      fireEvent.press(screen.getByText("Confirm"));
    });

    expect(mockPost).toHaveBeenCalledWith("/api/rsvps", {
      eventId: "evt-1",
      role: "base",
    });
  });

  it("shows success alert on confirmed RSVP", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
    mockPost.mockResolvedValue({
      data: { id: "rsvp-1", status: "confirmed" },
      error: null,
    });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("RSVP")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("RSVP"));
    fireEvent.press(screen.getByText("Flyer"));

    await act(async () => {
      fireEvent.press(screen.getByText("Confirm"));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("You're in!");
    });
  });

  it("shows waitlisted message when added to waitlist", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT_FULL, error: null });
    mockPost.mockResolvedValue({
      data: { id: "rsvp-1", status: "waitlisted" },
      error: null,
    });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Join Waitlist")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Join Waitlist"));
    fireEvent.press(screen.getByText("Hybrid"));

    await act(async () => {
      fireEvent.press(screen.getByText("Confirm"));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Added to waitlist");
    });
  });

  it("shows error alert on RSVP failure", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
    mockPost.mockResolvedValue({ data: null, error: "Server error" });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("RSVP")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("RSVP"));
    fireEvent.press(screen.getByText("Base"));

    await act(async () => {
      fireEvent.press(screen.getByText("Confirm"));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("RSVP failed");
    });
  });

  it("closes role sheet on cancel", async () => {
    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("RSVP")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("RSVP"));
    expect(screen.getByText("Select your role")).toBeTruthy();

    fireEvent.press(screen.getByText("Cancel"));
    expect(screen.queryByText("Select your role")).toBeNull();
  });

  it("does not show RSVP button for already RSVP'd event", async () => {
    mockGet.mockResolvedValue({
      data: { ...MOCK_EVENT, isRsvped: true },
      error: null,
    });

    renderWithClient(<EventDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Morning AcroYoga Flow")).toBeTruthy();
    });

    expect(screen.queryByText("RSVP")).toBeNull();
  });
});
