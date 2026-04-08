"use strict";
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
 * Home screen tests — event list, loading state, empty state
 * Spec: 016-mobile-app (T022)
 *
 * Constitution II: Test-first development
 */
var react_1 = require("react");
var react_native_1 = require("@testing-library/react-native");
var react_query_1 = require("@tanstack/react-query");
// Mock the api-client
var mockGet = jest.fn();
jest.mock("../../lib/api-client", function () { return ({
    get: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return mockGet.apply(void 0, args);
    },
}); });
// Mock expo-router
var mockPush = jest.fn();
jest.mock("expo-router", function () { return ({
    useRouter: function () { return ({ push: mockPush }); },
}); });
var index_1 = require("../../app/(tabs)/index");
function renderWithClient(ui) {
    var queryClient = new react_query_1.QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return (0, react_native_1.render)(<react_query_1.QueryClientProvider client={queryClient}>{ui}</react_query_1.QueryClientProvider>);
}
var MOCK_EVENTS = {
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
describe("HomeScreen", function () {
    beforeEach(function () {
        jest.clearAllMocks();
    });
    it("shows loading indicator while fetching events", function () {
        mockGet.mockReturnValue(new Promise(function () { })); // never resolves
        var toJSON = renderWithClient(<index_1.default />).toJSON;
        var tree = JSON.stringify(toJSON());
        expect(tree).toContain("ActivityIndicator");
    });
    it("renders event list when data is available", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENTS, error: null });
                    renderWithClient(<index_1.default />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("Morning AcroYoga Flow")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    expect(react_native_1.screen.getByText("Partner Acrobatics Intro")).toBeTruthy();
                    expect(react_native_1.screen.getByText("Central Park")).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
    it("shows empty state when no events", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: { events: [] }, error: null });
                    renderWithClient(<index_1.default />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("No upcoming events")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    expect(react_native_1.screen.getByText("Check back later for new events in your area.")).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
    it("shows error state on fetch failure", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: null, error: "Network error" });
                    renderWithClient(<index_1.default />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("Failed to load events")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    expect(react_native_1.screen.getByText("Tap to retry")).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
    it("navigates to event detail on tap", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENTS, error: null });
                    renderWithClient(<index_1.default />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("Morning AcroYoga Flow")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    react_native_1.fireEvent.press(react_native_1.screen.getByText("Morning AcroYoga Flow"));
                    expect(mockPush).toHaveBeenCalledWith("/(tabs)/events/evt-1");
                    return [2 /*return*/];
            }
        });
    }); });
    it("shows spots-left badge for events with few spots", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mockGet.mockResolvedValue({ data: MOCK_EVENTS, error: null });
                    renderWithClient(<index_1.default />);
                    return [4 /*yield*/, (0, react_native_1.waitFor)(function () {
                            expect(react_native_1.screen.getByText("3 spots left")).toBeTruthy();
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
