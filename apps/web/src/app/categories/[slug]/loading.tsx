export default function Loading() {
  return (
    <div className="sf">
      <div className="sf-skel" style={{ minHeight: "72vh" }} />
      <div className="sf-skel-grid">
        <div className="sf-skel sf-skel-card" />
        <div className="sf-skel sf-skel-card" />
      </div>
    </div>
  );
}
