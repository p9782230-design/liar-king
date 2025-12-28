import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL || "https://liar-king-server.onrender.com";

console.log("SOCKET_URL =", SOCKET_URL);

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});
