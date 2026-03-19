import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Toast } from "./index.web.js";

describe("Toast", () => {
  it("renders message when visible", () => {
    const html = renderToStaticMarkup(<Toast message="Event saved!" visible={true} />);
    expect(html).toContain("Event saved!");
  });

  it("renders nothing when not visible", () => {
    const html = renderToStaticMarkup(<Toast message="Hidden" visible={false} />);
    expect(html).toBe("");
  });

  it("has role=status and aria-live=polite", () => {
    const html = renderToStaticMarkup(<Toast message="Done" visible={true} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("shows dismiss button when onDismiss provided", () => {
    const html = renderToStaticMarkup(<Toast message="Done" visible={true} onDismiss={() => {}} />);
    expect(html).toContain('aria-label="Dismiss notification"');
  });

  it("hides dismiss button when onDismiss not provided", () => {
    const html = renderToStaticMarkup(<Toast message="Done" visible={true} />);
    expect(html).not.toContain("Dismiss notification");
  });
});
