export default function Loading() {
  return (
    <div className="sf">
      <div className="sf-pdp-page">
        <div className="sf-pdp">
          <div className="sf-skel" style={{ minHeight: "56vh" }} />
          <div>
            <div className="sf-skel" style={{ height: 18, width: "36%", marginBottom: 12 }} />
            <div className="sf-skel" style={{ height: 48, width: "78%", marginBottom: 16 }} />
            <div className="sf-skel" style={{ height: 88, width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
