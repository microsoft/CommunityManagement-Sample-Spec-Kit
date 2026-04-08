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
exports.default = TeacherDetailScreen;
/**
 * Teacher detail screen — profile, certifications, reviews
 * Spec: 016-mobile-app (T032)
 */
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var api_client_1 = require("../../../lib/api-client");
var messages_1 = require("../../../lib/messages");
function TeacherDetailScreen() {
    var _this = this;
    var _a;
    var id = (0, expo_router_1.useLocalSearchParams)().id;
    var _b = (0, react_query_1.useQuery)({
        queryKey: ["teachers", id],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, api_client_1.get)("/api/teachers/".concat(id))];
                    case 1:
                        response = _a.sent();
                        if (response.error)
                            throw new Error(response.error);
                        return [2 /*return*/, response.data];
                }
            });
        }); },
        enabled: !!id,
    }), teacher = _b.data, isLoading = _b.isLoading, error = _b.error, refetch = _b.refetch;
    if (isLoading) {
        return (<react_native_1.View style={styles.centered}>
        <react_native_1.ActivityIndicator size="large" color="#2563eb"/>
      </react_native_1.View>);
    }
    if (error || !teacher) {
        return (<react_native_1.TouchableOpacity style={styles.centered} onPress={function () { return refetch(); }}>
        <react_native_1.Text style={styles.errorText}>{messages_1.TEACHER_DETAIL_MESSAGES.error}</react_native_1.Text>
        <react_native_1.Text style={styles.retryText}>{messages_1.TEACHER_DETAIL_MESSAGES.retry}</react_native_1.Text>
      </react_native_1.TouchableOpacity>);
    }
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <react_native_1.View style={styles.header}>
        {teacher.avatarUrl ? (<react_native_1.Image source={{ uri: teacher.avatarUrl }} style={styles.avatar} accessibilityLabel={"".concat(teacher.displayName, " avatar")}/>) : (<react_native_1.View style={[styles.avatar, styles.avatarPlaceholder]}>
            <react_native_1.Text style={styles.avatarInitial}>
              {teacher.displayName.charAt(0).toUpperCase()}
            </react_native_1.Text>
          </react_native_1.View>)}
        <react_native_1.Text style={styles.name}>{teacher.displayName}</react_native_1.Text>
        {teacher.city && <react_native_1.Text style={styles.city}>{teacher.city}</react_native_1.Text>}
      </react_native_1.View>

      {teacher.certifications.length > 0 && (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>{messages_1.TEACHER_DETAIL_MESSAGES.certifications}</react_native_1.Text>
          <react_native_1.View style={styles.certList}>
            {teacher.certifications.map(function (cert) { return (<react_native_1.View key={cert.id} style={styles.certBadge}>
                <react_native_1.Text style={styles.certName}>{cert.name}</react_native_1.Text>
                <react_native_1.Text style={styles.certDate}>
                  {new Date(cert.issuedAt).toLocaleDateString()}
                </react_native_1.Text>
              </react_native_1.View>); })}
          </react_native_1.View>
        </react_native_1.View>)}

      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionTitle}>{messages_1.TEACHER_DETAIL_MESSAGES.about}</react_native_1.Text>
        <react_native_1.Text style={styles.bio}>{(_a = teacher.bio) !== null && _a !== void 0 ? _a : messages_1.TEACHER_DETAIL_MESSAGES.noBio}</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionTitle}>{messages_1.TEACHER_DETAIL_MESSAGES.reviews}</react_native_1.Text>
        {teacher.reviews.length === 0 ? (<react_native_1.Text style={styles.noReviews}>{messages_1.TEACHER_DETAIL_MESSAGES.noReviews}</react_native_1.Text>) : (teacher.reviews.map(function (review) { return (<react_native_1.View key={review.id} style={styles.reviewCard}>
              <react_native_1.View style={styles.reviewHeader}>
                <react_native_1.Text style={styles.reviewAuthor}>{review.authorName}</react_native_1.Text>
                <react_native_1.Text style={styles.reviewRating}>
                  {"★".repeat(review.rating)}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.reviewText}>{review.text}</react_native_1.Text>
            </react_native_1.View>); }))}
      </react_native_1.View>
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
    name: { fontSize: 24, fontWeight: "700", color: "#111827" },
    city: { fontSize: 15, color: "#6b7280", marginTop: 4 },
    section: { marginBottom: 24 },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 12,
    },
    certList: { gap: 8 },
    certBadge: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f0fdf4",
        padding: 12,
        borderRadius: 8,
    },
    certName: { fontSize: 14, fontWeight: "600", color: "#059669" },
    certDate: { fontSize: 13, color: "#6b7280" },
    bio: { fontSize: 15, color: "#374151", lineHeight: 22 },
    noReviews: { fontSize: 14, color: "#6b7280", fontStyle: "italic" },
    reviewCard: {
        backgroundColor: "#f9fafb",
        padding: 14,
        borderRadius: 8,
        marginBottom: 10,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    reviewAuthor: { fontSize: 14, fontWeight: "600", color: "#374151" },
    reviewRating: { color: "#f59e0b", fontSize: 14 },
    reviewText: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
    errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
    retryText: { fontSize: 14, color: "#2563eb" },
});
