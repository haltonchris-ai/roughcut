"use client";

import { useFormStatus } from "react-dom";

// Disables itself while the surrounding server action is running, so a slow
// response can't be double-submitted by clicking again.
export function SubmitButton({
  children,
  pendingText = "Working…",
  className,
  confirmMessage,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={(className ?? "btn-primary") + (pending ? " opacity-60 cursor-not-allowed" : "")}
      onClick={(e) => {
        if (confirmMessage && !pending && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
