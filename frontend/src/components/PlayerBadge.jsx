export default function PlayerBadge({ name, isHost, isMe }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isHost && (
          <span style={{ fontSize: 14 }} title="主持人">
            👑
          </span>
        )}
        <span style={{ fontWeight: 900 }}>{name}</span>
        {isMe && <span style={{ fontSize: 12, opacity: 0.7 }}>（你）</span>}
      </div>

      {isHost && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(255,255,255,0.10)",
            opacity: 0.9,
          }}
        >
          主持人
        </span>
      )}
    </div>
  );
}
