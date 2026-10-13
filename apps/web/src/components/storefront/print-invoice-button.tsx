"use client";

export function PrintInvoiceButton({ orderNumber }: { orderNumber: string }) {
  return (
    <button
      type="button"
      className="sf-btn is-subtle"
      onClick={() => {
        const previous = document.title;
        document.title = `Almohit-${orderNumber}`;
        window.print();
        window.setTimeout(() => {
          document.title = previous;
        }, 500);
      }}
    >
      <span>Print PDF</span>
    </button>
  );
}
