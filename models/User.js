const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },
  password:{
    type:String,
    required: function () {
      return this.authProvider === "LOCAL"
    },
    select:false
  },

  authProvider: {
    type: String,
    enum: ["LOCAL", "GOOGLE"],
    default: "LOCAL"
  },

  googleId: {
    type: String
  },

  role:{
    type:String,
    enum:["USER","ADMIN"],
    default:"USER"
  },

  refreshTokenHash: {
    type: String,
    select: false
  },

  avatars: [
    {
      type: String
    }
  ]

}, { timestamps: true })

userSchema.index({ role: 1 })
userSchema.index({ name: "text", email: "text" })

module.exports = mongoose.model("User", userSchema)
