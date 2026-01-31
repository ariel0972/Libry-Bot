const { SlashCommandBuilder, MessageFlags, EmbedBuilder, AttachmentBuilder } = require("discord.js")
const User = require("../database/models/habitica");
const { fetchHabiticaUser } = require("../utils/habiticaPlayer");
const { AUTHOR_ID } = process.env

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("doar")
        .setDescription("Doe um pouco de ouro para um colega habiticano seu.")
        .addUserOption(option => option
            .setName("membro")
            .setDescription("Membro ao qual vai doar dinheiro")
            .setRequired(true))
        .addNumberOption(option => option
            .setName("quantidade")
            .setDescription("A quantidade de ouro que você enviará")
            .setMinValue(0.01)
            .setMaxValue(100)
            .setRequired(true)),
    async execute(interaction) {
        const user = await User.findOne({ discordId: interaction.user.id });

        const dest = interaction.options.getUser('membro')
        const gold = interaction.options.getNumber('quantidade')

        const destID = await User.findOne({ discordId: dest.id })

        if (!user) {
            return await interaction.reply("❌ Você não está vinculado ao bot. Use /vincular")
        }
        else if(!destID) {
            return await interaction.reply("❌ O destinatário não está vinculado ao bot.")
        }
        
        const resUser = await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken)
        const userGold = resUser.stats.gp
        const userName = resUser.auth.local.username
        
        if (gold > userGold) return interaction.reply("Você é Pobre! Não tem ouro o suficiente.")

        const resDest = await fetchHabiticaUser(destID.habiticaUserId, destID.habiticaToken)
        const destGold = resDest.stats.gp
        const destName = resDest.auth.local.username

        const msg = {
            'message': `> @${userName} doou **${gold.toFixed(2)} 🪙** para @${destName}`
        }

        await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken, 'user', 'PUT', {'stats.gp': userGold - gold})

        await fetchHabiticaUser(destID.habiticaUserId, destID.habiticaToken, 'user', 'PUT', {'stats.gp': destGold + gold})

        await interaction.reply(`Você doou **${gold.toFixed(2)}** para ${dest.displayName}`)
        
        await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken, 'groups/party/chat', 'post', msg)
    }
}