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
exports.default = EventsListScreen;
/**
 * Events list screen — searchable, filterable
 * Spec: 016-mobile-app (T026)
 */
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("../../../lib/api-client");
var messages_1 = require("../../../lib/messages");
var CATEGORIES = ["All", "Workshop", "Jam", "Festival", "Retreat", "Class"];
function EventsListScreen() {
    var _this = this;
    var _a;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, react_1.useState)(""), search = _b[0], setSearch = _b[1];
    var _c = (0, react_1.useState)("All"), category = _c[0], setCategory = _c[1];
    var _d = (0, react_1.useState)(false), refreshing = _d[0], setRefreshing = _d[1];
    var params = {};
    if (search.trim())
        params.q = search.trim();
    if (category !== "All")
        params.category = category.toLowerCase();
    var _e = (0, react_query_1.useQuery)({
        queryKey: ["events", "list", search, category],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_client_1.get)("/api/events", params)];
                    case 1:
                        response = _a.sent();
                        if (response.error)
                            throw new Error(response.error);
                        return [2 /*return*/, response.data];
                }
            });
        }); },
    }), data = _e.data, isLoading = _e.isLoading, error = _e.error, refetch = _e.refetch;
    var onRefresh = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setRefreshing(true);
                    return [4 /*yield*/, refetch()];
                case 1:
                    _a.sent();
                    setRefreshing(false);
                    return [2 /*return*/];
            }
        });
    }); }, [refetch]);
    var renderEvent = (0, react_1.useCallback)(function (_a) {
        var item = _a.item;
        return (<react_native_1.TouchableOpacity style={styles.eventRow} onPress={function () { return router.push("/(tabs)/events/".concat(item.id)); }} accessibilityRole="button" accessibilityLabel={item.title}>
        <react_native_1.View style={styles.eventInfo}>
          <react_native_1.Text style={styles.eventTitle} numberOfLines={1}>{item.title}</react_native_1.Text>
          <react_native_1.Text style={styles.eventMeta}>
            {new Date(item.startsAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            })}{" "}
            · {item.location}
          </react_native_1.Text>
        </react_native_1.View>
        {item.spotsLeft !== null && item.spotsLeft <= 3 && (<react_native_1.Text style={styles.badge}>
            {item.spotsLeft === 0 ? "Full" : "".concat(item.spotsLeft, " left")}
          </react_native_1.Text>)}
      </react_native_1.TouchableOpacity>);
    }, [router]);
    return (<react_native_1.View style={styles.container}>
      <react_native_1.TextInput style={styles.searchInput} placeholder={messages_1.EVENTS_LIST_MESSAGES.search} value={search} onChangeText={setSearch} accessibilityLabel={messages_1.EVENTS_LIST_MESSAGES.search}/>

      <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContainer}>
        {CATEGORIES.map(function (cat) { return (<react_native_1.TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={function () { return setCategory(cat); }} accessibilityRole="button" accessibilityState={{ selected: category === cat }}>
            <react_native_1.Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
              {cat}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.ScrollView>

      {isLoading ? (<react_native_1.View style={styles.centered}>
          <react_native_1.ActivityIndicator size="large" color="#2563eb"/>
        </react_native_1.View>) : error ? (<react_native_1.TouchableOpacity style={styles.centered} onPress={function () { return refetch(); }}>
          <react_native_1.Text style={styles.errorText}>{messages_1.EVENTS_LIST_MESSAGES.error}</react_native_1.Text>
          <react_native_1.Text style={styles.retryText}>{messages_1.EVENTS_LIST_MESSAGES.retry}</react_native_1.Text>
        </react_native_1.TouchableOpacity>) : (<react_native_1.FlatList data={(_a = data === null || data === void 0 ? void 0 : data.events) !== null && _a !== void 0 ? _a : []} renderItem={renderEvent} keyExtractor={function (item) { return item.id; }} contentContainerStyle={styles.listContent} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>} ListEmptyComponent={<react_native_1.View style={styles.emptyState}>
              <react_native_1.Text style={styles.emptyText}>
                {search || category !== "All" ? messages_1.EVENTS_LIST_MESSAGES.emptyFiltered : messages_1.EVENTS_LIST_MESSAGES.empty}
              </react_native_1.Text>
            </react_native_1.View>} windowSize={5} maxToRenderPerBatch={10}/>)}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    searchInput: {
        margin: 16,
        marginBottom: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#d1d5db",
        padding: 12,
        fontSize: 16,
        minHeight: 44,
    },
    chipRow: { maxHeight: 48 },
    chipContainer: { paddingHorizontal: 16, gap: 8 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#e5e7eb",
        minHeight: 36,
        justifyContent: "center",
    },
    chipActive: { backgroundColor: "#2563eb" },
    chipText: { fontSize: 14, color: "#374151" },
    chipTextActive: { color: "#fff", fontWeight: "600" },
    listContent: { padding: 16, gap: 8 },
    eventRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 16,
        gap: 12,
    },
    eventInfo: { flex: 1, gap: 4 },
    eventTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
    eventMeta: { fontSize: 13, color: "#6b7280" },
    badge: {
        fontSize: 12,
        fontWeight: "600",
        color: "#dc2626",
        backgroundColor: "#fef2f2",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    emptyState: { alignItems: "center", padding: 48 },
    emptyText: { fontSize: 16, color: "#6b7280" },
    errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
    retryText: { fontSize: 14, color: "#2563eb" },
});
