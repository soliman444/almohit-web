"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="service-unavailable">
          <div className="service-unavailable__inner">
            <p className="service-unavailable__brand">ALMOHIT</p>
            <h1>تعذر تشغيل Almohit</h1>
            <p>حدث خطأ أثناء تشغيل الموقع. يرجى إعادة المحاولة.</p>
            <button type="button" onClick={() => reset()} className="service-unavailable__retry">
              إعادة المحاولة
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
