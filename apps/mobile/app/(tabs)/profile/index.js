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
exports.default = ProfileScreen;
/**
 * Profile screen — user info, social links, sign out
 * Spec: 016-mobile-app (T034)
 */
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("../../../lib/api-client");
var auth_1 = require("../../../lib/auth");
var messages_1 = require("../../../lib/messages");
function ProfileScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ["profile"],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_client_1.get)("/api/profile")];
                    case 1:
                        response = _a.sent();
                        if (response.error)
                            throw new Error(response.error);
                        return [2 /*return*/, response.data];
                }
            });
        }); },
    }), profile = _a.data, isLoading = _a.isLoading, error = _a.error, refetch = _a.refetch;
    function handleSignOut() {
        var _this = this;
        react_native_1.Alert.alert(messages_1.PROFILE_MESSAGES.signOut, messages_1.PROFILE_MESSAGES.signOutConfirm, [
            { text: messages_1.PROFILE_MESSAGES.cancel, style: "cancel" },
            {
                text: messages_1.PROFILE_MESSAGES.signOut,
                style: "destructive",
                onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, auth_1.signOut)()];
                            case 1:
                                _a.sent();
                                queryClient.clear();
                                router.replace("/(auth)/login");
                                return [2 /*return*/];
                        }
                    });
                }); },
            },
        ]);
    }
    if (isLoading) {
        return (<react_native_1.View style={styles.centered}>
        <react_native_1.ActivityIndicator size="large" color="#2563eb"/>
      </react_native_1.View>);
    }
    if (error || !profile) {
        return (<react_native_1.TouchableOpacity style={styles.centered} onPress={function () { return refetch(); }}>
        <react_native_1.Text style={styles.errorText}>{messages_1.PROFILE_MESSAGES.error}</react_native_1.Text>
        <react_native_1.Text style={styles.retryText}>{messages_1.PROFILE_MESSAGES.retry}</react_native_1.Text>
      </react_native_1.TouchableOpacity>);
    }
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <react_native_1.View style={styles.header}>
        {profile.avatarUrl ? (<react_native_1.Image source={{ uri: profile.avatarUrl }} style={styles.avatar} accessibilityLabel={"".concat(profile.displayName, " avatar")}/>) : (<react_native_1.View style={[styles.avatar, styles.avatarPlaceholder]}>
            <react_native_1.Text style={styles.avatarInitial}>
              {profile.displayName.charAt(0).toUpperCase()}
            </react_native_1.Text>
          </react_native_1.View>)}
        <react_native_1.Text style={styles.name}>{profile.displayName}</react_native_1.Text>
        {profile.email && <react_native_1.Text style={styles.email}>{profile.email}</react_native_1.Text>}
        <react_native_1.Text style={styles.memberSince}>
          {messages_1.PROFILE_MESSAGES.member} since{" "}
          {new Date(profile.joinedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
        })}
        </react_native_1.Text>
      </react_native_1.View>

      {profile.bio && <react_native_1.Text style={styles.bio}>{profile.bio}</react_native_1.Text>}

      <react_native_1.View style={styles.menuSection}>
        <react_native_1.TouchableOpacity style={styles.menuItem} onPress={function () { return router.push("/(tabs)/profile/settings/notifications"); }} accessibilityRole="button" accessibilityLabel={messages_1.PROFILE_MESSAGES.notificationSettings}>
          <react_native_1.Text style={styles.menuText}>{messages_1.PROFILE_MESSAGES.notificationSettings}</react_native_1.Text>
          <react_native_1.Text style={styles.menuArrow}>›</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      <react_native_1.TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel={messages_1.PROFILE_MESSAGES.signOut}>
        <react_native_1.Text style={styles.signOutText}>{messages_1.PROFILE_MESSAGES.signOut}</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    content: { padding: 20 },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    header: { alignItems: "center", marginBottom: 24 },
    avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
    avatarPlaceholder: {
        backgroundColor: "#e5e7eb",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: { fontSize: 36, fontWeight: "700", color: "#6b7280" },
    name: { fontSize: 22, fontWeight: "700", color: "#111827" },
    email: { fontSize: 14, color: "#6b7280", marginTop: 4 },
    memberSince: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
    bio: { fontSize: 15, color: "#374151", lineHeight: 22, marginBottom: 24 },
    menuSection: {
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        marginBottom: 24,
    },
    menuItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        minHeight: 52,
    },
    menuText: { fontSize: 16, color: "#111827" },
    menuArrow: { fontSize: 20, color: "#9ca3af" },
    signOutButton: {
        borderWidth: 1,
        borderColor: "#dc2626",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        minHeight: 48,
    },
    signOutText: { fontSize: 16, color: "#dc2626", fontWeight: "600" },
    errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
    retryText: { fontSize: 14, color: "#2563eb" },
});
