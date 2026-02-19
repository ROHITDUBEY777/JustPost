import {
  joinRoom,
  leaveRoom,
  roomExists
} from "../utils/roomStore.js";

export const handleRoomSocket = (io, socket) => {

  socket.on("join-room", ({ roomId }) => {

    if (!roomExists(roomId)) {
      socket.emit("error-message", "Room does not exist");
      return;
    }

    const joined = joinRoom(roomId, socket.id);

    if (!joined) {
      socket.emit("error-message", "Room full");
      return;
    }

    socket.join(roomId);
    socket.to(roomId).emit("user-joined");

    // WebRTC Signaling
    socket.on("offer", (data) => {
      socket.to(roomId).emit("offer", data);
    });

    socket.on("answer", (data) => {
      socket.to(roomId).emit("answer", data);
    });

    socket.on("ice-candidate", (data) => {
      socket.to(roomId).emit("ice-candidate", data);
    });

    socket.on("disconnect", () => {
      leaveRoom(roomId, socket.id);
      socket.to(roomId).emit("user-left");
    });

  });

};
