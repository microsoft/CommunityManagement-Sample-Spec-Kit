import { configureAxe } from "vitest-axe";
import { expect } from "vitest";

export const axe = configureAxe({
  rules: { region: { enabled: false } },
});

export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  // Use the raw violation array for assertions to avoid type augmentation issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((results as any).violations).toEqual([]);
}
