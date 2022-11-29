import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sockets = [];

wss.on("connection", socket => {
  sockets.push(socket);
  socket["nickname"] = "Anon";
  console.log("Connected to Browser ✅");

  socket.on("close", () => console.log("Disconnected from the Browser ❌"));
  socket.on("message", message => {
    const messageObj = JSON.parse(message);

    switch (messageObj.type) {
      case "new_message":
        sockets.forEach(aSocket =>
          aSocket.send(
            `${socket.nickname}: ${messageObj.payload.toString("utf8")}`
          )
        );
        break;
      case "nickname":
        socket["nickname"] = messageObj.payload;
        break;
    }
  });
});

server.listen(3000, handleListen);
