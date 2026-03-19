import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./index.web.js";

const meta: Meta<typeof Modal> = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Modal>;

function ModalDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open Modal</button>
      <Modal open={open} title="Confirm RSVP" onClose={() => setOpen(false)}>
        <p>Are you sure you want to RSVP to this event?</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={() => setOpen(false)}>Confirm</button>
        </div>
      </Modal>
    </>
  );
}

export const Default: Story = { render: () => <ModalDemo /> };
