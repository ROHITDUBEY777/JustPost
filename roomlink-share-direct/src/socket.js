import { io } from "socket.io-client";

export const socket = io("https://justpost-151e.onrender.com", {
  transports: ["websocket"]
});
