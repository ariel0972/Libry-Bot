const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js")
const User = require("../database/models/user")

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
    .setName("saldo")
    .setDescription("Mostra a quantidade de ouro que você tem guardado banco."),

    async execute(interaction){
        await interaction.deferReply({flags: MessageFlags.Ephemeral })

        const user = await User.findOne({ discordId: interaction.user.id })

        if (!user){
            return await interaction.editReply("Você não está vincualado ao bot! User **/vincular**")
        }

        const embed = new EmbedBuilder()
            .setColor('#ffd780')
            .setTitle('💰 Saldo no Banco')
            .setDescription(`Você tem ${user.bank.toFixed(2)} 🪙 de ouro.`)
            .setAuthor({name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        
        await interaction.editReply({ embeds: [embed] })
    }
}