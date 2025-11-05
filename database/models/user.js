const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  habiticaUserId: { type: String, required: true },
  habiticaToken: { type: String, required: true },
  bank: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
