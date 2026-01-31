const mongoose = require('mongoose')

const checkinSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    check: { type: Date, default: Date.now }, // Vamos salvar a data e hora exata do check-in
    objetivo: { type: String, default: null }, // O campo opcional que você mencionou
})

checkinSchema.index({ userId: 1, guildId: 1 })
checkinSchema.index({ check: -1 })

module.exports = mongoose.model('Checkin', checkinSchema)