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
exports.default = NotificationSettingsScreen;
/**
 * Notification settings screen — manage push notification preferences
 * Spec: 016-mobile-app (T035)
 *
 * Reuses preference types from Spec 015
 */
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("../../../../lib/api-client");
var messages_1 = require("../../../../lib/messages");
function NotificationSettingsScreen() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)({
        pushEnabled: true,
        categories: {
            eventReminders: true,
            rsvpUpdates: true,
            waitlistUpdates: true,
            eventChanges: true,
        },
    }), prefs = _a[0], setPrefs = _a[1];
    var _b = (0, react_query_1.useQuery)({
        queryKey: ["notification-preferences"],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_client_1.get)("/api/notifications/preferences")];
                    case 1:
                        response = _a.sent();
                        if (response.error)
                            throw new Error(response.error);
                        return [2 /*return*/, response.data];
                }
            });
        }); },
    }), data = _b.data, isLoading = _b.isLoading, error = _b.error, refetch = _b.refetch;
    (0, react_1.useEffect)(function () {
        if (data)
            setPrefs(data);
    }, [data]);
    var saveMutation = (0, react_query_1.useMutation)({
        mutationFn: function (newPrefs) { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_client_1.put)("/api/notifications/preferences", newPrefs)];
                    case 1:
                        response = _a.sent();
                        if (response.error)
                            throw new Error(response.error);
                        return [2 /*return*/, response.data];
                }
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
        },
    });
    function togglePush(value) {
        var updated = __assign(__assign({}, prefs), { pushEnabled: value });
        setPrefs(updated);
        saveMutation.mutate(updated);
    }
    function toggleCategory(key, value) {
        var _a;
        var updated = __assign(__assign({}, prefs), { categories: __assign(__assign({}, prefs.categories), (_a = {}, _a[key] = value, _a)) });
        setPrefs(updated);
        saveMutation.mutate(updated);
    }
    if (isLoading) {
        return (<react_native_1.View style={styles.centered}>
        <react_native_1.ActivityIndicator size="large" color="#2563eb"/>
      </react_native_1.View>);
    }
    if (error) {
        return (<react_native_1.TouchableOpacity style={styles.centered} onPress={function () { return refetch(); }}>
        <react_native_1.Text style={styles.errorText}>{messages_1.NOTIFICATION_SETTINGS_MESSAGES.error}</react_native_1.Text>
        <react_native_1.Text style={styles.retryText}>{messages_1.NOTIFICATION_SETTINGS_MESSAGES.retry}</react_native_1.Text>
      </react_native_1.TouchableOpacity>);
    }
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <react_native_1.View style={styles.section}>
        <react_native_1.View style={styles.settingRow}>
          <react_native_1.View style={styles.settingInfo}>
            <react_native_1.Text style={styles.settingTitle}>{messages_1.NOTIFICATION_SETTINGS_MESSAGES.pushNotifications}</react_native_1.Text>
            <react_native_1.Text style={styles.settingDesc}>{messages_1.NOTIFICATION_SETTINGS_MESSAGES.pushDescription}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.Switch value={prefs.pushEnabled} onValueChange={togglePush} trackColor={{ false: "#d1d5db", true: "#93c5fd" }} thumbColor={prefs.pushEnabled ? "#2563eb" : "#f4f3f4"} accessibilityLabel={messages_1.NOTIFICATION_SETTINGS_MESSAGES.pushNotifications}/>
        </react_native_1.View>
      </react_native_1.View>

      {prefs.pushEnabled && (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>{messages_1.NOTIFICATION_SETTINGS_MESSAGES.categories}</react_native_1.Text>

          {[
                {
                    key: "eventReminders",
                    title: messages_1.NOTIFICATION_SETTINGS_MESSAGES.eventReminders,
                    desc: messages_1.NOTIFICATION_SETTINGS_MESSAGES.eventRemindersDesc,
                },
                {
                    key: "rsvpUpdates",
                    title: messages_1.NOTIFICATION_SETTINGS_MESSAGES.rsvpUpdates,
                    desc: messages_1.NOTIFICATION_SETTINGS_MESSAGES.rsvpUpdatesDesc,
                },
                {
                    key: "waitlistUpdates",
                    title: messages_1.NOTIFICATION_SETTINGS_MESSAGES.waitlistUpdates,
                    desc: messages_1.NOTIFICATION_SETTINGS_MESSAGES.waitlistUpdatesDesc,
                },
                {
                    key: "eventChanges",
                    title: messages_1.NOTIFICATION_SETTINGS_MESSAGES.eventChanges,
                    desc: messages_1.NOTIFICATION_SETTINGS_MESSAGES.eventChangesDesc,
                },
            ].map(function (item) { return (<react_native_1.View key={item.key} style={styles.settingRow}>
              <react_native_1.View style={styles.settingInfo}>
                <react_native_1.Text style={styles.settingTitle}>{item.title}</react_native_1.Text>
                <react_native_1.Text style={styles.settingDesc}>{item.desc}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Switch value={prefs.categories[item.key]} onValueChange={function (v) { return toggleCategory(item.key, v); }} trackColor={{ false: "#d1d5db", true: "#93c5fd" }} thumbColor={prefs.categories[item.key] ? "#2563eb" : "#f4f3f4"} accessibilityLabel={item.title}/>
            </react_native_1.View>); })}
        </react_native_1.View>)}
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f9fafb" },
    content: { padding: 16 },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    section: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 16,
    },
    settingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        minHeight: 60,
    },
    settingInfo: { flex: 1, marginRight: 16 },
    settingTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
    settingDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
    errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
    retryText: { fontSize: 14, color: "#2563eb" },
});
