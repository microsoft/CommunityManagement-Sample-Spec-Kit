import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Select } from "./index.web.js";

const options = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

describe("Select", () => {
  it("renders label and select element", () => {
    const html = renderToStaticMarkup(<Select label="Skill Level" options={options} />);
    expect(html).toContain("Skill Level");
    expect(html).toContain("<select");
  });

  it("renders all options", () => {
    const html = renderToStaticMarkup(<Select label="Level" options={options} />);
    expect(html).toContain("Beginner");
    expect(html).toContain("Intermediate");
    expect(html).toContain("Advanced");
  });

  it("links label to select via htmlFor/id", () => {
    const html = renderToStaticMarkup(<Select label="Level" id="my-level" options={options} />);
    expect(html).toContain('for="my-level"');
    expect(html).toContain('id="my-level"');
  });

  it("renders placeholder as disabled option", () => {
    const html = renderToStaticMarkup(<Select label="Level" options={options} placeholder="Choose…" />);
    expect(html).toContain("Choose…");
  });

  it("renders error message with role=alert", () => {
    const html = renderToStaticMarkup(<Select label="Level" options={options} state="error" errorMessage="Required" />);
    expect(html).toContain("Required");
    expect(html).toContain('role="alert"');
  });

  it("sets aria-invalid on error state", () => {
    const html = renderToStaticMarkup(<Select label="Level" options={options} state="error" />);
    expect(html).toContain('aria-invalid="true"');
  });

  it("applies disabled attribute", () => {
    const html = renderToStaticMarkup(<Select label="Level" options={options} disabled />);
    expect(html).toContain("disabled");
  });
});
