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
exports.default = EventDetailScreen;
/**
 * Event detail screen with RSVP action
 * Spec: 016-mobile-app (T027, T028)
 */
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("../../../lib/api-client");
var messages_1 = require("../../../lib/messages");
var ROLES = [
    { key: "base", label: "Base" },
    { key: "flyer", label: "Flyer" },
    { key: "hybrid", label: "Hybrid" },
];
function EventDetailScreen() {
    var _this = this;
    var id = (0, expo_router_1.useLocalSearchParams)().id;
    var router = (0, expo_router_1.useRouter)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)(false), showRoleSheet = _a[0], setShowRoleSheet = _a[1];
    var _b = (0, react_1.useState)(null), selectedRole = _b[0], setSelectedRole = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ["events", id],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_client_1.get)("/api/events/".concat(id))];
                    case 1:
                        response = _a.sent();
                        if (response.error)
                            throw new Error(response.error);
                        return [2 /*return*/, response.data];
                }
            });
        }); },
        enabled: !!id,
    }), event = _c.data, isLoading = _c.isLoading, error = _c.error, refetch = _c.refetch;
    var rsvpMutation = (0, react_query_1.useMutation)({
        mutationFn: function (role) { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_client_1.post)("/api/rsvps", {
                            eventId: id,
                            role: role,
                        })];
                    case 1:
                        response = _a.sent();
                        if (response.error)
                            throw new Error(response.error);
                        return [2 /*return*/, response.data];
                }
            });
        }); },
        onSuccess: function (data) {
            queryClient.invalidateQueries({ queryKey: ["events", id] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            var message = (data === null || data === void 0 ? void 0 : data.status) === "waitlisted" ? messages_1.EVENT_DETAIL_MESSAGES.rsvpWaitlisted : messages_1.EVENT_DETAIL_MESSAGES.rsvpSuccess;
            react_native_1.Alert.alert(message);
            setShowRoleSheet(false);
            setSelectedRole(null);
        },
        onError: function () {
            react_native_1.Alert.alert(messages_1.EVENT_DETAIL_MESSAGES.rsvpError);
        },
    });
    function handleRsvpPress() {
        setShowRoleSheet(true);
    }
    function handleRoleConfirm() {
        if (selectedRole) {
            rsvpMutation.mutate(selectedRole);
        }
    }
    if (isLoading) {
        return (<react_native_1.View style={styles.centered}>
        <react_native_1.ActivityIndicator size="large" color="#2563eb"/>
        <react_native_1.Text style={styles.loadingText}>{messages_1.EVENT_DETAIL_MESSAGES.loading}</react_native_1.Text>
      </react_native_1.View>);
    }
    if (error || !event) {
        return (<react_native_1.TouchableOpacity style={styles.centered} onPress={function () { return refetch(); }}>
        <react_native_1.Text style={styles.errorText}>{messages_1.EVENT_DETAIL_MESSAGES.error}</react_native_1.Text>
        <react_native_1.Text style={styles.retryText}>{messages_1.EVENT_DETAIL_MESSAGES.retry}</react_native_1.Text>
      </react_native_1.TouchableOpacity>);
    }
    var isFull = event.spotsLeft !== null && event.spotsLeft <= 0;
    return (<react_native_1.View style={styles.container}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <react_native_1.Text style={styles.category}>{event.category}</react_native_1.Text>
        <react_native_1.Text style={styles.title}>{event.title}</react_native_1.Text>

        <react_native_1.View style={styles.metaSection}>
          <react_native_1.View style={styles.metaRow}>
            <react_native_1.Text style={styles.metaLabel}>{messages_1.EVENT_DETAIL_MESSAGES.when}</react_native_1.Text>
            <react_native_1.Text style={styles.metaValue}>
              {new Date(event.startsAt).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        })}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.metaRow}>
            <react_native_1.Text style={styles.metaLabel}>{messages_1.EVENT_DETAIL_MESSAGES.where}</react_native_1.Text>
            <react_native_1.Text style={styles.metaValue}>{event.location}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.metaRow}>
            <react_native_1.Text style={styles.metaLabel}>{messages_1.EVENT_DETAIL_MESSAGES.attendees}</react_native_1.Text>
            <react_native_1.Text style={styles.metaValue}>
              {event.attendeeCount}
              {event.capacity ? " / ".concat(event.capacity) : ""}
            </react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>

        {event.spotsLeft !== null && (<react_native_1.View style={[styles.spotsBadge, isFull && styles.spotsBadgeFull]}>
            <react_native_1.Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
              {isFull ? messages_1.EVENT_DETAIL_MESSAGES.full : "".concat(event.spotsLeft, " ").concat(messages_1.EVENT_DETAIL_MESSAGES.spots)}
            </react_native_1.Text>
          </react_native_1.View>)}

        <react_native_1.Text style={styles.sectionTitle}>{messages_1.EVENT_DETAIL_MESSAGES.about}</react_native_1.Text>
        <react_native_1.Text style={styles.description}>{event.description}</react_native_1.Text>
      </react_native_1.ScrollView>

      {!event.isRsvped && (<react_native_1.View style={styles.footer}>
          <react_native_1.TouchableOpacity style={[styles.rsvpButton, isFull && styles.rsvpButtonWaitlist]} onPress={handleRsvpPress} accessibilityRole="button" accessibilityLabel={isFull ? messages_1.EVENT_DETAIL_MESSAGES.rsvpFull : messages_1.EVENT_DETAIL_MESSAGES.rsvp}>
            <react_native_1.Text style={styles.rsvpButtonText}>
              {isFull ? messages_1.EVENT_DETAIL_MESSAGES.rsvpFull : messages_1.EVENT_DETAIL_MESSAGES.rsvp}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>)}

      {showRoleSheet && (<react_native_1.View style={styles.overlay}>
          <react_native_1.View style={styles.sheet}>
            <react_native_1.Text style={styles.sheetTitle}>{messages_1.EVENT_DETAIL_MESSAGES.selectRole}</react_native_1.Text>
            {ROLES.map(function (role) { return (<react_native_1.TouchableOpacity key={role.key} style={[
                    styles.roleOption,
                    selectedRole === role.key && styles.roleOptionSelected,
                ]} onPress={function () { return setSelectedRole(role.key); }} accessibilityRole="radio" accessibilityState={{ selected: selectedRole === role.key }}>
                <react_native_1.Text style={[
                    styles.roleText,
                    selectedRole === role.key && styles.roleTextSelected,
                ]}>
                  {role.label}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>); })}
            <react_native_1.View style={styles.sheetActions}>
              <react_native_1.TouchableOpacity style={styles.cancelButton} onPress={function () {
                setShowRoleSheet(false);
                setSelectedRole(null);
            }} accessibilityRole="button">
                <react_native_1.Text style={styles.cancelText}>{messages_1.EVENT_DETAIL_MESSAGES.cancel}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={[
                styles.confirmButton,
                !selectedRole && styles.confirmButtonDisabled,
            ]} onPress={handleRoleConfirm} disabled={!selectedRole || rsvpMutation.isPending} accessibilityRole="button">
                {rsvpMutation.isPending ? (<react_native_1.ActivityIndicator color="#fff" size="small"/>) : (<react_native_1.Text style={styles.confirmText}>{messages_1.EVENT_DETAIL_MESSAGES.confirm}</react_native_1.Text>)}
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>)}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    category: { fontSize: 13, fontWeight: "600", color: "#2563eb", textTransform: "uppercase", marginBottom: 4 },
    title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 16 },
    metaSection: { gap: 12, marginBottom: 16 },
    metaRow: { gap: 2 },
    metaLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase" },
    metaValue: { fontSize: 15, color: "#374151" },
    spotsBadge: { alignSelf: "flex-start", backgroundColor: "#ecfdf5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginBottom: 16 },
    spotsBadgeFull: { backgroundColor: "#fef2f2" },
    spotsText: { fontSize: 13, fontWeight: "600", color: "#059669" },
    spotsTextFull: { color: "#dc2626" },
    sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 8 },
    description: { fontSize: 15, color: "#374151", lineHeight: 22 },
    loadingText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
    errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
    retryText: { fontSize: 14, color: "#2563eb" },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: react_native_1.Platform.OS === "ios" ? 34 : 16,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
    },
    rsvpButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 16, alignItems: "center", minHeight: 52 },
    rsvpButtonWaitlist: { backgroundColor: "#7c3aed" },
    rsvpButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: react_native_1.Platform.OS === "ios" ? 40 : 24,
    },
    sheetTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
    roleOption: { padding: 16, borderRadius: 10, borderWidth: 2, borderColor: "#e5e7eb", marginBottom: 10, minHeight: 52, justifyContent: "center" },
    roleOptionSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
    roleText: { fontSize: 16, fontWeight: "500", color: "#374151" },
    roleTextSelected: { color: "#2563eb", fontWeight: "600" },
    sheetActions: { flexDirection: "row", gap: 12, marginTop: 8 },
    cancelButton: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center", minHeight: 48 },
    cancelText: { fontSize: 16, color: "#374151", fontWeight: "500" },
    confirmButton: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: "#2563eb", alignItems: "center", minHeight: 48 },
    confirmButtonDisabled: { opacity: 0.5 },
    confirmText: { fontSize: 16, color: "#fff", fontWeight: "600" },
});
