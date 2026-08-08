const { body, param } = require("express-validator")
const { ensureValidRequest } = require("../utils/validators")

const validatePostId = [
  param("id").isInt().withMessage("Post id must be an integer"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validatePostCreate = [
  body("title").trim().isLength({ min: 4, max: 180 }).withMessage("Title must be 4 to 180 characters"),
  body("content").trim().isLength({ min: 8, max: 5000 }).withMessage("Content must be 8 to 5000 characters"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validatePostUpdate = [
  param("id").isInt().withMessage("Post id must be an integer"),
  body("title").optional().trim().isLength({ min: 4, max: 180 }).withMessage("Title must be 4 to 180 characters"),
  body("content").optional().trim().isLength({ min: 8, max: 5000 }).withMessage("Content must be 8 to 5000 characters"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateCommentCreate = [
  body("content").trim().isLength({ min: 1, max: 1000 }).withMessage("Content must be between 1 and 1000 characters"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

module.exports = {
  validatePostId,
  validatePostCreate,
  validatePostUpdate,
  validateCommentCreate,
}
