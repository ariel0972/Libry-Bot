const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require("discord.js")
const User = require("../database/models/user")

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("setbanco")
        .setDescription("[ADMIN] Define o saldo do banco de um usuário.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => option
            .setName('membro')
            .setDescription('Usuário a ter o saldo modificado.')
            .setRequired(true))
        .addNumberOption(option => option
            .setName('valor')
            .setDescription('O novo saldo a ser definido')
            .setMinValue(0)
            .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.editReply('Você não tem permissão para usar esse comando!')
        }

        const target = interaction.options.getUser('membro')
        const valorNovo = interaction.options.getNumber('valor')

        const user = await User.findOne({ discordId: target.id })

        if (!user) {
            return await interaction.editReply(`O usuário @${target.username} não está vinculado ao bot.`)
        }

        const saldoAntigo = user.bank

        user.bank = valorNovo

        try {
            await user.save()

            const embed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle("Banco: Acesso de Administrador🏦")
                .setDescription(`O saldo de ${target} foi modificado com sucesso.`)
                .addFields(
                    { name: 'Usuário', value: `${target}`, inline: true },
                    { name: "Saldo antigo", value: `🪙 ${saldoAntigo.toFixed(2)}`, inline: false },
                    { name: "Novo saldo", value: `🪙 ${valorNovo.toFixed(2)}`, inline: false }
                )
                .setFooter({ text: `Modificado por: ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })

            await interaction.editReply({ embeds: [embed] })
        } catch (error) {
            console.error("Erro ao salvar o novo saldo do Banco (admin): ", error)
            await interaction.editReply("Ocorreu um erro ao salvar o novo saldo no banco de dados.")
        }
    }
}