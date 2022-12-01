import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(io, {
  auth: false,
});

function getUserCountsOfRoom(roomName) {
  return io.sockets.adapter.rooms.get(roomName)?.size;
}

function getPublicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = io;

  const publicRooms = [];

  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });

  return publicRooms;
}

io.on("connection", socket => {
  socket["nickname"] = "Anon";
  io.sockets.emit("room_change", getPublicRooms());

  socket.onAny(event => {
    console.log(`Socket Event: ${event}`);
  });

  socket.on("enter_room", (roomName, callback) => {
    console.log(roomName);
    socket.join(roomName.payload);
    callback(getUserCountsOfRoom(roomName.payload));

    socket
      .to(roomName.payload)
      .emit("welcome", socket.nickname, getUserCountsOfRoom(roomName.payload));
    io.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach(room =>
      socket
        .to(room)
        .emit("bye", socket.nickname, getUserCountsOfRoom(room) - 1)
    );
    io.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("disconnect", () => {
    io.sockets.emit("room_change", getPublicRooms());
  });

  socket.on("new_message", (message, roomName, callback) => {
    socket.to(roomName).emit("new_message", `${socket.nickname}: ${message}`);
    callback();
  });

  socket.on("nickname", nickname => (socket["nickname"] = nickname));
});

server.listen(3000, handleListen);
