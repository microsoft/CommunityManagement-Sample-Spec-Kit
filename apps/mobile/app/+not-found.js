"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotFoundScreen;
/**
 * Not found screen
 * Spec: 016-mobile-app (T020)
 */
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var messages_1 = require("../lib/messages");
function NotFoundScreen() {
    var router = (0, expo_router_1.useRouter)();
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>{messages_1.NOT_FOUND_MESSAGES.title}</react_native_1.Text>
      <react_native_1.Text style={styles.description}>{messages_1.NOT_FOUND_MESSAGES.description}</react_native_1.Text>
      <react_native_1.TouchableOpacity style={styles.button} onPress={function () { return router.replace("/(tabs)"); }} accessibilityRole="button" accessibilityLabel={messages_1.NOT_FOUND_MESSAGES.goHome}>
        <react_native_1.Text style={styles.buttonText}>{messages_1.NOT_FOUND_MESSAGES.goHome}</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
    description: { fontSize: 16, color: "#666", marginBottom: 24, textAlign: "center" },
    button: {
        backgroundColor: "#2563eb",
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        minHeight: 44,
        justifyContent: "center",
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
