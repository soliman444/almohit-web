"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

export function OnceForm({
  action,
  children,
  className,
  style,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className={className}
      style={style}
      action={action}
      onSubmit={() => setPending(true)}
    >
      <fieldset disabled={pending} className="sf-once-fields">
        {children}
      </fieldset>
    </form>
  );
}

export function OnceSubmit({
  children,
  className,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button className={className} type="submit" disabled={disabled}>
      {children}
    </button>
  );
}
