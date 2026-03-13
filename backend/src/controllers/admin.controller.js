const Comment = require("../models/comment.model")
const Favorite = require("../models/favorite.model")
const Prediction = require("../models/prediction.model")
const User = require("../models/user.model")
const { asyncHandler } = require("../utils/async-handler")

const dashboard = asyncHandler(async (req, res) => {
  const [users, comments, favorites, predictions] = await Promise.all([
    User.countDocuments(),
    Comment.countDocuments(),
    Favorite.countDocuments(),
    Prediction.countDocuments()
  ])

  res.json({
    stats: {
      users,
      comments,
      favorites,
      predictions
    }
  })
})

module.exports = { dashboard }
