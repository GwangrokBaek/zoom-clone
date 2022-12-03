const socket = io();

const myFace = document.getElementById("myFace");
const muteButton = document.getElementById("mute");
const cameraButton = document.getElementById("camera");
const exitButton = document.getElementById("exit");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");
const room = document.getElementById("room");

call.style.display = "none";

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;
let myName;
let peerName;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === "videoinput");

    const currentCamera = myStream.getVideoTracks()[0];

    cameras.forEach(camera => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;

      if (currentCamera.label === camera.label) {
        option.selected = true;
      }

      camerasSelect.appendChild(option);
    });
  } catch (error) {
    console.log(error);
  }
}

async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstrains = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstrains : initialConstrains
    );
    myFace.srcObject = myStream;

    if (!deviceId) {
      await getCameras();
    }
  } catch (error) {
    console.log(error);
  }
}

function handleMuteClick() {
  myStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));

  if (!muted) {
    muteButton.innerText = "Unmute";
    muted = true;
  } else {
    muteButton.innerText = "Mute";
    muted = false;
  }
}

function handleCameraClick() {
  myStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));

  if (cameraOff) {
    cameraButton.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraButton.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

function handleExit() {
  socket.disconnect();
  socket.connect();

  welcome.hidden = false;
  room.hidden = false;
  call.style.display = "none";

  myPeerConnection.close();
  myPeerConnection = null;
  myDataChannel = null;
  peerName = null;
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value);

  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find(sender => sender.track.kind === "video");

    videoSender.replaceTrack(videoTrack);
  }
}

muteButton.addEventListener("click", handleMuteClick);
cameraButton.addEventListener("click", handleCameraClick);
exitButton.addEventListener("click", handleExit);
camerasSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  room.hidden = true;
  call.style.display = "flex";

  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input_name = welcomeForm.querySelector("#welcome_name");
  const input_room = welcomeForm.querySelector("#welcome_room");

  socket.emit("get_user_counts", input_room.value, async count => {
    if (count >= 2) {
      alert("This room is full");
    } else {
      const h3 = document.getElementById("myName");
      myName = input_name.value;
      h3.innerText = myName;

      await initCall();

      socket.emit("change_nickname", input_name.value);
      socket.emit("join_room", input_room.value);
      roomName = input_room.value;
      input_room.value = "";
    }
  });
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("modify_rooms", rooms => {
  const h3 = room.querySelector("h3");
  const roomList = room.querySelector("ul");
  h3.innerText =
    rooms.length === 1
      ? `Room List (Total : ${rooms.length} room)`
      : `Room List (Total : ${rooms.length} rooms)`;
  roomList.innerHTML = "";

  rooms.forEach(room => {
    const li = document.createElement("li");
    li.innerText = `${room.roomName} ( ${room.userCount} / 2 )`;
    roomList.appendChild(li);
  });
});

socket.on("welcome", async nickname => {
  addMessage(`${nickname} joined!`);

  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", event => {
    addMessage(`${peerName} : ${event.data}`);
  });
  console.log("made data channel");

  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer, nickname) => {
  myPeerConnection.addEventListener("datachannel", event => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", event => {
      addMessage(`${peerName} : ${event.data}`);
    });
  });

  const h3 = document.getElementById("peerName");
  peerName = nickname;
  h3.innerText = peerName;

  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

socket.on("answer", answer => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice, nickname) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);

  const h3 = document.getElementById("peerName");
  peerName = nickname;
  h3.innerText = peerName;
});

socket.on("bye", nickname => {
  addMessage(`${nickname} left the room`);

  const peerStream = document.getElementById("peerStream");
  peerStream.hidden = true;
});

// RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;

  const peerStream = document.getElementById("peerStream");
  peerStream.hidden = false;
}

// Chat Code

function addMessage(message) {
  const ul = document.getElementById("chatList");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

function handleChatSubmit(event) {
  event.preventDefault();

  const input = chatForm.querySelector("input");
  addMessage(`You : ${input.value}`);

  myDataChannel.send(input.value);
  input.value = "";
}

const chatForm = document.getElementById("chatForm");
chatForm.addEventListener("submit", handleChatSubmit);
