require("dotenv").config()

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const morgan = require("morgan")

const connectDB = require("./config/db")
const errorHandler = require("./middlewares/errorHandlers")
const limiter = require("./middlewares/rateLimiter")

const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")

const app = express()
const cookieParser = require("cookie-parser")


connectDB()

app.use(cors())
app.use(express.json())
app.use(helmet())
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

app.listen(process.env.PORT,()=>{
  console.log(`Server running on ${process.env.PORT}`)
})