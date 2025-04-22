const hangupBtn = document.getElementById("hangupBtn")
const callTimer = document.getElementById("callTimer")

let timerInterval
let callStartTime

function startCallTimer() {
  callStartTime = Date.now()
  callTimer.style.display = "inline"
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000)
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0")
    const seconds = String(elapsed % 60).padStart(2, "0")
    callTimer.textContent = `⏱️ ${minutes}:${seconds}`
  }, 1000)
}

function stopCallTimer() {
  clearInterval(timerInterval)
  callTimer.textContent = ""
  callTimer.style.display = "none"
}

// Atualize dentro do `startCall()` após "chamada conectada"
pc.onconnectionstatechange = () => {
  if (pc.connectionState === "connected") {
    callStatus.textContent = "Chamada conectada"
    callStatus.style.backgroundColor = "#dcfce7"
    callActive = true
    setupAudioAnalyser()
    hangupBtn.style.display = "inline"
    startCallTimer()
  } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
    endCall()
  }
}

function endCall() {
  callStatus.textContent = "Chamada finalizada"
  callStatus.style.backgroundColor = ""
  callActive = false
  hangupBtn.style.display = "none"
  stopCallTimer()

  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  if (pc) {
    pc.getSenders().forEach((sender) => sender.track?.stop())
    pc.close()
  }

  // Recriar conexão se quiser permitir nova chamada:
  setTimeout(() => {
    window.location.reload()
  }, 1500)
}
