const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const User = require("../database/models/user")
const { fetchHabiticaUser } = require("../utils/habiticaPlayer")

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("sacar")
        .setDescription("Saque seu dinheiro do banco do habitica")
        .addNumberOption(option => option
            .setName('quantidade')
            .setDescription('Quantidade a ser depositada')
            .setMinValue(0.01)
            .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply()

        const user = await User.findOne({ discordId: interaction.user.id })
        const qtd = interaction.options.getNumber('quantidade')

        if (!user) {
            return await interaction.editReply("Você não está vincualado ao bot! User **/vincular**")
        }

        try {
            if(qtd > user.bank) {
                return await interaction.editReply('Você nõa tem saldo o suficiente!')
            }

            const resUser = await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken)
            const userGold = resUser.stats.gp

            const goldAtual = await fetchHabiticaUser(user.habiticaUserId, user.habiticaToken, "user", "PUT", { 'stats.gp': userGold + qtd })

            user.bank -= qtd
            await user.save()

            const embed = new EmbedBuilder()
                .setColor('#77f4c7')
                .setTitle(`Banco de ${interaction.user.displayName}`)
                .setDescription(`💰 Você sacou **🪙 ${qtd.toFixed(2)}** do banco!💰`)
                .addFields(
                    { name: "Saldo no Habitica", value: `🪙 ${goldAtual.stats.gp.toFixed(2)}`, inline: true },
                    { name: "Saldo no Banco", value: `🪙 ${user.bank.toFixed(2)}`, inline: true }
                )

            await interaction.editReply({ embeds: [embed] })
        } catch (error) {
            console.error("Erro ao depositar:", error)
            await interaction.editReply('Houve um erro processar seusaque. Tente novamente.')
        }
    }
}