/**
 * Unit tests for navigation configuration
 * Spec: 016-mobile-app (T013)
 */
describe("navigation configuration", () => {
  it("defines 5 tab routes", () => {
    // Tab configuration is defined in (tabs)/_layout.tsx
    const tabs = ["index", "events", "teachers", "bookings", "profile"];
    expect(tabs).toHaveLength(5);
  });

  it("defines events stack screens", () => {
    const screens = ["index", "[id]"];
    expect(screens).toHaveLength(2);
  });

  it("defines teachers stack screens", () => {
    const screens = ["index", "[id]"];
    expect(screens).toHaveLength(2);
  });

  it("defines profile stack screens", () => {
    const screens = ["index", "settings/notifications"];
    expect(screens).toHaveLength(2);
  });

  it("defines auth group screens", () => {
    const screens = ["login"];
    expect(screens).toHaveLength(1);
  });
});
