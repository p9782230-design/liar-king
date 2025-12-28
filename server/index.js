const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});


// -------------------- 題庫：從 CSV 讀取 --------------------
const CSV_PATH = path.resolve(__dirname, "questions.csv");

// 每次要用題庫時都呼叫，確保你換 CSV 後不用重開 server
function getQuestions() {
  const csvText = fs.readFileSync(CSV_PATH, "utf8");

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data || [];

  // 依照你的 CSV 欄位對應成原本的格式
  const questions = rows
  .map((r, idx) => {
    const id = String(r["題目"] || `Q${idx + 1}`).trim();

    const a = String(r["主題A"] || "").trim();
    const b = String(r["主題B"] || "").trim();
    const c = String(r["主題C"] || "").trim();

    const answer = String(r["正確主題"] || "").trim();
    const explanation = String(r["老實人解釋"] || "").trim();

    return {
      id,                 // Q1 / Q2 / Q3
      prompt: id,         // 正面顯示用
      choices: [a, b, c], // 👉 B / C / D 欄
      answer,             // 👉 E 欄（TANx / TABx）
      explanation,        // 👉 F 欄（EXPx）
    };
  })
  .filter(
    (q) =>
      q.prompt &&
      q.choices.length === 3 &&
      q.choices.every(Boolean) &&
      q.answer &&
      q.explanation
  );

  return questions;
}


function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomExcept(arr, excludedIds) {
  const ex = new Set(excludedIds || []);
  const pool = arr.filter((x) => !ex.has(x.id));
  if (pool.length === 0) return null;
  return pickRandom(pool);
}

function emitRolesForCurrentRound(roomId, room) {
  const playerIds = Object.keys(room.players);
  const q = room.round?.question;
  if (!q) return;

  for (const pid of playerIds) {
    let role = "player";
    if (pid === room.round.honestId) role = "honest";
    else if (pid === room.round.thinkerId) role = "thinker";

    io.to(pid).emit("round:role", {
      role,
      explanation: role === "honest" ? q.explanation : null,
    });
  }
}




// -------------------- Nickname 防重複 helpers --------------------
function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function isNameTaken(room, name) {
  const n = normalizeName(name);
  if (!n) return true; // 空字串也當成不合法
  return Object.values(room.players).some((p) => normalizeName(p.name) === n);
}

// -------------------- Role picking helpers --------------------
function pickOne(ids) {
  return ids[Math.floor(Math.random() * ids.length)];
}

function pickDifferent(ids, excludedId) {
  const pool = ids.filter((x) => x !== excludedId);
  return pool[Math.floor(Math.random() * pool.length)];
}

// -------------------- 房間狀態（記憶體版，MVP 夠用） --------------------
/**
 * rooms[roomId] = {
 *   hostId: socket.id,
 *   players: { [socketId]: { name } },
 *   round: { question, honestId, thinkerId } | null
 * }
 */
const rooms = {};

// -------------------- Socket.IO --------------------
io.on("connection", (socket) => {
  // 建房（主持人）
  socket.on("room:create", ({ name }, cb) => {
    const roomId = String(Math.floor(100000 + Math.random() * 900000)); // 6 位數房號
    const cleanName = String(name || "Host").trim() || "Host";

    rooms[roomId] = {
      hostId: socket.id,
      players: { [socket.id]: { name: cleanName } },
      round: null,
    };

    socket.join(roomId);
    io.to(roomId).emit("room:state", { roomId, ...rooms[roomId] });
    cb?.({ ok: true, roomId });
  });

  // 加房（玩家）
  socket.on("room:join", ({ roomId, name }, cb) => {
    
    const room = rooms[roomId];
    if (!room) return cb?.({ ok: false, error: "Room not found" });

    console.log("[room:join]", roomId, "players=", Object.keys(room.players).length);

    const cleanName = String(name || "").trim();
    if (!cleanName) return cb?.({ ok: false, error: "Name is required" });

    // ✅ 防重複暱稱（同房間）
    if (isNameTaken(room, cleanName)) {
      return cb?.({ ok: false, error: "Name already taken" });
    }

    room.players[socket.id] = { name: cleanName };
    socket.join(roomId);

    io.to(roomId).emit("room:state", { roomId, ...room });
    cb?.({ ok: true });
  });

    // 離開房（玩家）
  socket.on("room:leave", ({ roomId }, cb) => {
  const room = rooms[roomId];
  if (!room) return cb?.({ ok: true });

  if (room.players[socket.id]) {
    delete room.players[socket.id];
    socket.leave(roomId);

    // 如果主持人離開，轉 host
    if (room.hostId === socket.id) {
      const rest = Object.keys(room.players);
      room.hostId = rest[0] || null;
    }

    // 房間沒人就刪
    if (Object.keys(room.players).length === 0) {
      delete rooms[roomId];
    } else {
      io.to(roomId).emit("room:state", { roomId, ...room });
    }
  }

  cb?.({ ok: true });
});

    // 狀態同步
    socket.on("room:sync", ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb?.({ ok: false, error: "Room not found" });

    // 回傳房間狀態（給呼叫者）
    cb?.({ ok: true, state: { roomId, ...room } });

    // 也可以順便再廣播一次（可選）
    // io.to(roomId).emit("room:state", { roomId, ...room });

    // 若有正在進行的回合，補送題目 title（避免玩家剛刷新）
    if (room.round?.question) {
        io.to(socket.id).emit("round:public", {
            question: {
                id: room.round.question.id,
                title: room.round.question.prompt,
                choices: room.round.question.choices,
            },
        });


        // 也補送一次你的角色
        const pid = socket.id;
        let role = "player";
        if (pid === room.round.honestId) role = "honest";
        else if (pid === room.round.thinkerId) role = "thinker";

        io.to(pid).emit("round:role", {
        role,
        explanation: role === "honest" ? room.round.question.explanation : null,
        });
    }
    });


  // 主持人開始回合：抽題目 + 抽 honest + 抽 thinker
  socket.on("round:start", ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    if (socket.id !== room.hostId) return cb?.({ ok: false, error: "Only host can start" });

    const playerIds = Object.keys(room.players);
    if (playerIds.length < 3) {
      return cb?.({
        ok: false,
        error: "Need at least 3 players (honest + thinker + player)",
      });
    }

   



    console.log("[round:start trigger]", {
    roomId,
    starterSocket: socket.id,
    hostId: room.hostId,
    players: Object.entries(room.players).map(([id, p]) => ({
        id,
        name: p.name,
    })),
    });


    const question = pickRandom(getQuestions());


    const honestId = pickOne(playerIds);
    const thinkerId = pickDifferent(playerIds, honestId);

    room.round = { 
        question, 
        honestId, 
        thinkerId,
        usedQuestionIds: [question.id], // ✅ 記住已出過的題目
        };



         console.log("[picked]", {
        id: question.id,
        prompt: question.prompt,
        choices: question.choices,
        answer: question.answer,
        explanation: question.explanation,
    });

    // 1) 先私訊每個人角色：只有 honest 有 explanation
    for (const pid of playerIds) {
      let role = "player";
      if (pid === honestId) role = "honest";
      else if (pid === thinkerId) role = "thinker";

      io.to(pid).emit("round:role", {
        role,
        explanation: role === "honest" ? question.explanation : null,
      });
    }


    console.log("[emit round:public]", {
        id: question.id,
        title: question.prompt,
        choices: question.choices,
    });


    // 2) 再廣播公共資訊：題目 title（大家都看得到，含 thinker）
    io.to(roomId).emit("round:public", {
        question: {
            id: question.id,
            title: question.prompt,   // Q2
            choices: question.choices // [TA2, TB2, TC2]
        },  
    });


    cb?.({ ok: true });
  });

  // ✅ 主持人：這題玩過了（只重抽題目，不動角色）
  socket.on("round:skipQuestion", ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    if (socket.id !== room.hostId) return cb?.({ ok: false, error: "Only host can skip" });
    if (!room.round?.question) return cb?.({ ok: false, error: "No active round" });

    const used = room.round.usedQuestionIds || [];
    const newQ = pickRandomExcept(getQuestions(), used);


    if (!newQ) {
      return cb?.({ ok: false, error: "沒有新題目了（全玩過）" });
    }

    room.round.question = newQ;
    room.round.usedQuestionIds = [...used, newQ.id];

    // 1) 廣播新的 public 題目
    io.to(roomId).emit("round:public", {
        question: {
            id: newQ.id,
            title: newQ.prompt,
            choices: newQ.choices,
        },
    });


    // 2) 重新私訊角色資訊（同一批角色，但 honest 的 explanation 會換成新題目）
    emitRolesForCurrentRound(roomId, room);

    cb?.({ ok: true });
  });

  // ✅ 主持人：重抽角色（只重抽 honest/thinker，不動題目）
  socket.on("round:rerollRoles", ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb?.({ ok: false, error: "Room not found" });
    if (socket.id !== room.hostId) return cb?.({ ok: false, error: "Only host can reroll roles" });
    if (!room.round?.question) return cb?.({ ok: false, error: "No active round" });

    const playerIds = Object.keys(room.players);
    if (playerIds.length < 3) {
      return cb?.({ ok: false, error: "Need at least 3 players" });
    }

    const honestId = pickOne(playerIds);
    const thinkerId = pickDifferent(playerIds, honestId);

    room.round.honestId = honestId;
    room.round.thinkerId = thinkerId;

    // 私訊每個人新角色
    emitRolesForCurrentRound(roomId, room);

    cb?.({ ok: true });
  });



  // 離線處理
  socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      if (!room.players[socket.id]) continue;

      delete room.players[socket.id];

      // 主持人離線：換成第一個剩下的玩家（簡化版）
      if (room.hostId === socket.id) {
        const rest = Object.keys(room.players);
        room.hostId = rest[0] || null;
      }

      // 房間沒人：刪掉
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit("room:state", { roomId, ...room });
      }
      break;
    }
  });
});

app.get("/", (req, res) => res.send("Server OK"));

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log("listening on", PORT);
});
