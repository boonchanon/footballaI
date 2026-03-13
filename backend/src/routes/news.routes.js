const express = require("express")

const { listNews } = require("../controllers/news.controller")

const router = express.Router()

router.get("/", listNews)

module.exports = router
