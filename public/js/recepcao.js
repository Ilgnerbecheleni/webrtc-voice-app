const socket = io()
const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })

const localAudio = document.getElementById("local")
const remoteAudio = document.getElementById("remote")
const callUI = document.getElementById("callUI")
const callStatus = document.getElementById("callStatus")
const volumeMeter = document.getElementById("volumeMeter")

let callActive = false
let audioContext
let analyser
let dataArray

socket.emit("register", "recepcao")

socket.on("signal", async ({ from, data }) => {
  if (data.candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(data))
  } else if (data.type === "answer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data))
    callStatus.textContent = "Chamada conectada"
    callStatus.style.backgroundColor = "#dcfce7"
    callActive = true
    setupAudioAnalyser()
  }
})

pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("signal", { to: "suite1", data: event.candidate })
  }
}

pc.ontrack = (event) => {
  remoteAudio.srcObject = event.streams[0]
}

pc.onconnectionstatechange = () => {
  if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
    callStatus.textContent = "Chamada finalizada"
    callStatus.style.backgroundColor = ""
    callActive = false
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    setTimeout(() => {
      callStatus.textContent = "Aguardando chamadas"
    }, 3000)
  }
}

async function startCall() {
  callStatus.textContent = "Chamando suíte..."
  callStatus.style.backgroundColor = "#fef9c3"

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    localAudio.srcObject = stream
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit("call", { to: "suite1", offer })
  } catch (error) {
    console.error("Erro ao iniciar chamada:", error)
  }
}

function setupAudioAnalyser() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(remoteAudio.srcObject)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    dataArray = new Uint8Array(analyser.frequencyBinCount)
    updateVolumeMeter()
  }
}

function updateVolumeMeter() {
  if (!callActive || !analyser) return

  analyser.getByteFrequencyData(dataArray)
  let sum = dataArray.reduce((acc, val) => acc + val, 0)
  const average = sum / dataArray.length
  const volumeLevel = Math.min(100, average * 2)

  volumeMeter.style.setProperty("--volume-level", `${volumeLevel}%`)
  volumeMeter.style.background = `linear-gradient(to right, var(--primary-color) ${volumeLevel}%, var(--border-color) ${volumeLevel}%)`

  requestAnimationFrame(updateVolumeMeter)
}
