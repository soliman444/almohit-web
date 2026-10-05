export default function Loading() {
  return (
    <div className="sf">
      <main className="sf-page">
        <div className="sf-skel" style={{ height: 72, width: "40%", marginBottom: 32 }} />
        <div className="sf-skel-grid">
          <div className="sf-skel sf-skel-card" />
          <div className="sf-skel sf-skel-card" />
          <div className="sf-skel sf-skel-card" />
        </div>
      </main>
    </div>
  );
}
