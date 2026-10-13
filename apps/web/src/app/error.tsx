"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="service-unavailable">
      <div className="service-unavailable__inner">
        <p className="service-unavailable__brand">ALMOHIT</p>
        <h1>حدث خطأ أثناء تحميل الصفحة</h1>
        <p>لم نتمكن من إكمال العملية. يرجى إعادة المحاولة.</p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
              return;
            }
            reset();
          }}
          className="service-unavailable__retry"
        >
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
