import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "./index.web.js";

describe("EmptyState", () => {
  it("renders title", () => {
    const html = renderToStaticMarkup(<EmptyState title="No events" />);
    expect(html).toContain("No events");
  });

  it("renders description", () => {
    const html = renderToStaticMarkup(<EmptyState title="X" description="Try again" />);
    expect(html).toContain("Try again");
  });

  it("renders icon when provided", () => {
    const html = renderToStaticMarkup(<EmptyState title="X" icon="📅" />);
    expect(html).toContain("📅");
  });

  it("omits icon span when not provided", () => {
    const html = renderToStaticMarkup(<EmptyState title="X" />);
    expect(html).not.toContain("aria-hidden");
  });

  it("renders children", () => {
    const html = renderToStaticMarkup(<EmptyState title="X"><button>Action</button></EmptyState>);
    expect(html).toContain("<button>Action</button>");
  });
});
