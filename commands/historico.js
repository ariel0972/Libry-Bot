const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const Checkin = require('#checkin')


module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
    .setName("histórico")
    .setDescription("Veja seu histórico de check-ins realizados"),

    async execute(interaction){
        await interaction.deferReply()

        const userId = interaction.user.id
        const guildId = interaction.guild.id

        try {
            const logs = await Checkin.find({ userId, guildId })
            .sort({ check: -1 })
            .limit(15)

            if (!logs || logs.length === 0) {
                return interaction.editReply('Você ainda não realizou nenhum check-in neste servidor.')
            }

            const historyList = logs.map(log => {
                const data = log.check.toLocaleDateString('pt-BR',  {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })

                const obj = log.objetivo ? ` -*${log.objetivo}*` : ' - (Sem objetivo)'
                return `📅 **${data}**${obj}`
            }).join('\n')

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle(`📜 Histórico de Check-ins - ${interaction.user.username}`)
                .setDescription(historyList)
                .setFooter({ text: 'Exibindo os últimos 15 check-ins.' })
                .setTimestamp()

            return interaction.editReply({ embeds: [embed] })
        } catch (error) {
            console.error('Erro ao buscar histórico:', error)
            await interaction.editReply('❌ Ocorreu um erro ao tentar buscar seu histórico.')
        }
    }
}