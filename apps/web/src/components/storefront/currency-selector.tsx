"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DisplayCurrencyCode, DisplayCurrencyConfig } from "../../config/currencies";
import { setDisplayCurrencyAction } from "../../lib/currency-actions";

export function CurrencySelector({
  current,
  currencies,
  placement = "header",
}: {
  current: DisplayCurrencyCode;
  currencies: DisplayCurrencyConfig[];
  placement?: "header" | "menu";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(current);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setPending(current);
  }, [current]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function choose(code: DisplayCurrencyCode) {
    if (code === current) {
      setOpen(false);
      return;
    }
    setPending(code);
    setOpen(false);
    await setDisplayCurrencyAction(code);
    router.refresh();
  }

  return (
    <div className={`sf-currency ${placement === "menu" ? "is-menu" : ""}`} ref={root}>
      <button
        className="sf-nav-link sf-currency-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        {pending} <span aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="sf-currency-list" id={listId} role="listbox" aria-label="Display currency">
          {currencies.map((item) => (
            <li key={item.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={item.code === pending}
                className={item.code === pending ? "is-active" : ""}
                onClick={() => choose(item.code)}
              >
                {item.code}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
