import { Server } from "socket.io";
import { handleRoomSocket } from "../sockets/roomSocket.js";

export const initSocket = (server) => {

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    handleRoomSocket(io, socket);
  });

};
