import { v4 as uuidv4 } from "uuid";
import { createRoom } from "../utils/roomStore.js";

export const createRoomHandler = (req, res) => {
  const roomId = uuidv4();
  createRoom(roomId);
  res.json({ roomId });
};
