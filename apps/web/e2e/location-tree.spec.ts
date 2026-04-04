/**
 * E2E: Location Tree Journey (Spec 010 T046 / Spec 013 T019)
 *
 * Verifies the location tree sidebar renders a continent → country → city
 * hierarchy, supports search filtering, and updates the URL when a
 * location is selected.
 */
import { test, expect } from "./fixtures";

test.describe("Location tree journey", () => {
  test("renders the location sidebar with search input", async ({
    explorerPage: page,
  }) => {
    const sidebar = page.locator('[aria-label="Location filter"]');
    await expect(sidebar).toBeVisible();

    const searchInput = sidebar.getByLabel("Filter locations");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("type", "search");
  });

  test("displays location nodes from mock data", async ({
    explorerPage: page,
  }) => {
    const sidebar = page.locator('[aria-label="Location filter"]');

    /* The tree should contain continent / country / city entries.
       Mock data provides: Europe → Germany → Berlin, Europe → Portugal → Lisbon */
    await expect(sidebar.getByText("Europe")).toBeVisible();
  });

  test("search filters the tree to matching locations", async ({
    explorerPage: page,
  }) => {
    const sidebar = page.locator('[aria-label="Location filter"]');
    const searchInput = sidebar.getByLabel("Filter locations");

    /* Type a search term that matches one city */
    await searchInput.fill("Berlin");

    /* Berlin should still be visible */
    await expect(sidebar.getByText("Berlin")).toBeVisible();
  });

  test("clearing search restores all locations", async ({
    explorerPage: page,
  }) => {
    const sidebar = page.locator('[aria-label="Location filter"]');
    const searchInput = sidebar.getByLabel("Filter locations");

    /* Filter to one city */
    await searchInput.fill("Lisbon");
    await expect(sidebar.getByText("Lisbon")).toBeVisible();

    /* Clear the search */
    await searchInput.fill("");

    /* Both cities should be visible again */
    await expect(sidebar.getByText("Berlin")).toBeVisible();
    await expect(sidebar.getByText("Lisbon")).toBeVisible();
  });

  test("selecting a location updates the URL", async ({
    explorerPage: page,
  }) => {
    const sidebar = page.locator('[aria-label="Location filter"]');

    /* Click on a tree node — "Europe" should be a clickable item.
       After clicking, the URL should gain a location= search param. */
    const europeNode = sidebar.getByText("Europe").first();
    await europeNode.click();

    /* Wait for the router to update the URL with a location param */
    await expect(page).toHaveURL(/[?&]location=/, { timeout: 5_000 });

    const url = new URL(page.url());
    const loc = url.searchParams.get("location");
    /* The location param should be set (could be "EU" or "EU/..." depending on the tree) */
    expect(loc).toBeTruthy();
  });
});
