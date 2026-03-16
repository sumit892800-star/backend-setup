require("dotenv").config()

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")
const mongoose = require("mongoose")

const connectDB = require("./config/db")
const errorHandler = require("./middlewares/errorHandlers")
const limiter = require("./middlewares/rateLimiter")
const redis = require("./config/redis")

const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")

const app = express()
const cookieParser = require("cookie-parser")


connectDB()

app.use(cors())
app.use(express.json())
const isProd = process.env.NODE_ENV === "production"
app.use(helmet(isProd ? {
  hsts: {
    maxAge: 15552000,
    includeSubDomains: true
  }
} : undefined))
app.use(compression())
app.use(cookieParser())
app.use(morgan("dev"))
app.use(limiter)

app.use("/api/auth",authRoutes)
app.use("/api/users", userRoutes)

app.get("/",(req,res)=>{
  res.send("API running")
})

app.use(errorHandler)

const server = app.listen(process.env.PORT,()=>{
  console.log(`Server running on ${process.env.PORT}`)
})

const shutdown = async () => {
  server.close(() => {
    console.log("HTTP server closed")
  })

  try {
    await mongoose.connection.close(false)
    await redis.quit()
  } catch (err) {
    console.error("Shutdown error:", err)
  } finally {
    process.exit(0)
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
