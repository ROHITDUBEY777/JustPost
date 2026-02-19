import express from "express";
import { createRoomHandler } from "../controllers/roomController.js";

const router = express.Router();

router.post("/create-room", createRoomHandler);

export default router;
