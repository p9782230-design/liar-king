import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.DEV
    ? `http://${window.location.hostname}:3001`
    : window.location.origin;

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});
