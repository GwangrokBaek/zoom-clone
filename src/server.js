import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const server = http.createServer(app);
const io = SocketIO(server);

function getPublicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = io;

  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push({ roomName: key, userCount: rooms.get(key)?.size });
    }
  });

  return publicRooms;
}

io.on("connection", socket => {
  io.sockets.emit("modify_rooms", getPublicRooms());

  socket.on("get_user_counts", (room_name, done) => {
    done(io.sockets.adapter.rooms.get(room_name)?.size);
  });

  socket.on("join_room", room_name => {
    socket.join(room_name);

    io.sockets.emit("modify_rooms", getPublicRooms());

    socket.to(room_name).emit("welcome", socket.nickname);
  });

  socket.on("change_nickname", nickname => {
    socket["nickname"] = nickname;
  });

  socket.on("offer", (offer, room_name) => {
    socket.to(room_name).emit("offer", offer, socket.nickname);
  });

  socket.on("answer", (answer, room_name) => {
    socket.to(room_name).emit("answer", answer);
  });

  socket.on("ice", (ice, room_name) => {
    socket.to(room_name).emit("ice", ice, socket.nickname);
  });

  socket.on("disconnecting", nickname => {
    socket.rooms.forEach(room => {
      socket.to(room).emit("bye", socket.nickname);
    });
  });

  socket.on("disconnect", () => {
    io.sockets.emit("modify_rooms", getPublicRooms());
  });
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
server.listen(3000, handleListen);
