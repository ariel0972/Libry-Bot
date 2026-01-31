const { SlashCommandBuilder, MessageFlags, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ComponentType, ButtonStyle, Events, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require("discord.js")
const User = require("../database/models/habitica")
const Canvas = require('@napi-rs/canvas');
const { request, BalancedPool } = require("undici");
const { AUTHOR_ID } = process.env

const HEADERS = (u) => ({
    "x-client": `${AUTHOR_ID}-BotDiscord`,
    "x-api-user": u.habiticaUserId,
    "x-api-key": u.habiticaToken,
    'Content-Type': "application/json",
})


module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("duelo")
        .setDescription("BETA!!! Tire um duelo Habiticano com alguém")
        .addUserOption(option => option
            .setName("alvo")
            .setDescription("Com quem você irá tirar x1")
        )
        .addBooleanOption(option => option
            .setName("apostar")
            .setDescription("Aposta moedas do Habitica naprincadeira!")
        ),

    async execute(interaction) {
        const desafiante = interaction.user
        const alvo = interaction.options.getUser("alvo")
        const bet = interaction.options.getBoolean('apostar') || false

        // Verifica se está duelando com ele mesmo
        if (alvo.id === desafiante.id) {
            return interaction.reply({ content: "Você não pode duelar consigo mesmo!", flags: MessageFlags.Ephemeral });
        }

        const [dbUser1, dbUser2] = await Promise.all([
            User.findOne({ discordId: desafiante.id }),
            User.findOne({ discordId: alvo.id })
        ])

        // Verifica se o usuário e o oponente estão vinculado ao habitica no bot
        // verificação sempre cai bem
        if (!dbUser1) return interaction.reply("Voce precisa estar vinculado ao Habitica para duelar.")
        if (!dbUser2) return interaction.reply("O alvo precisa estar vinculado ao Habitica para duelar.")

        await interaction.deferReply()

        try {
            const [res1, res2] = await Promise.all([
                fetch("https://habitica.com/api/v3/user", { headers: HEADERS(dbUser1) }),
                fetch("https://habitica.com/api/v3/user", { headers: HEADERS(dbUser2) })
            ])

            if (!res1.ok || !res2.ok) return interaction.editReply("Erro ao tentar acessar o Habitica")

            // Dados dos players bocós
            const { data: data1 } = await res1.json()
            const { data: data2 } = await res2.json()

            // Objetos de Combatentes
            const combatentes = {
                [desafiante.id]: this.mapStats(desafiante, data1, dbUser1),
                [alvo.id]: this.mapStats(alvo, data2, dbUser2)
            }

            // Lógica da aposta -- algum dia eu faço
            if (bet) {

            }

            const atkId = Math.random() < 0.5 ? desafiante.id : alvo.id
            const defId = atkId === desafiante.id ? alvo.id : desafiante.id

            this.iniciarDuelo(interaction, combatentes, atkId, defId, bet)
        } catch (error) {
            console.error(error)
            interaction.editReply("Erro ao conectar com o Habitica")
        }
    },

    mapStats(user, hData, dbUser) {
        const s = hData.stats
        return {
            id: user.id,
            nome: user.displayName,
            db: dbUser,
            hp: 100,
            mp: 20 + s.int * 1.5,
            maxMP: 20 + s.int * 1.5,
            str: Math.floor(2 + s.str + s.lvl / 2),
            int: Math.floor(1 + s.str + s.lvl / 2),
            con: Math.floor(3 + s.str + s.lvl / 2),
            per: Math.floor(s.str + s.lvl / 2),
            lvl: s.lvl,
            gp: s.gp,
            classe: s.class,
            defendendo: false
        }
    },

    async iniciarDuelo(interaction, players, turnoId, oponenteId, aposta) {
        let atualId = turnoId
        let alvoId = oponenteId

        const embed = (msgAcao = "O duelo Começou!") => {
            return new EmbedBuilder()
                .setTitle("⚔️ Duelo Iniciado!")
                .setDescription(`${msgAcao}\n\nTurno de <@${atualId}>`)
                .addFields(
                    { name: players[atualId].nome, value: `❤️ HP: ${Math.max(0, players[atualId].hp.toFixed(0))}\n🔹 MP: ${Math.max(0, players[atualId].mp.toFixed(0))}`, inline: true },
                    { name: players[alvoId].nome, value: `❤️ HP: ${Math.max(0, players[alvoId].hp.toFixed(0))}\n🔹 MP:${Math.max(0, players[alvoId].mp.toFixed(0))}`, inline: true }
                )
                .setColor("#f54269")
        }

        const btns = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("atacar").setLabel("🗡️ Atacar").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("defender").setLabel("🛡️ Defender").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("curar").setLabel("💚 Curar").setStyle(ButtonStyle.Success)
        )

        const msg = await interaction.editReply({
            content: `<@${atualId}>, sua vez`,
            embeds: [embed()],
            components: [btns]
        })

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        collector.on("collect", async i => {
            if (i.user.id !== atualId) return i.reply({ content: "Espere sua vez!", flags: MessageFlags.Ephemeral })

            let log = ""
            const p1 = players[atualId]
            const p2 = players[alvoId]

            if (i.customId === "atacar") {
                let dano = Math.max(1, (Math.random() + p1.str * 0.8) - (p2.defendendo ? p2.con * 1.25 : p2.con * 0.5))
                const crit = Math.floor(Math.random() < 0.1 * (p1.per / 100))
                if (crit) dano = Math.floor(dano * 1.5)
                p2.hp -= dano
                log = `⚔️ **${p1.nome}** causou **${dano.toFixed(0)}** de dano! ${p2.defendendo ? "🛡️ defendido" : ""} ${crit ? "💥CRITICO!!" : ""}**`
                p2.defendendo = false
            }
            else if (i.customId === "defender") {
                p1.defendendo = true
                log = `🛡️ **${p1.nome}** está em posição de defesa!`
            }
            else if (i.customId === "curar") {
                if (p1.mp < 10) return i.reply({ content: "Mana insuficiente!", flags: MessageFlags.Ephemeral })
                const cura = p1.int * 0.5;
                p1.hp = Math.min(100, p1.hp + cura)
                p1.mp -= 10;
                log = `💚 **${p1.nome}** recuperou **${cura.toFixed(0)}** de HP!`
            }

            if (p2.hp <= 0) {
                collector.stop()
                return i.update({
                    content: "🏆 Fim do Duelo!",
                    embeds: [embed(`🏆 <@${atualId}> Venceu o Duelo!`)],
                    components: []
                })
            }

            [atualId, alvoId] = [alvoId, atualId]
            p1.mp = Math.min(p1.maxMP, p1.mp + 2)

            await i.update({
                content: `<@${atualId}>, sua vez`,
                embeds: [embed(log)],
                components: [btns]
            })
        })

        
    }
}