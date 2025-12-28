import { useEffect, useMemo, useState } from "react";
import { socket } from "./lib/socket";
import FlipCard from "./components/FlipCard";
import CardDeskDraw from "./components/CardDeskDraw";
import PlayerBadge from "./components/PlayerBadge";
import Logo from "./assets/logo.png";




export default function App() {

    // 背景黃（漫畫桌遊感）
  const BG_YELLOW = "#FFD84D";

  // 字體藍（你給的那種藍）
  const TEXT_BLUE = "#1E4FBF";

  const [connected, setConnected] = useState(false);

  // room / player
  const [name, setName] = useState("p9782");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [roomState, setRoomState] = useState(null); // { roomId, hostId, players, round }

  // round info
  const [publicQuestion, setPublicQuestion] = useState(null); // {id, title}
  const [myRole, setMyRole] = useState(null); // "honest" | "player"
  const [myExplanation, setMyExplanation] = useState(null);

  // ui phases
  const [phase, setPhase] = useState("deck"); // deck | card
  const [isFlipped, setIsFlipped] = useState(false);

  const isHost = useMemo(() => {
    return roomState?.hostId && socket.id && roomState.hostId === socket.id;
  }, [roomState]);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      if (roomId) socket.emit("room:sync", { roomId }, () => {});
    };
    const onDisconnect = () => setConnected(false);

    const onRoomState = (state) => {
      console.log("[client] room:state", state);
      setRoomState(state);
      setRoomId(state.roomId);
    };

    const onRoundPublic = (payload) => {
      setPublicQuestion(payload.question);
      // 進入抽牌/翻牌流程
      setPhase("deck");
      setIsFlipped(false);
    };

    const onRoundRole = (payload) => {
      setMyRole(payload.role);
      setMyExplanation(payload.explanation);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onRoomState);
    socket.on("round:public", onRoundPublic);
    socket.on("round:role", onRoundRole);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onRoomState);
      socket.off("round:public", onRoundPublic);
      socket.off("round:role", onRoundRole);
    };
  }, []);


  const createRoom = () => {
    socket.emit("room:create", { name }, (res) => {
      if (!res?.ok) alert(res?.error || "create room failed");
      else setRoomId(res.roomId);
    });
  };

  const joinRoom = () => {
    const rid = roomIdInput.trim();
    if (!rid) return alert("請輸入房號");
    socket.emit("room:join", { roomId: rid, name }, (res) => {
      if (!res?.ok) alert(res?.error || "join room failed");
      else setRoomId(rid);
    });
  };

  const startRound = () => {
      if (!roomId) return;

    // ✅ 在本地先清掉上一回合的角色
      setPublicQuestion(null);
      setMyRole(null);
      setMyExplanation(null);
      setPhase("deck");
      setIsFlipped(false);

    socket.emit("round:start", { roomId }, (res) => {
      if (!res?.ok) alert(res?.error || "start round failed");
    });
  };

  const leaveRoom = () => {
    if (roomId) {
      socket.emit("room:leave", { roomId });
    }

    // ✅ 重置前端狀態 → 回到大廳
    setRoomId(null);
    setRoomState(null);
    setPublicQuestion(null);
    setMyRole(null);
    setMyExplanation(null);
    setPhase("deck");
    setIsFlipped(false);
  };


    // 這題玩過了：只換題目，不換角色
  const skipQuestion = () => {
    if (!roomId) return;
    socket.emit("round:skipQuestion", { roomId }, (res) => {
      if (!res?.ok) alert(res?.error || "skip question failed");
      // 成功的話 server 會再送 round:public + round:role，你前端不用手動 setState
    });
  };

  // 重抽角色：只換角色，不換題目
  const rerollRoles = () => {
    if (!roomId) return;
    // UI 小提醒：翻牌回正面，避免玩家看到舊角色卡背
    setIsFlipped(false);

    socket.emit("round:rerollRoles", { roomId }, (res) => {
      if (!res?.ok) alert(res?.error || "reroll roles failed");
      // 成功的話 server 會送 round:role 給每個人
    });
  };


    const syncRoom = () => {
      if (!roomId) return;

      socket.emit("room:sync", { roomId }, (res) => {
        if (!res?.ok) return alert(res?.error || "sync failed");

        // 更新房間狀態（玩家列表、host 等）
        setRoomState(res.state);

        // UI 上：把卡片回到抽卡階段比較合理
        setPhase("deck");
        setIsFlipped(false);
        // ⚠️ 不要清 myRole / myExplanation / publicQuestion
        // 因為 server 會補送 round:public / round:role（如果有回合）
      });
    };


  const onDrawLocal = () => {
    // 抽牌動畫結束後，顯示翻牌
    setPhase("card");
    setIsFlipped(false);
  };

  const resetRoundUI = () => {
    setPublicQuestion(null);
    setMyRole(null);
    setMyExplanation(null);
    setPhase("deck");
    setIsFlipped(false);
  };

const front = (
  <div
    style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px 18px",
      boxSizing: "border-box",
    }}
  >
    {/* 卡片最上方：固定遊戲名稱 */}
    <div
      style={{
        fontSize: 16,
        fontWeight: 950,
        letterSpacing: 1,
        opacity: 0.85,
        marginBottom: 14,
      }}
    >
      誰是唬爛王
    </div>

{/* 中央：題目（最大字） + 三個主題選項 */}
<div
  style={{
    flex: 1,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "0 6px",
    gap: 14,
  }}
>
  <div style={{ fontSize: 28, fontWeight: 950, lineHeight: 1.2 }}>
    {publicQuestion?.title || "（等待主持人開始）"}
  </div>

  {/* 三個主題：主題A / 主題B / 主題C */}
{publicQuestion?.choices?.length ? (
  <div
  style={{
    marginTop: 10,
    padding: "6px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    fontSize: 13,
    fontWeight: 900,
  }}
>
  {publicQuestion.choices.join(" / ")}
</div>
) : null}

</div>


    {/* 底部提示文字 */}
    {myRole === "thinker" ? (
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          opacity: 0.75,
          textAlign: "center",
        }}
      >
        點一下翻牌
      </div>
    ) : (
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          opacity: 0.6,
        }}
      >
        點一下翻牌
      </div>
    )}
  </div>
);


const back = (
  <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
    <div style={{ fontSize: 24, fontWeight: 950 }}>
      {myRole === "honest"
        ? "你是老實人"
        : myRole === "thinker"
        ? "你是想想"
        : myRole === "player"
        ? "一般玩家"
        : "（尚未收到角色）"}
    </div>

    {myRole === "honest" ? (
      <div
        style={{
      maxHeight: 160,              // 🔒 限制高度（可自行調 140~180）
      overflowY: "auto",           // 🔽 超過就捲動
      fontSize: 13,
      fontWeight: 800,
      lineHeight: 1.5,
      background: "rgba(0,0,0,0.15)",
      padding: 12,
      borderRadius: 12,

      // 🔽 關鍵：避免長字串撐爆
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
    }}
      >
        {myExplanation || "（等待 explanation）"}
      </div>
    ) : myRole === "thinker" ? (
      <div style={{ fontSize: 14, fontWeight: 800 }}>
        
      </div>
    ) : myRole === "player" ? (
      <div style={{ fontSize: 14, fontWeight: 800 }}>
        你只知道題目名稱，靠演技撐住。
      </div>
    ) : (
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        主持人開始回合後會收到角色
      </div>
    )}

    <div style={{ fontSize: 12, opacity: 0.75 }}>
      （只有老實人才會收到 explanation）
    </div>
  </div>
);


  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 18% 12%, rgba(255,255,255,0.55), rgba(255,255,255,0) 42%),
          radial-gradient(circle at 80% 0%, rgba(255,255,255,0.28), rgba(255,255,255,0) 40%),
          linear-gradient(180deg, #E8C75A, #DDB64F)
        `,

        color: "#243A7A",
        fontWeight: 950,
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch", 
        
        padding: 12,
        position: "relative", // ⬅️ 很重要
        overflow: "hidden",
        }}
    >

      {/* 🔴 Step 2：質感點點 overlay */}
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.12,
        backgroundImage:
          "radial-gradient(rgba(36,58,122,0.25) 1px, transparent 1px)",
        backgroundSize: "10px 10px",
        mixBlendMode: "multiply",
        zIndex: 0,
      }}
    />

      <div style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          display: "grid",
          gap: 14,
          position: "relative",
          zIndex: 1,

          // ✅ 關鍵：首頁用置中，不要被撐滿
          alignContent: roomId ? "start" : "center",
          minHeight: roomId ? "auto" : "calc(100vh - 24px)", // 24 = padding*2
        }}>
        {roomId ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* ✅ 進房後：header 小 Logo */}
              <img
                src={Logo}
                alt="誰是唬爛王"
                style={{
                  width: 44,
                  height: "auto",
                  userSelect: "none",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
                }}
              />

              <div style={{ fontWeight: 950 }}>
                誰是唬爛王
                <span
                  title={connected ? "已連線" : "未連線"}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    marginLeft: 10,
                    backgroundColor: connected ? "#4ade80" : "#f87171",
                    boxShadow: connected
                      ? "0 0 8px rgba(74,222,128,0.9)"
                      : "0 0 6px rgba(248,113,113,0.7)",
                    display: "inline-block",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={syncRoom}
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  color: "#243A7A",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                重新同步
              </button>

              <button
                onClick={leaveRoom}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  color: "#243A7A",
                  fontWeight: 950,
                  cursor: "pointer",
                  opacity: 0.9,
                }}
              >
                離開
              </button>
            </div>
          </div>
        ) : null}



        {/* 如果還沒進房：顯示開房/加房 */}
        {!roomId ? (
          <>
            {/* ✅ Logo（只在主頁） */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <img
                src={Logo}
                alt="誰是唬爛王"
                style={{
                  width: "86vw",        // ✅ 手機大
                  maxWidth: 420,        // ✅ 桌機上限
                  height: "auto",
                  userSelect: "none",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.35))",
                  animation: "logoFloat 2.6s ease-in-out infinite",
                }}
              />
            </div>

            {/* ✅ 主頁原本的 box（暱稱 / 開房 / 加房） */}
            <div
              style={{
                display: "grid",
                gap: 12,
                padding: 14,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
                borderRadius: 14,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>你的暱稱</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.25)",
                    color: "white",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={createRoom}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    color: "#243A7A",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  我是主持人｜開房
                </button>

                <div style={{ display: "flex", gap: 10, minWidth: 260, flex: 1 }}>
                  <input
                    placeholder="輸入 6 位數房號"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(0,0,0,0.25)",
                      color: "white",
                    }}
                  />
                  <button
                    onClick={joinRoom}
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      color: "#243A7A",
                      fontWeight: 950,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    加入房間
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (

          <>
            {/* 房間資訊 */}
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(235, 52, 52, 0.18)",
                backdropFilter: "blur(10px)",

                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>
                  房號：<span style={{ letterSpacing: 1 }}>{roomId}</span>
                </div>
                {/*
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  你的 socket id：{socket.id || "（未連線）"}
                </div>
                */}
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  你是：{isHost ? "主持人" : "玩家"}
                </div>
              </div>

              <div style={{ fontWeight: 900 }}>玩家列表</div>
              <div style={{ display: "grid", gap: 6 }}>
                {roomState?.players ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {Object.entries(roomState.players).map(([sid, p]) => (
                      <PlayerBadge
                        key={sid}
                        name={p.name}
                        isHost={sid === roomState.hostId}
                        isMe={sid === socket.id}
                      />
                    ))}
                  </div>
                ) : null}

              </div>

              {isHost ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {/* ✅ Primary：開始回合（全寬） */}
                  <button
                    onClick={startRound}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      background: "rgba(255,255,255,0.16)",
                      border: "1px solid rgba(255,255,255,0.22)",
                      borderRadius: 14,
                      padding: "12px 14px",
                      color: "#243A7A",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    開始回合（抽題目＋抽老實人）
                  </button>

                  {/* ✅ Secondary：回合中才顯示（兩欄、整齊） */}
                  {publicQuestion ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <button
                        onClick={skipQuestion}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.10)",
                          border: "1px solid rgba(255,255,255,0.18)",
                          borderRadius: 14,
                          padding: "12px 14px",
                          color: "#243A7A",
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        這題玩過了
                      </button>

                      <button
                        onClick={rerollRoles}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.10)",
                          border: "1px solid rgba(255,255,255,0.18)",
                          borderRadius: 14,
                          padding: "12px 14px",
                          color: "#243A7A",
                          fontWeight: 950,
                          cursor: "pointer",
                        }}
                      >
                        重抽角色
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  等主持人按「開始回合」
                </div>
              )}


            </div>

            {/* 回合抽卡 + 翻牌 */}
            {publicQuestion ? (
              phase === "deck" ? (
                <CardDeskDraw onDraw={onDrawLocal} />
              ) : (
                <div style={{ display: "grid", placeItems: "center", gap: 14 }}>
                  <FlipCard isFlipped={isFlipped} onToggle={setIsFlipped} front={front} back={back} />

                  <button
                    onClick={() => setIsFlipped((v) => !v)}
                    style={{
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      color: "#243A7A",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    {isFlipped ? "蓋牌" : "翻牌"}
                  </button>
                </div>
              )
            ) : (
              <div style={{ fontSize: 12, opacity: 0.75, textAlign: "center" }}>
                目前沒有回合。主持人按開始後，大家會收到題目 title，然後各自抽卡翻牌拿角色。
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
