const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js")
const User = require("../database/models/user")
const { fetchHabiticaUser } = require("../utils/habiticaPlayer")

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("saldo")
        .setDescription("Mostra a quantidade de ouro que você tem guardado banco."),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const user = await User.findOne({ discordId: interaction.user.id })

        if (!user) {
            return await interaction.editReply("Você não está vincualado ao bot! User **/vincular**")
        }

        const resUser = await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken)
        const userGold = resUser.stats.gp

        const embed = new EmbedBuilder()
            .setColor('#ffd780')
            .setTitle(`🏦 Saldo do ${interaction.user.displayName}`)
            .addFields(
                { name: "Saldo no Habitica", value: `🪙 ${userGold.toFixed(2)}`, inline: true },
                { name: "Saldo no Banco", value: `🪙 ${user.bank.toFixed(2)}`, inline: true }
            )
            .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })

        await interaction.editReply({ embeds: [embed] })
    }
}