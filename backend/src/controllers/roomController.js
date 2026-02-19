import { createRoom } from "../utils/roomStore.js";

export const createRoomHandler = (req, res) => {
  const roomId = Math.floor(1000 + Math.random() * 9000).toString();
  createRoom(roomId);
  res.json({ roomId });
};
