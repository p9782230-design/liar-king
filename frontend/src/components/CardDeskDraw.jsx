import { motion } from "framer-motion";
import { useMemo, useState } from "react";

export default function CardDeskDraw({
  cardWidth = 220,
  cardHeight = 320,
  deckSize = 6,
  disabled = false,
  onDraw,
}) {
  const [drawn, setDrawn] = useState(false);
  const stack = useMemo(() => Array.from({ length: deckSize }), [deckSize]);

  const handleDraw = () => {
    if (disabled || drawn) return;
    setDrawn(true);
    // 讓動畫先跑，再通知外部
    window.setTimeout(() => {
      if (onDraw) onDraw();
    }, 260);
  };

  return (
    <div style={{ display: "grid", placeItems: "center", gap: 14 }}>
      <div
        style={{
          position: "relative",
          width: cardWidth + 90,
          height: cardHeight + 50,
        }}
      >
        {/* Deck stack */}
        {stack.map((_, i) => {
          const offset = (deckSize - 1 - i) * 3;
          return (
            <motion.div
              key={i}
              style={{
                position: "absolute",
                left: 20 + offset,
                top: 12 + offset,
                width: cardWidth,
                height: cardHeight,
                borderRadius: 16,
                background: "linear-gradient(180deg, #3a4158, #2c3248)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 14px 32px rgba(0,0,0,0.45)",


              }}
              initial={{ rotate: -2 + i * 0.35 }}
              animate={{ rotate: -2 + i * 0.35 }}
              transition={{ duration: 0.2 }}
            />
          );
        })}

        {/* Top card */}
        <motion.div
          role="button"
          onClick={handleDraw}
          style={{
            position: "absolute",
            left: 20,
            top: 12,
            width: cardWidth,
            height: cardHeight,
            borderRadius: 16,
            cursor: disabled || drawn ? "default" : "pointer",
            background:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.20), rgba(255,255,255,0) 45%), linear-gradient(135deg, #5a46c8, #14aaa0)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 18px 45px rgba(0,0,0,0.32)",
            color: "white",
            display: "grid",
            placeItems: "center",
            padding: 18,
            textAlign: "center",
            fontWeight: 900,
            userSelect: "none",
          }}
          initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={
            drawn
              ? { x: 260, y: -8, rotate: 10, scale: 1.03 }
              : { x: 0, y: 0, rotate: 0, scale: 1 }
          }
          whileHover={!disabled && !drawn ? { y: -2, scale: 1.01 } : undefined}
          whileTap={!disabled && !drawn ? { scale: 0.985 } : undefined}
          transition={
            drawn
              ? { type: "spring", stiffness: 320, damping: 24, mass: 0.8 }
              : { duration: 0.15 }
          }
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 18 }}>點我抽卡</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              抽到後再翻牌看角色
            </div>
          </div>
        </motion.div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.75 }}>
        （下一步會接到翻牌）
      </div>
    </div>
  );
}
