const { SlashCommandBuilder, MessageFlags } = require("discord.js")
const User = require('../database/models/habitica')


module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("vincular")
        .setDescription("vincula sua conta ao habitica")
        .addStringOption(option => option
            .setName("userid")
            .setDescription("Cole seu Id de usuário do habitica")
            .setRequired(true))
        .addStringOption(option => option
            .setName("token")
            .setDescription("Cole o API Token do seu habitica aqui")
            .setRequired(true)
        ),

    async execute(interaction) {
        const discordId = interaction.user.id
        const habiticaUserId = interaction.options.getString('userid')
        const habiticaToken = interaction.options.getString('token')

        try {
            const existing = await User.findOneAndUpdate(
                { discordId },
                { habiticaUserId, habiticaToken },
                { upsert: true, new: true }
            )

            await interaction.reply({ content: "Seus dados do Habitica foram salvos com sucesso!", flags: MessageFlags.Ephemeral })
        } catch (err) {
            console.error(err)
            await interaction.reply("Erro ao salvar os dados. Tente novamente.")
        }
    }
}