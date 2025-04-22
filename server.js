const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const path = require("path")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Configurar MIME types corretamente
app.use((req, res, next) => {
  if (req.path.endsWith(".css")) {
    res.setHeader("Content-Type", "text/css")
  } else if (req.path.endsWith(".js")) {
    res.setHeader("Content-Type", "application/javascript")
  }
  next()
})

// Serve static files
app.use(express.static(path.join(__dirname, "/")))

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public","index.html"))
})

app.get("/suite", (req, res) => {
  res.sendFile(path.join(__dirname,"public", "suite1.html"))
})

// Socket.io
const clients = {}

io.on("connection", (socket) => {
  console.log("Um usuário conectou:", socket.id)

  socket.on("register", (clientId) => {
    console.log(`Cliente ${clientId} registrado`)
    clients[clientId] = socket.id
  })

  socket.on("call", ({ to, offer }) => {
    console.log(`Chamada de ${socket.id} para ${to}`)
    if (clients[to]) {
      io.to(clients[to]).emit("call", { from: socket.id, offer })
    }
  })

  socket.on("signal", ({ to, data }) => {
    if (clients[to]) {
      io.to(clients[to]).emit("signal", { from: socket.id, data })
    }
  })

  socket.on("callRejected", ({ to }) => {
    if (clients[to]) {
      io.to(clients[to]).emit("callRejected")
    }
  })

  socket.on("disconnect", () => {
    console.log("Usuário desconectou:", socket.id)
    // Remove client from registry
    Object.keys(clients).forEach((clientId) => {
      if (clients[clientId] === socket.id) {
        delete clients[clientId]
      }
    })
  })
})

// Start server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
