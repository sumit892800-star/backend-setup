const express = require("express")

const router = express.Router()
const {createUser,getUsers} = require("../controllers/userController")
const upload = require("../middlewares/uploads")
const userSchema = require("../schemas/userSchems")
const validate = require("../middlewares/validate")

const auth = require("../middlewares/authMiddleware")
const role = require("../middlewares/roleMiddleware")

router.post(
   "/create",
   auth, 
   role("ADMIN"),
   upload.array("avatars", 5), //upload.single("avatar"),
   validate(userSchema),
   createUser
)

router.get(
  "/list",
  auth,  
  role("ADMIN"),
  getUsers
)

module.exports = router
