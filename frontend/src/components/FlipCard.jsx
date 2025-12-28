import { motion } from "framer-motion";
import { useState } from "react";

export default function FlipCard({
  width = 220,
  height = 320,
  front,
  back,
  isFlipped,
  onToggle,
  holdToReveal = false,
}) {
  const [holding, setHolding] = useState(false);
  const flipped = holdToReveal ? holding : isFlipped;

  return (
    <div style={{ width, height, perspective: 1200 }}>
      <motion.div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          cursor: "pointer",
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        onClick={() => !holdToReveal && onToggle?.(!isFlipped)}
        onPointerDown={() => holdToReveal && setHolding(true)}
        onPointerUp={() => holdToReveal && setHolding(false)}
        onPointerLeave={() => holdToReveal && setHolding(false)}
      >
        {/* FRONT */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: 16,
            background: "linear-gradient(180deg, #3f4763, #2a3148)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow:
            "0 22px 60px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.10)",
            outline: "1px solid rgba(255,255,255,0.06)",
            color: "white",
            display: "grid",
            placeItems: "center",
            fontSize: 20,
            fontWeight: 800,
            textShadow: "0 8px 20px rgba(0,0,0,0.45)",
            



          }}
        >
          {front}
        </div>

        {/* BACK */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            borderRadius: 16,
            background: "#f5e6b8",
            color: "#1b1b1b",
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            fontWeight: 800,
            boxShadow: "0 15px 40px rgba(0,0,0,0.35)",
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

