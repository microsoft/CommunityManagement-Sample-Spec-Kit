import type { Meta, StoryObj } from "@storybook/react";

function SpacingScale() {
  const spacings = [
    { name: "50", var: "--spacing-50" },
    { name: "100", var: "--spacing-100" },
    { name: "200", var: "--spacing-200" },
    { name: "300", var: "--spacing-300" },
    { name: "400", var: "--spacing-400" },
    { name: "500", var: "--spacing-500" },
    { name: "600", var: "--spacing-600" },
    { name: "800", var: "--spacing-800" },
    { name: "1000", var: "--spacing-1000" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-300)" }}>
      {spacings.map(({ name, var: cssVar }) => (
        <div key={cssVar} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-400)" }}>
          <code style={{ width: 140, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{cssVar}</code>
          <div
            style={{
              height: 24,
              width: `var(${cssVar})`,
              backgroundColor: "var(--color-primary)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          <span style={{ fontSize: "var(--font-size-sm)" }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

const meta: Meta<typeof SpacingScale> = {
  title: "Design Tokens/Spacing Scale",
  component: SpacingScale,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof SpacingScale>;

export const AllSpacings: Story = {};
