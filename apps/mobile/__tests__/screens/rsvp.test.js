"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * RSVP flow tests — role selection, submission, error handling
 * Spec: 016-mobile-app (T023)
 *
 * Constitution II: Test-first development
 */
var react_1 = require("react");
var react_native_1 = require("@testing-library/react-native");
var react_query_1 = require("@tanstack/react-query");
var react_native_2 = require("react-native");
// Mock the api-client
var mockGet = jest.fn();
var mockPost = jest.fn();
jest.mock("../../lib/api-client", function () { return ({
    get: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return mockGet.apply(void 0, args);
    },
    post: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return mockPost.apply(void 0, args);
    },
}); });
// Mock expo-router
var mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock("expo-router", function () { return ({
    useLocalSearchParams: function () { return ({ id: "evt-1" }); },
    useRouter: function () { return mockRouter; },
}); });
// Spy on Alert
jest.spyOn(react_native_2.Alert, "alert");
// Dynamic import — Expo Router [id] segments trip up TypeScript static module resolution
// eslint-disable-next-line @typescript-eslint/no-require-imports
var EventDetailScreen = require("../../app/(tabs)/events/[id]").default;
function renderWithClient(ui) {
    var queryClient = new react_query_1.QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return (0, react_native_1.render)(<react_query_1.QueryClientProvider client={queryClient}>{ui}</react_query_1.QueryClientProvider>);
}
var MOCK_EVENT = {
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
var MOCK_EVENT_FULL = __assign(__assign({}, MOCK_EVENT), { attendeeCount: 20, spotsLeft: 0 });
describe("RSVP Flow", function () {
    beforeEach(function () {
        jest.clearAllMocks();
    });
    it("shows RSVP button for non-RSVP'd events with spots", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("RSVP")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("shows Join Waitlist button for full events", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT_FULL, error: null });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("Join Waitlist")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("opens role selection sheet when RSVP is pressed", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("RSVP")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("RSVP"));
                    expect(react_native_1.screen.getByText("Select your role")).toBeTruthy();
                    expect(react_native_1.screen.getByText("Base")).toBeTruthy();
                    expect(react_native_1.screen.getByText("Flyer")).toBeTruthy();
                    expect(react_native_1.screen.getByText("Hybrid")).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
    it("allows selecting a role and confirming", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
                    mockPost.mockResolvedValue({
                        data: { id: "rsvp-1", status: "confirmed" },
                        error: null,
                    });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("RSVP")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    // Open role sheet
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("RSVP"));
                    // Select Base role
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("Base"));
                    // Confirm
                    return [4 /*yield*/, (0, react_native_1.act)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                react_native_1.fireEvent.press(react_native_1.screen.getByText("Confirm"));
                                return [2 /*return*/];
                            });
                        }); })];
                case 2:
                    // Confirm
                    _a.sent();
                    expect(mockPost).toHaveBeenCalledWith("/api/rsvps", {
                        eventId: "evt-1",
                        role: "base",
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it("shows success alert on confirmed RSVP", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
                    mockPost.mockResolvedValue({
                        data: { id: "rsvp-1", status: "confirmed" },
                        error: null,
                    });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("RSVP")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("RSVP"));
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("Flyer"));
                    return [4 /*yield*/, (0, react_native_1.act)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                react_native_1.fireEvent.press(react_native_1.screen.getByText("Confirm"));
                                return [2 /*return*/];
                            });
                        }); })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_2.Alert.alert).toHaveBeenCalledWith("You're in!");
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("shows waitlisted message when added to waitlist", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT_FULL, error: null });
                    mockPost.mockResolvedValue({
                        data: { id: "rsvp-1", status: "waitlisted" },
                        error: null,
                    });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("Join Waitlist")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("Join Waitlist"));
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("Hybrid"));
                    return [4 /*yield*/, (0, react_native_1.act)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                react_native_1.fireEvent.press(react_native_1.screen.getByText("Confirm"));
                                return [2 /*return*/];
                            });
                        }); })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_2.Alert.alert).toHaveBeenCalledWith("Added to waitlist");
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("shows error alert on RSVP failure", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
                    mockPost.mockResolvedValue({ data: null, error: "Server error" });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("RSVP")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("RSVP"));
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("Base"));
                    return [4 /*yield*/, (0, react_native_1.act)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                react_native_1.fireEvent.press(react_native_1.screen.getByText("Confirm"));
                                return [2 /*return*/];
                            });
                        }); })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_2.Alert.alert).toHaveBeenCalledWith("RSVP failed");
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("closes role sheet on cancel", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENT, error: null });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("RSVP")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("RSVP"));
                    expect(react_native_1.screen.getByText("Select your role")).toBeTruthy();
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("Cancel"));
                    expect(react_native_1.screen.queryByText("Select your role")).toBeNull();
                    return [2 /*return*/];
            }
        });
    }); });
    it("does not show RSVP button for already RSVP'd event", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({
                        data: __assign(__assign({}, MOCK_EVENT), { isRsvped: true }),
                        error: null,
                    });
                    renderWithClient(<EventDetailScreen />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("Morning AcroYoga Flow")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    expect(react_native_1.screen.queryByText("RSVP")).toBeNull();
                    return [2 /*return*/];
            }
        });
    }); });
});
