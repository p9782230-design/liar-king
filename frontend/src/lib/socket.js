import { io } from "socket.io-client";

const SOCKET_URL = "https://liar-king-server.onrender.com";

console.log("SOCKET_URL =", SOCKET_URL);

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});
