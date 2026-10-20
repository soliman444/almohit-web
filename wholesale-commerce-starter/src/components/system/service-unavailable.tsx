type ServiceUnavailableProps = {
  compact?: boolean;
};

export function ServiceUnavailable({ compact = false }: ServiceUnavailableProps) {
  return (
    <main className={compact ? "service-unavailable service-unavailable--compact" : "service-unavailable"}>
      <div className="service-unavailable__inner">
        <p className="service-unavailable__brand">ALMOHIT</p>
        <h1>خدمة المتجر غير متاحة مؤقتًا</h1>
        <p>تعذر الاتصال بخادم المتجر. يرجى المحاولة مرة أخرى بعد قليل.</p>
        <a href="" className="service-unavailable__retry">
          إعادة المحاولة
        </a>
      </div>
    </main>
  );
}
