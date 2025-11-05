const { SlashCommandBuilder, MessageFlags, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require("discord.js")
const User = require("../database/models/user");
const { fetchHabiticaUser } = require("../utils/habiticaPlayer");
const { AUTHOR_ID } = process.env

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("adicionar-moeda")
        .setDescription("[ADMIN] Dâ moedas para o amiguinho")
        .addUserOption(option => option
            .setName("membro")
            .setDescription("Membro ao qual vai doar dinheiro")
            .setRequired(true))
        .addNumberOption(option => option
            .setName("quantidade")
            .setDescription("A quantidade de ouro que você enviará")
            .setMinValue(0.01)
            .setMaxValue(100)
            .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const user = await User.findOne({ discordId: interaction.user.id });

        const dest = interaction.options.getUser('membro')
        const gold = interaction.options.getNumber('quantidade')

        const destID = await User.findOne({ discordId: dest.id })

        if (!user) {
            return await interaction.reply("❌ Você não está vinculado ao bot. Use /vincular")
        }
        else if (!destID) {
            return await interaction.reply("❌ O destinatário não está vinculado ao bot.")
        }

        const resUser = await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken)
        const userName = resUser.auth.local.username

        const resDest = await fetchHabiticaUser(destID.habiticaUserId, destID.habiticaToken)
        const destGold = resDest.stats.gp
        const destName = resDest.auth.local.username

        const goldTotal = destGold + gold

        const msg = {
            'message': `> @${userName} adicionou **${gold.toFixed(2)} 🪙** Para @${destName}`
        }

        await fetchHabiticaUser(destID.habiticaUserId, destID.habiticaToken, 'user', 'PUT', { 'stats.gp': goldTotal })

        await interaction.reply(`Você deu **${gold.toFixed(2)}** para ${dest.displayName}`)
        
        await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken, 'groups/party/chat', 'POST', msg)

    }
}