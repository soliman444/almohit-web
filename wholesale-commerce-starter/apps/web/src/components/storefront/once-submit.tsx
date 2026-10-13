"use client";

import { useFormStatus } from "react-dom";
import { useRef, type CSSProperties, type FormEvent, type ReactNode } from "react";

export function OnceForm({
  action,
  children,
  className,
  style,
  onSubmit,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const submitted = useRef(false);
  return (
    <form
      className={className}
      style={style}
      action={action}
      onSubmit={(event) => {
        if (submitted.current) {
          event.preventDefault();
          return;
        }
        submitted.current = true;
        onSubmit?.(event);
      }}
    >
      <div className="sf-once-fields">{children}</div>
    </form>
  );
}

export function OnceSubmit({
  children,
  className,
  disabled,
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const pending = useFormStatus().pending;
  return (
    <button className={className} type="submit" disabled={disabled || pending} aria-busy={pending}>
      {pending ? <span>{pendingLabel ?? "Please wait…"}</span> : children}
    </button>
  );
}
