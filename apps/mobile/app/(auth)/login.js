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
exports.default = LoginScreen;
/**
 * Login screen
 * Spec: 016-mobile-app (T015)
 */
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var auth_1 = require("../../lib/auth");
var api_client_1 = require("../../lib/api-client");
var messages_1 = require("../../lib/messages");
function LoginScreen() {
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)(""), email = _a[0], setEmail = _a[1];
    var _b = (0, react_1.useState)(""), password = _b[0], setPassword = _b[1];
    var _c = (0, react_1.useState)(false), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(null), error = _d[0], setError = _d[1];
    function handleSignIn() {
        return __awaiter(this, void 0, void 0, function () {
            var apiUrl, response, sessionCookie, tokens, _a;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!email.trim() || !password.trim())
                            return [2 /*return*/];
                        setLoading(true);
                        setError(null);
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, 5, 6]);
                        apiUrl = (_b = process.env.EXPO_PUBLIC_API_URL) !== null && _b !== void 0 ? _b : "http://localhost:3000";
                        (0, api_client_1.configureApiClient)({ baseUrl: apiUrl });
                        return [4 /*yield*/, fetch("".concat(apiUrl, "/api/auth/callback/credentials"), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email: email, password: password }),
                                credentials: "include",
                            })];
                    case 2:
                        response = _d.sent();
                        if (!response.ok) {
                            setError(messages_1.LOGIN_MESSAGES.error);
                            return [2 /*return*/];
                        }
                        sessionCookie = (_c = response.headers.get("set-cookie")) !== null && _c !== void 0 ? _c : "";
                        return [4 /*yield*/, (0, auth_1.signIn)(apiUrl, sessionCookie)];
                    case 3:
                        tokens = _d.sent();
                        if (tokens) {
                            router.replace("/(tabs)");
                        }
                        else {
                            setError(messages_1.LOGIN_MESSAGES.error);
                        }
                        return [3 /*break*/, 6];
                    case 4:
                        _a = _d.sent();
                        setError(messages_1.LOGIN_MESSAGES.error);
                        return [3 /*break*/, 6];
                    case 5:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === "ios" ? "padding" : "height"}>
      <react_native_1.View style={styles.content}>
        <react_native_1.Text style={styles.title}>{messages_1.LOGIN_MESSAGES.title}</react_native_1.Text>
        <react_native_1.Text style={styles.subtitle}>{messages_1.LOGIN_MESSAGES.subtitle}</react_native_1.Text>

        {error && <react_native_1.Text style={styles.error}>{error}</react_native_1.Text>}

        <react_native_1.View style={styles.form}>
          <react_native_1.Text style={styles.label}>{messages_1.LOGIN_MESSAGES.emailLabel}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={messages_1.LOGIN_MESSAGES.emailPlaceholder} keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel={messages_1.LOGIN_MESSAGES.emailLabel}/>

          <react_native_1.Text style={styles.label}>{messages_1.LOGIN_MESSAGES.passwordLabel}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={messages_1.LOGIN_MESSAGES.passwordPlaceholder} secureTextEntry autoComplete="password" accessibilityLabel={messages_1.LOGIN_MESSAGES.passwordLabel}/>

          <react_native_1.TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignIn} disabled={loading} accessibilityRole="button" accessibilityLabel={loading ? messages_1.LOGIN_MESSAGES.signingIn : messages_1.LOGIN_MESSAGES.signIn}>
            {loading ? (<react_native_1.ActivityIndicator color="#fff"/>) : (<react_native_1.Text style={styles.buttonText}>{messages_1.LOGIN_MESSAGES.signIn}</react_native_1.Text>)}
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.KeyboardAvoidingView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    content: { flex: 1, justifyContent: "center", padding: 24 },
    title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8 },
    subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 32 },
    error: { color: "#dc2626", textAlign: "center", marginBottom: 16, fontSize: 14 },
    form: { gap: 12 },
    label: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 44,
    },
    button: {
        backgroundColor: "#2563eb",
        borderRadius: 8,
        padding: 14,
        alignItems: "center",
        marginTop: 8,
        minHeight: 48,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
