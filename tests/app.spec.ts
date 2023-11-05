import { test, expect, type Page } from "@playwright/test";

test("Can undo/redo properties", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  await expect(page.getByText("Build the app")).toBeVisible();

  const priority = page.getByRole("combobox", { name: "Priority" }).nth(0);
  await expect(priority).toHaveText("low");

  await priority.click();

  await page.getByRole("option", { name: /High/ }).click();
  await expect(priority).toHaveText("high");

  await expect(page.getByText("Saving...")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  await undo(page);
  await expect(priority).toHaveText("low");

  await redo(page);
  await expect(priority).toHaveText("high");

  await expect(page.getByText("Saving...")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();
});

test("Can undo/redo properties with patches", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  await expect(page.getByText("Build the app")).toBeVisible();

  const status = page.getByRole("combobox", { name: "Status" }).nth(0);
  await expect(status).toHaveText("todo");

  await status.click();
  await page.getByRole("option", { name: /In Progress/ }).click();
  await expect(status).toHaveText("in-progress");

  await expect(page.getByText("Saving...")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  await undo(page);
  await expect(status).toHaveText("todo");

  await redo(page);
  await expect(status).toHaveText("in-progress");
});

test("Can pause the history when needed", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  const firstIssueLocator = page.getByTestId("issue").first();
  await firstIssueLocator.click();

  const input = page.getByRole("textbox", { name: /title/i });
  const currentValue = await input.inputValue();

  await expect(input).toBeVisible();
  await input.pressSequentially("123", { delay: 100 });

  await expect(input).toBeFocused();

  const nextValue = await input.inputValue();

  await expect(
    page.getByText(new RegExp(`^${currentValue}$`)),
  ).not.toBeVisible();

  await input.blur();

  await expect(page.getByText("Saving...")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  await undo(page);
  await expect(page.getByText(new RegExp(`^${currentValue}$`))).toBeVisible();

  await page.getByRole("button", { name: /redo/i }).click();
  await expect(page.getByText(nextValue)).toBeVisible();
});

test("can create new issues", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  const newBtn = page.getByRole("button", { name: /new issue/i });
  await newBtn.click();

  const dialog = page.getByRole("dialog", { name: /new issue/i });
  await expect(dialog).toBeVisible();
  const nameInput = dialog.getByRole("textbox", { name: /title/i });
  await expect(nameInput).toBeFocused();

  await nameInput.fill("Another issue");
  await page.getByRole("button", { name: /create issue/i }).click();
  await expect(dialog).not.toBeVisible();

  const newIssue = page.getByText("Another issue");
  await expect(newIssue).toBeVisible();

  await undo(page);
  await expect(newIssue).not.toBeVisible();

  await redo(page);
  await expect(newIssue).toBeVisible();
});

test("can execute effects", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  const edit = page.getByText("Build the app");
  await edit.click();

  const input = page.getByRole("textbox", { name: /title/i });
  await expect(input).toBeVisible();

  await input.fill("Edited");
  await input.blur();
  await expect(page.getByText("Saving...")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.getByRole("button", { name: /close/i }).click();

  await expect(input).not.toBeVisible();

  await undo(page);
  await expect(input).toBeFocused();
  await redo(page);
  await expect(input).toBeFocused();
});

test("can handle multiple stores", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  const fav = page.getByRole("button", { name: /toggle favorite/i }).nth(0);
  await expect(fav).toHaveAttribute("aria-pressed", "false");
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");

  await undo(page);
  await expect(fav).toHaveAttribute("aria-pressed", "false");

  await expect(page.getByText("Saving...")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  await redo(page);
  await expect(fav).toHaveAttribute("aria-pressed", "true");
});

test("can support the GURQ", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  const priority = page.getByRole("combobox", { name: "Priority" }).nth(0);
  await expect(priority).toHaveText("low");

  await priority.click();

  await page.getByRole("option", { name: /High/ }).click();
  await expect(priority).toHaveText("high");

  await undo(page);
  await expect(priority).toHaveText("low");

  await priority.click();

  // History change!
  await page.getByRole("option", { name: /Medium/ }).click();
  await expect(priority).toHaveText("medium");

  await undo(page);
  await expect(priority).toHaveText("low");

  await undo(page);
  await expect(priority).toHaveText("high");

  await undo(page);
  await expect(priority).toHaveText("low");

  await redo(page);
  await expect(priority).toHaveText("high");

  await redo(page);
  await expect(priority).toHaveText("low");

  await redo(page);
  await expect(priority).toHaveText("medium");
});

test("can handle a failed sync", async ({ page }) => {
  await page.goto("/");
  await pageReady(page);

  await page.getByTestId("issue").first().click();

  const input = page.getByRole("textbox", { name: /title/i });
  await input.fill("Test");
  await input.blur();

  await expect(page.getByText("Saved")).toBeVisible();

  await input.fill("BOOM");
  await input.blur();
  await expect(page.getByText("Error")).toBeVisible();

  await expect(input).toHaveValue("Test");

  await input.fill("Foo");
  await input.blur();

  await undo(page);
  await expect(input).toHaveValue("Test");

  await undo(page);
  await expect(input).toHaveValue("Build the app");

  await redo(page);
  await expect(input).toHaveValue("Test");

  await redo(page);
  await expect(input).toHaveValue("Foo");
});

async function pageReady(page: Page) {
  const locator = page.getByText(/all issues/i);
  return locator.waitFor();
}

async function undo(page: Page) {
  await page.getByRole("button", { name: /undo/i }).click();
}

async function redo(page: Page) {
  await page.getByRole("button", { name: /redo/i }).click();
}
