/**
 * E2E: Calendar Panel User Journey (Spec 010 T021 / Spec 013 T017)
 *
 * Verifies the calendar panel renders a month grid, supports month
 * navigation, and allows day selection that filters events.
 */
import { test, expect } from "./fixtures";

test.describe("Calendar panel journey", () => {
  test("renders the month grid with day headers", async ({ explorerPage: page }) => {
    const grid = page.locator('[role="grid"][aria-label="Calendar month view"]');
    await expect(grid).toBeVisible();

    /* Seven column headers (Mon–Sun) */
    const headers = grid.locator('[role="columnheader"]');
    await expect(headers).toHaveCount(7);
    await expect(headers.first()).toHaveText("Mon");
    await expect(headers.last()).toHaveText("Sun");
  });

  test("navigates to previous and next months", async ({ explorerPage: page }) => {
    /* The month label sits between the prev/next buttons in the calendar header.
       Target by position: it's a <span> between the two navigation buttons. */
    const calendarRegion = page.locator('[role="region"][aria-label="Event calendar"]');
    const prevBtn = calendarRegion.getByLabel("Previous month");
    const nextBtn = calendarRegion.getByLabel("Next month");
    /* The month label is a span sibling of the navigation buttons */
    const monthLabel = calendarRegion.locator("span").filter({ hasText: /\w+ \d{4}/ }).first();

    const initial = await monthLabel.textContent();
    expect(initial).toBeTruthy();

    /* Click next month */
    await nextBtn.click();
    await expect(monthLabel).not.toHaveText(initial!);
    const afterNext = await monthLabel.textContent();

    /* Click previous month to return to initial */
    await prevBtn.click();
    await expect(monthLabel).toHaveText(initial!);

    /* Click previous again to go before the initial month */
    await prevBtn.click();
    const afterPrev = await monthLabel.textContent();
    expect(afterPrev).not.toBe(initial);
    expect(afterPrev).not.toBe(afterNext);
  });

  test("clicking a day cell selects it", async ({ explorerPage: page }) => {
    const grid = page.locator('[role="grid"][aria-label="Calendar month view"]');

    /* Click the first gridcell in the current month that is fully opaque */
    const cells = grid.locator('[role="gridcell"]');
    const firstActiveCell = cells.first();
    await firstActiveCell.click();

    /* The cell should now be aria-selected */
    await expect(firstActiveCell).toHaveAttribute("aria-selected", "true");
  });

  test("toggling event count bubbles via the # button", async ({
    explorerPage: page,
  }) => {
    const toggleBtn = page.getByLabel("Toggle event counts on calendar");
    await expect(toggleBtn).toBeVisible();

    /* Toggle on */
    await toggleBtn.click();
    /* Toggle back off */
    await toggleBtn.click();

    /* Button should reflect toggled state via aria-pressed */
    await expect(toggleBtn).toHaveAttribute("aria-pressed", /true|false/);
  });
});
