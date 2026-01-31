const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const Checkin = require('#checkin')
const User = require("#user")

function getStartOfWeek(date) {
    const startOfWeek = new Date(date);
    // getUTCDay() = 0 (Dom) a 6 (Sab). Queremos 1 (Seg).
    const day = startOfWeek.getUTCDay();
    const daysToSubtract = (day === 0) ? 6 : (day - 1); // Se Dom(0), subtrai 6. Se Seg(1), subtrai 0.
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysToSubtract);
    return startOfWeek;
}

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("checkin")
        .setDescription("Marque uma tarefa que fez hoje!")
        .addStringOption(option => option
            .setName('objetivo')
            .setDescription('Quais foram as tarefas coumpridas de hoje? - separe por virgulas.')
            .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply()

        const userId = interaction.user.id
        const guildId = interaction.guild.id
        const task = interaction.options.getString('objetivo') || null

        const now = new Date()

        const initHoje = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
        ))

        const fimHoje = new Date(initHoje)
        fimHoje.setUTCDate(fimHoje.getUTCDate() + 1)

        try {
            const checkinFeito = await Checkin.findOne({
                userId: userId,
                guildId: guildId,
                check: {
                    $gte: initHoje,
                    $lt: fimHoje
                }
            })

            if (checkinFeito) {
                const embed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle('Ops!')
                    .setDescription(`Você já fez Check-in hoje. Tente novamente amanhã`)

                return interaction.editReply({ embeds: [embed] })
            }

            // Carrega o usuário, se não exister ele cria
            let profile = await User.findOne({ userId: userId, guildId: guildId })
            if (!profile) {
                profile = new User({
                    userId: userId,
                    guildId: guildId,
                    mesFalho: now.getUTCMonth()
                })
            }

            const mesAtual = now.getUTCMonth()
            if (profile.mesFalho !== mesAtual) {
                profile.falhas = 0
                profile.mesFalho = mesAtual
            }

            let newStreak = 1
            let falhasAdd = 0
            let streakMaintained = true
            const ultimoCheckin = profile.lastCheckin

            if (ultimoCheckin) {
                const ultimoDiaCheck = new Date(Date.UTC(
                    ultimoCheckin.getUTCFullYear(),
                    ultimoCheckin.getUTCMonth(),
                    ultimoCheckin.getUTCDate()
                ))

                const diasCheck = Math.round((initHoje.getTime() - ultimoDiaCheck.getTime()) / (1000 * 60 * 60 * 24))

                if (diasCheck === 1) {
                    newStreak = profile.currentStreak + 1
                } else if (diasCheck > 1) {
                    const diasPerdidos = diasCheck - 1

                    for (let i = 1; i <= diasPerdidos; i++) {
                        const dataCheck = new Date(ultimoDiaCheck)
                        dataCheck.setUTCDate(dataCheck.getUTCDate() + i)
                        const diaSemana = dataCheck.getUTCDay()

                        if (diaSemana !== 0) {
                            falhasAdd++
                        }
                    }

                    profile.falhas += falhasAdd;

                    if (falhasAdd > 0) {
                        newStreak = 1
                        streakMaintained = false
                    } else {
                        newStreak = profile.currentStreak + 1
                    }
                }
            }

            if (profile.falhas >= 3) {
                if (newStreak > 1) {
                    newStreak = 1
                }
            }


            const novoCheckin = new Checkin({
                userId: userId,
                guildId: guildId,
                check: now,
                objetivo: task
            })
            await novoCheckin.save()

            profile.lastCheckin = now
            profile.currentStreak = newStreak
            await profile.save()

            const inicioSemana = getStartOfWeek(initHoje)

            const CheckSemanal = await Checkin.countDocuments({
                userId, guildId,
                check: { $gte: inicioSemana }
            })


            const sucessoEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle(`✅ Check-in de ${interaction.user.username} registrado!`)
                .setThumbnail(interaction.user.displayAvatarURL())

            if (task) {
                sucessoEmbed.addFields({ name: 'Objetivos de Hoje', value: task })
            }

            sucessoEmbed.addFields(
                { name: "Sequência Atual", value: `**${newStreak}** dia(s)`, inline: true },
                { name: "Check-in Semanal", value: `**${CheckSemanal}** de 6`, inline: true },
                { name: "Falhas do Mês", value: `**${profile.falhas}** de 3`, inline: true }
            )

            if (!streakMaintained) {
                sucessoEmbed.setDescription(`Sua Sequência foi resetada para 1 dia, pois você acumulou **${falhasAdd}** falha(s)`)
            } else if (profile.falhas >= 3) {
                sucessoEmbed.setDescription('**Atenção** Você atingiu o limite de 3 falhas mensais. Sua sequência nçao pode aumentar este mês até ser resetada.')
            } else if (CheckSemanal === 6) {
                sucessoEmbed.setDescription('**Parabéns!** Você atingiu sua meta de 6 check-ins Semanais!')
            }


            return interaction.editReply({ embeds: [sucessoEmbed] })
        } catch (error) {
            console.error('Erro ao Processar check-in: ', error)
            await interaction.editReply('❌ Ocorreu um erro ao tentar registrar seu check-in.')
        }
    }
}