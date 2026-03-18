import type { Meta, StoryObj } from "@storybook/react";

function TokenSwatches() {
  const colors = [
    { name: "Primary", var: "--color-primary" },
    { name: "Secondary", var: "--color-secondary" },
    { name: "Surface Background", var: "--color-surface-background" },
    { name: "Surface Card", var: "--color-surface-card" },
    { name: "Text Body", var: "--color-text-body" },
    { name: "Text Muted", var: "--color-text-muted" },
    { name: "Border Default", var: "--color-border-default" },
    { name: "Status Success", var: "--color-status-success" },
    { name: "Status Warning", var: "--color-status-warning" },
    { name: "Status Error", var: "--color-status-error" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--spacing-400)" }}>
      {colors.map(({ name, var: cssVar }) => (
        <div key={cssVar} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-200)" }}>
          <div
            style={{
              width: "100%",
              height: 64,
              borderRadius: "var(--radius-md)",
              backgroundColor: `var(${cssVar})`,
              border: "1px solid var(--color-border-default)",
            }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{name}</div>
            <code style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{cssVar}</code>
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta<typeof TokenSwatches> = {
  title: "Design Tokens/Color Swatches",
  component: TokenSwatches,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof TokenSwatches>;

export const AllColors: Story = {};
