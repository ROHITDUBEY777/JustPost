import express from "express";
import cors from "cors";
import roomRoutes from "./routes/roomRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", roomRoutes);

app.get("/", (req, res) => {
  res.send("RoomLink Backend Running 🚀");
});

export default app;
