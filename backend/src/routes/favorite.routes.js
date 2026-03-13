const express = require("express")

const { createFavorite, favoriteValidation, listFavorites, listFavoritesValidation, removeFavorite, removeFavoriteValidation } = require("../controllers/favorite.controller")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/", requireAuth, listFavoritesValidation, listFavorites)
router.post("/", requireAuth, favoriteValidation, createFavorite)
router.delete("/:id", requireAuth, removeFavoriteValidation, removeFavorite)

module.exports = router
