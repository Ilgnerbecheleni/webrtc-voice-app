const socket = io()
const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })

const localAudio = document.getElementById("local")
const remoteAudio = document.getElementById("remote")
const callUI = document.getElementById("callUI")
const callStatus = document.getElementById("callStatus")
const volumeMeter = document.getElementById("volumeMeter")

let offerReceived = null
let callActive = false
let audioContext
let analyser
let dataArray

socket.emit("register", "suite1")

socket.on("call", async ({ from, offer }) => {
  offerReceived = offer
  callUI.style.display = "block"
  callStatus.textContent = "Chamada recebida"
  callStatus.style.backgroundColor = "#fef9c3"
  playRingtone()
})

socket.on("signal", async ({ from, data }) => {
  if (data.candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(data))
  }
})

pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("signal", { to: "recepcao", data: event.candidate })
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
    callUI.style.display = "none"
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    setTimeout(() => {
      callStatus.textContent = "Aguardando chamadas"
    }, 3000)
  }
}

async function acceptCall() {
  stopRingtone()
  callUI.style.display = "none"
  callStatus.textContent = "Conectando..."

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    localAudio.srcObject = stream
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    await pc.setRemoteDescription(new RTCSessionDescription(offerReceived))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socket.emit("signal", { to: "recepcao", data: answer })

    callStatus.textContent = "Chamada conectada"
    callStatus.style.backgroundColor = "#dcfce7"
    callActive = true
    setupAudioAnalyser()
  } catch (error) {
    console.error("Erro ao aceitar chamada:", error)
    callStatus.textContent = "Erro ao conectar"
    callStatus.style.backgroundColor = "#fee2e2"
  }
}

function rejectCall() {
  stopRingtone()
  offerReceived = null
  callUI.style.display = "none"
  callStatus.textContent = "Chamada recusada"
  callStatus.style.backgroundColor = "#fee2e2"
  socket.emit("callRejected", { to: "recepcao" })

  setTimeout(() => {
    callStatus.textContent = "Aguardando chamadas"
    callStatus.style.backgroundColor = ""
  }, 3000)
}

// Ringtone
let ringtone

function playRingtone() {
  if (!ringtone) {
    ringtone = new Audio()
    ringtone.src =
      "data:audio/wav;base64,UklGRigBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQBAADpAFgCwAMlBZEGxQfsCAwKGgssDCYNDA7nDrQPehA2EewRmBI/E+ITeBTxFGEV0BU3FpUW8RZDFzIXBxfeFrAWeBZFFhIW3RWnFXIVOBUEFdEUoBRxFEMUFRT1E9UTuhOiE4wTdxNlE1YTSxM/E0ATRBNKE1MTXxNxE4UTlxOoE7oTzBPcE+sT+RMHFBQUIRQsFDgURRRQFFoUYxRqFHAUdRR5FHsUfBR7FHoUeBR1FHIUbxRrFGcUYxRfFFoUVhRSFE4UShRHFEQUQRQ/FD0UOxQ5FDgUNxQ2FDUUNBQzFDIUMRQwFC8ULhQtFCwUKxQqFCkUKBQnFCYUJRQkFCMUIhQhFCAUHxQeFB0UHBQbFBoUGRQYFBcUFhQVFBQUExQSFBEUEBQPFA4UDRQMFAsUChQJFAgUBxQGFAUUBBQDFAIUARQAFP8T/hP9E/wT+xP6E/kT+BP3E/YT9RP0E/MT8hPxE/AT7xPuE+0T7BPrE+oT6RPo"
    ringtone.loop = true
  }
  ringtone.play().catch((e) => console.log("Erro ao tocar ringtone:", e))
}

function stopRingtone() {
  if (ringtone) {
    ringtone.pause()
    ringtone.currentTime = 0
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
