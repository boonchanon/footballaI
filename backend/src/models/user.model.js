const bcrypt = require("../../../node_modules/bcryptjs")
const mongoose = require("../../../node_modules/mongoose")

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: "" },
    favoriteTeam: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    bio: { type: String, default: "", maxlength: 280 },
    resetPasswordOtpHash: { type: String, default: "" },
    resetPasswordOtpExpiresAt: { type: Date, default: null },
    resetPasswordOtpAttempts: { type: Number, default: 0 },
    resetPasswordToken: { type: String, default: "" },
    resetPasswordExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
)

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("User", userSchema)

