const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserProfile = require('../database/models/user');
const Checkin = require('#checkin');

function getRanking(days) {
    if (days >= 501) return { nome: "Inquebrável", emoji: "💎" };
    if (days >= 301) return { nome: "Lendário", emoji: "🌟" };
    if (days >= 201) return { nome: "Mestre do Hábito", emoji: "👑" };
    if (days >= 151) return { nome: "Imparável", emoji: "🚀" };
    if (days >= 101) return { nome: "Resistente", emoji: "🛡️" };
    if (days >= 61)  return { nome: "Focado", emoji: "🎯" };
    if (days >= 31)  return { nome: "Disciplinado", emoji: "📚" };
    return { nome: "Iniciante", emoji: "🌱" };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Exibe seu perfil de consistência e conquistas.'),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            // 1. Busca o perfil do usuário
            const profile = await UserProfile.findOne({ userId, guildId });

            if (!profile) {
                return interaction.editReply('Você ainda não tem um perfil. Comece fazendo seu primeiro `/checkin`!');
            }

            // 2. Busca o objetivo de HOJE
            const now = new Date();
            const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const endOfToday = new Date(startOfToday);
            endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

            const todayCheckin = await Checkin.findOne({
                userId, guildId,
                check: { $gte: startOfToday, $lt: endOfToday }
            });

            // 3. Calcula o Ranking
            const ranking = getRanking(profile.currentStreak);

            // 4. Monta a Embed
            const embed = new EmbedBuilder()
                .setColor(todayCheckin ? 'Green' : 'Orange')
                .setTitle(`📊 Perfil de Consistência - ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '🏆 Patente Atual', value: `${ranking.emoji} **${ranking.nome}**`, inline: true },
                    { name: '🔥 Streak Atual', value: `**${profile.currentStreak} dias**`, inline: true },
                    { name: '❌ Falhas no Mês', value: `**${profile.falhas}/3**`, inline: true }
                );

            // Adiciona o objetivo do dia se existir
            if (todayCheckin && todayCheckin.objective) {
                embed.addFields({ name: '✅ Objetivo Concluído Hoje', value: `> ${todayCheckin.objetivo}` });
            } else if (todayCheckin) {
                embed.addFields({ name: '✅ Status de Hoje', value: '> Check-in realizado (sem objetivo descrito).' });
            } else {
                embed.addFields({ name: '⚠️ Status de Hoje', value: '> Você ainda não realizou seu check-in hoje!' });
            }

            // Barra de progresso visual (Opcional - Estético)
            const progress = "🟩".repeat(Math.min(profile.currentStreak, 10)) + "⬜".repeat(Math.max(0, 10 - profile.currentStreak));
            embed.setFooter({ text: `Progresso visual: ${progress}` });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('Houve um erro ao carregar seu perfil.');
        }
    },
};