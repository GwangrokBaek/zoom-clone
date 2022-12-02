import http from "http";
import SocketIO from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const server = http.createServer(app);
const io = SocketIO(server);

io.on("connection", socket => {
  socket.on("join_room", room_name => {
    socket.join(room_name);

    socket.to(room_name).emit("welcome");
  });
  socket.on("offer", (offer, room_name) => {
    socket.to(room_name).emit("offer", offer);
  });
  socket.on("answer", (answer, room_name) => {
    socket.to(room_name).emit("answer", answer);
  });
  socket.on("ice", (ice, room_name) => {
    socket.to(room_name).emit("ice", ice);
  });
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
server.listen(3000, handleListen);
