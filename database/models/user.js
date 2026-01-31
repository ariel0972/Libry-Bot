const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // ID de usuário
    guildId: { type: String, required: true }, // ID do server
    falhas: { type: Number, default: 0 }, // Contagem de falhas no mês atual
    mesFalho: { type: Number, default: () => new Date().getUTCMonth() }, // Resetar contagem no primeiro dia do mês
    lastCheckin: { type: Date, default: null }, // Data o ultimo checkin
    currentStreak: { type: Number, default: 0 }, // Sequencia atual de dias
})

userSchema.index({ userId: 1, guildId: 1 }, { unique: true })

module.exports = mongoose.model('User', userSchema)