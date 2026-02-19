const rooms = {};

export const createRoom = (roomId) => {
  rooms[roomId] = [];
};

export const joinRoom = (roomId, socketId) => {
  if (!rooms[roomId]) return false;
  if (rooms[roomId].length >= 2) return false;

  rooms[roomId].push(socketId);
  return true;
};

export const leaveRoom = (roomId, socketId) => {
  if (!rooms[roomId]) return;

  rooms[roomId] = rooms[roomId].filter(id => id !== socketId);

  if (rooms[roomId].length === 0) {
    delete rooms[roomId];
  }
};

export const roomExists = (roomId) => {
  return !!rooms[roomId];
};
