const socket = io();

const config = document.getElementById("config");
const welcome = document.getElementById("welcome");
const room = document.getElementById("room");

const welcomeForm = welcome.querySelector("form");
const configForm = config.querySelector("form");
const leaveButton = room.querySelector("#leave");

config.hidden = true;
room.hidden = true;

let nickname;
let roomName;

function showRoom(userCounts) {
  welcome.hidden = true;
  config.hidden = false;
  room.hidden = false;
  const configNickForm = config.querySelector("#config_nick");
  configNickForm.value = nickname;

  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${userCounts})`;

  const messageForm = room.querySelector("#message");

  messageForm.addEventListener("submit", handleMessageSubmit);
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#message input");
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`You: ${input.value}`);
    input.value = "";
  });
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const inputRoom = welcomeForm.querySelector("#form_room");
  const inputNickname = welcomeForm.querySelector("#form_nick");

  socket.emit("nickname", inputNickname.value);
  nickname = inputNickname.value;

  socket.emit("enter_room", { payload: inputRoom.value }, showRoom);
  roomName = inputRoom.value;
  inputRoom.value = "";
}

function handleChangeNickname(event) {
  event.preventDefault();
  const input = config.querySelector("#config_nick");

  socket.emit("nickname", input.value);
}

function handleLeave(event) {
  event.preventDefault();
  const ul = room.querySelector("ul");
  ul.innerHTML = "";

  socket.disconnect();
  socket.connect();

  welcome.hidden = false;
  config.hidden = true;
  room.hidden = true;
}

function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

socket.on("welcome", (user, userCounts) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${userCounts})`;
  addMessage(`${user} joined!`);
});

socket.on("bye", (user, userCounts) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${userCounts})`;
  addMessage(`${user} left`);
});

socket.on("new_message", message => {
  addMessage(message);
});

socket.on("room_change", rooms => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML = "";

  if (rooms.length === 0) {
    return;
  }
  rooms.forEach(room => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
  });
});

configForm.addEventListener("submit", handleChangeNickname);
welcomeForm.addEventListener("submit", handleRoomSubmit);
leaveButton.addEventListener("click", handleLeave);
