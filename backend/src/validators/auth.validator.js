const { body } = require("express-validator")
const { ensureValidRequest } = require("../utils/validators")

const validateRegister = [
  body("name").trim().isLength({ min: 2, max: 80 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateUpdateProfile = [
  body("name").optional().trim().isLength({ min: 2, max: 80 }),
  body("avatar").optional().isString(),
  body("bio").optional().isString(),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

module.exports = { validateRegister, validateLogin, validateUpdateProfile }
