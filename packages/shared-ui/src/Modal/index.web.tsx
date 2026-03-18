import React, { useEffect, useRef } from "react";
import type { WebModalProps } from "./Modal.js";

export function Modal({ open, title, children, onClose, className, style }: WebModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={className}
      aria-labelledby="modal-title"
      style={{
        border: "none",
        borderRadius: "var(--radius-lg, 12px)",
        padding: 0,
        maxWidth: "min(90vw, 480px)",
        boxShadow: "var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1))",
        ...style,
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div style={{ padding: "var(--spacing-6, 24px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-4, 16px)" }}>
          <h2
            id="modal-title"
            style={{
              margin: 0,
              fontSize: "var(--font-size-lg, 18px)",
              fontWeight: "var(--font-weight-semibold, 600)" as unknown as number,
              color: "var(--color-surface-foreground, #111827)",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.5rem",
              lineHeight: 1,
              color: "var(--color-surface-muted-foreground, #6b7280)",
              padding: "var(--spacing-1, 4px)",
            }}
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
