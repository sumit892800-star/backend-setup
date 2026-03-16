const express = require("express")

const router = express.Router()
const {createUser, getUsers, createUserJson} = require("../controllers/userController")
const upload = require("../middlewares/uploads")
const userSchema = require("../schemas/userSchems")
const userJsonSchema = require("../schemas/userJsonSchema")
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

//just to test json upload, with json body, not file upload+++++++
router.post(
  "/create-json",
  auth,
  role("ADMIN"),
  validate(userJsonSchema),
  createUserJson
)

router.get(
  "/list",
  auth,  
  role("ADMIN"),
  getUsers
)

module.exports = router
