import { configureAxe } from "vitest-axe";
import { expect } from "vitest";

export const axe = configureAxe({
  rules: { region: { enabled: false } },
});

export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  // vitest-axe exports toHaveNoViolations as a type-only export in its .d.ts which causes
  // TS2339 when used via expect.extend. We assert on violations directly instead.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((results as any).violations).toEqual([]);
}
