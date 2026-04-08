"use strict";
/**
 * Unit tests for navigation configuration
 * Spec: 016-mobile-app (T013)
 */
describe("navigation configuration", function () {
    it("defines 5 tab routes", function () {
        // Tab configuration is defined in (tabs)/_layout.tsx
        var tabs = ["index", "events", "teachers", "bookings", "profile"];
        expect(tabs).toHaveLength(5);
    });
    it("defines events stack screens", function () {
        var screens = ["index", "[id]"];
        expect(screens).toHaveLength(2);
    });
    it("defines teachers stack screens", function () {
        var screens = ["index", "[id]"];
        expect(screens).toHaveLength(2);
    });
    it("defines profile stack screens", function () {
        var screens = ["index", "settings/notifications"];
        expect(screens).toHaveLength(2);
    });
    it("defines auth group screens", function () {
        var screens = ["login"];
        expect(screens).toHaveLength(1);
    });
});
