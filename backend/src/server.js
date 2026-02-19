import http from "http";
// import dotenv from "dotenv";
import app from "./app.js";
import { initSocket } from "./config/socket.js";

// dotenv.config();

const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
