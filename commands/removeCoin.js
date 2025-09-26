const { SlashCommandBuilder, MessageFlags, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require("discord.js")
const User = require("../database/models/user");
const { AUTHOR_ID } = process.env

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("remover-moeda")
        .setDescription("[ADMIN] Remove moedas do amiguinho")
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
        const URLbase = 'https://habitica.com/api/v3'


        const dest = interaction.options.getUser('membro')
        const gold = interaction.options.getNumber('quantidade')

        const destID = await User.findOne({ discordId: dest.id })

        if (!user) {
            return await interaction.reply("❌ Você não está vinculado ao bot. Use /vincular")
        }
        else if(!destID) {
            return await interaction.reply("❌ O destinatário não está vinculado ao bot.")
        }

        const HEADERS = (userId, Token) => ({
            "x-api-user": userId,
            "x-api-key": Token,
            'Content-Type': "application/json",
            "x-client": `${AUTHOR_ID}-BotDiscord`
        })

        const resUser = await fetch(`${URLbase}/user`, {
            method: 'GET',
            headers: HEADERS(user.habiticaUserId, user.habiticaToken)
        })
        const sendData = await resUser.json()
        const userName = sendData.data.auth.local.username

        const resDest = await fetch(`${URLbase}/user`, {
            method: 'GET',
            headers: HEADERS(destID.habiticaUserId, destID.habiticaToken)
        })
        const destData = await resDest.json()
        const destGold = destData.data.stats.gp
        const destName = destData.data.auth.local.username

        const goldTotal = destGold - gold

        await fetch(`${URLbase}/user`, {
            method: 'PUT',
            headers: HEADERS(destID.habiticaUserId, destID.habiticaToken),
            body: JSON.stringify({
                "stats.gp": goldTotal < 0 ? 0 : goldTotal
            })
        })

        await fetch(`${URLbase}/groups/party/chat`, {
            method: 'POST',
            headers: HEADERS(user.habiticaUserId, user.habiticaToken),
            body: JSON.stringify({
                'message': `> @${userName} RETIROU **${gold.toFixed(2)} 🪙** DE @${destName}`
            })
        })

        await interaction.reply(`Você retirou **${gold.toFixed(2)}** de ${dest.displayName}`)
        
    }
}