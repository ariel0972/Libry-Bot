const { SlashCommandBuilder, MessageFlags, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ComponentType, ButtonStyle, Events, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require("discord.js")
const User = require("../database/models/user")
const Canvas = require('@napi-rs/canvas');
const { captureAvatar } = require("../Habitica_avatar");
const { request, BalancedPool } = require("undici");
const { AUTHOR_ID } = process.env



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
            .setName("contra-bot")
            .setDescription("Contra um robô?")
        )
        .addStringOption(option => option
            .setName("dificuldade")
            .setDescription("adiciona dificuldade ao duelo com o bot")
            .addChoices(
                { name: 'Fácil', value: 'facil' },
                { name: 'Médio', value: 'medio' },
                { name: 'Difícil', value: 'dificil' },
            )
        )
        .addBooleanOption(option => option
            .setName("apostar")
            .setDescription("Aposta moedas do Habitica naprincadeira!")
        ),

    async execute(interaction) {
        const desafiante = interaction.user
        const alvo = interaction.options.getUser("alvo");
        const user = await User.findOne({ discordId: desafiante.id });
        const contraBot = interaction.options.getBoolean("contra-bot") || false;
        const dif = interaction.options.getString("dificuldade") || "médio"
        const bet = interaction.options.getBoolean('apostar') || false

        let oponente = null
        // Verifica se está duelando com ele mesmo
        if (alvo && alvo.id === desafiante.discordId) {
            return interaction.reply({ content: "Você não pode duelar consigo mesmo!", flags: MessageFlags.Ephemeral });
        }


        oponente = await User.findOne({ discordId: alvo.id })
        // Verifica se o usuário e o oponente estão vinculado ao habitica no bot
        if (!user) return interaction.reply("Você precisa estar vinculado ao Habitica para duelar.");
        if (!oponente) return interaction.reply("O jogador precisa estar vinculado ao Habitica para duelar.")

        // Se deus quiser essa bomba funciona
        const HEADERS = (userId, Token) => ({
            "x-client": `${AUTHOR_ID}-BotDiscord`,
            "x-api-user": userId,
            "x-api-key": Token,
            'Content-Type': "application/json",
        })

        const res1 = await fetch("https://habitica.com/api/v3/user", { headers: HEADERS(user.habiticaUserId, user.habiticaToken) });
        const data = await res1.json();

        const resAlvo = await fetch("https://habitica.com/api/v3/user", { headers: HEADERS(oponente.habiticaUserId, oponente.habiticaToken) });
        const dataAlvo = await resAlvo.json();

        // Objeto dos jogadores
        const stats = {
            [desafiante.id]: {
                nome: desafiante.displayName,
                habitica: user,
                id: desafiante.id,
                hp: 100,
                mp: {
                    atual: 20 + data.data.stats.int * 1.5,
                    max: 20 + data.data.stats.int * 1.5,
                },
                cd: 0,
                classe: data.data.stats.class,
                for: Math.floor(2 + data.data.stats.str + data.data.stats.lvl / 2),
                int: Math.floor(1 + data.data.stats.int + data.data.stats.lvl / 2),
                con: Math.floor(3 + data.data.stats.con + data.data.stats.lvl / 2),
                per: Math.floor(data.data.stats.per + data.data.stats.lvl / 2),
                lvl: data.data.stats.lvl,
                gp: data.data.stats.gp,
                defendendo: false,
                magia: {
                    fireBall: false,
                    etérea: false,
                    atordoar: false,
                    smash: false,
                    HighDef: false,
                    doubleSmash: false,
                    stealth: false,
                    picpocket: false,
                    critHit: false,
                    overHeal: false,
                    moreDef: false,
                    blessing: false,
                },
            },
            [contraBot ? "BOT" : alvo.id]: contraBot
                ? (() => {
                    const atrBot = {
                        simples: { hp: 50, mp: 10, for: 6, int: 6, con: 8, per: 6, lvl: 10 },
                        facil: { hp: 60, mp: 25, for: 10, int: 12, con: 12, per: 11, lvl: 25 },
                        medio: { hp: 75, mp: 40, for: 20, int: 22, con: 24, per: 22, lvl: 50 },
                        dificil: { hp: 100, mp: 60, for: 25, int: 28, con: 36, per: 35, lvl: 70 },
                        desafiador: { hp: 120, mp: 90, for: 35, int: 34, con: 45, per: 50, lvl: 100 },
                    };

                    const config = atrBot[dif];

                    return {
                        nome: "🤖 Bot Habitican",
                        habitica: null,
                        id: "BOT",
                        hp: config.hp,
                        mp: config.mp,
                        cd: 0,
                        for: config.for,
                        int: config.int,
                        con: config.con,
                        per: config.per,
                        lvl: config.lvl,
                        defendendo: false,
                        magia: {
                            fireBall: false,
                            etérea: false,
                            atordoar: false,
                            smash: false,
                            HighDef: false,
                            doubleSmash: false,
                            stealth: false,
                            picpocket: false,
                            critHit: false,
                            overHeal: false,
                            moreDef: false,
                            blessing: false,
                        },
                    };
                })()
                : {
                    nome: alvo.displayName,
                    habitica: oponente,
                    id: alvo.id,
                    hp: 100,
                    mp: {
                        atual: 20 + dataAlvo.data.stats.int * 1.5,
                        max: 20 + dataAlvo.data.stats.int * 1.5,
                    },
                    cd: 0,
                    classe: dataAlvo.data.stats.class,
                    for: Math.floor(2 + dataAlvo.data.stats.str + dataAlvo.data.stats.lvl / 2),
                    int: Math.floor(2 + dataAlvo.data.stats.int + dataAlvo.data.stats.lvl / 2),
                    con: Math.floor(2 + dataAlvo.data.stats.con + dataAlvo.data.stats.lvl / 2),
                    per: Math.floor(2 + dataAlvo.data.stats.per + dataAlvo.data.stats.lvl / 2),
                    lvl: dataAlvo.data.stats.lvl,
                    gp: dataAlvo.data.stats.gp,
                    defendendo: false,
                    magia: {
                        fireBall: false,
                        etérea: false,
                        atordoar: false,
                        smash: false,
                        HighDef: false,
                        doubleSmash: false,
                        stealth: false,
                        picpocket: false,
                        critHit: false,
                        overHeal: false,
                        moreDef: false,
                        blessing: false,
                    },
                },
        }

        /* -----[Magia]------ */
        function magic(classe, lvl) {
            const classSkil = {
                wizard: [
                    ...(lvl >= 15 ? [{ id: 'fireball', label: "🔥 Fire Ball" }] : []),
                    ...(lvl >= 30 ? [{ id: 'eter', label: "🌀 Força Etérea - Beta" }] : []),
                    ...(lvl >= 50 ? [{ id: 'stun', label: "💢 Atordoar - BETA" }] : []),
                ],
                warrior: [
                    ...(lvl >= 12 ? [{ id: 'smash', label: "💥 Golpe Brutal" }] : []),
                    ...(lvl >= 25 ? [{ id: 'highdef', label: "🛡️ Defesa Elevada" }] : []),
                    ...(lvl >= 40 ? [{ id: 'doublesmash', label: "⚔️ Golpe Duplo" }] : []),
                ],
                healer: [
                    ...(lvl >= 10 ? [{ id: 'overheal', label: "💚 Over Heal" }] : []),
                    ...(lvl >= 25 ? [{ id: 'moredef', label: "🛡️ Escudo Protetor" }] : []),
                    ...(lvl >= 45 ? [{ id: 'blessing', label: "✨ Benção" }] : []),
                ],
                rogue: [
                    ...(lvl >= 12 ? [{ id: 'stealth', label: "💨 Furtividade" }] : []),
                    ...(lvl >= 30 ? [{ id: 'picpocket', label: "🤏 Mãos Ladras" }] : []),
                    ...(lvl >= 42 ? [{ id: 'crithit', label: "💥 Golpe Critico" }] : []),
                ]
            }

            const skills = classSkil[classe.toLowerCase()] || []

            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("magia_select")
                    .setPlaceholder("🪄 Escolha sua magia ✨")
                    .addOptions(skills.map(skill => ({
                        label: skill.label,
                        value: skill.id
                    })))
            )
        }

        let turno = null
        let coroa = null
        let cara = null

        /* ---[Aposta]--- */

        let aposta = 0
        if (bet && alvo) {
            const createBetModal = (id) => {
                return new ModalBuilder()
                    .setCustomId(id)
                    .setTitle("Apostas 💰")
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("valor")
                                .setLabel("Quanto você quer apostar?")
                                .setStyle(TextInputStyle.Short)
                                .setMinLength(1)
                                .setMaxLength(5)
                                .setRequired(true)
                        )
                    );
            }

            await interaction.showModal(createBetModal('aposta_player1'))
            const submit1 = await interaction.awaitModalSubmit({ filter: i => i.customId === "aposta_player1" && i.user.id === desafiante.id, time: 50000 })
            const bet = submit1.fields.getTextInputValue('valor')
            await submit1.reply({ content: `Aposta registrada: ${bet} moedas!`, flags: MessageFlags.Ephemeral })

            const resposta = await interaction.followUp({ content: `<@${alvo.id}> sua vez de apostar.` })
            console.log(`Antes da Aposta \n\nOuro ${stats[desafiante.id].nome}: ${stats[desafiante.id].gp} \nOuro ${stats[alvo.id].nome}: ${stats[alvo.id].gp}\n`)

            const msg = await interaction.channel.send({
                content: `<@${alvo.id}> clique abaixo para apostar.`, components: [new ActionRowBuilder()
                    .addComponents(new ButtonBuilder().setCustomId("modal_alvo").setLabel("Apostar").setStyle(ButtonStyle.Primary)
                    )]
            })

            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 35000 })
            collector.on("collect", async btn => {
                if (btn.user.id !== alvo.id) return btn.reply({ content: "Só o oponente pode apostar agora!", flags: MessageFlags.Ephemeral })
                await btn.showModal(createBetModal("aposta_player2"))
            })
            collector.on("end", (_, reason) => {
                if (reason === "time") {
                    interaction.followUp(`O <@${alvo.id}> tá pobre💸! Enrolou⌚ tanto pra responder que até fugiu 💨`)
                }
            })

            const submit2 = await interaction.awaitModalSubmit({ filter: i => i.customId === "aposta_player2" && i.user.id === alvo.id, time: 60000 })
            const betAlvo = submit2.fields.getTextInputValue('valor')
            await submit2.reply({ content: `Aposta registrada: ${betAlvo} moedas`, flags: MessageFlags.Ephemeral })

            await fetch("https://habitica.com/api/v3/user", {
                method: 'put',
                headers: HEADERS(user.habiticaUserId, user.habiticaToken),
                body: JSON.stringify({
                    "stats.gp": stats[desafiante.id].gp - Number(bet)
                })
            });

            await fetch("https://habitica.com/api/v3/user", {
                method: 'put',
                headers: HEADERS(oponente.habiticaUserId, oponente.habiticaToken),
                body: JSON.stringify({
                    "stats.gp": stats[alvo.id].gp - Number(betAlvo)
                })
            });
            aposta = Number(bet) + Number(betAlvo)


            await msg.edit(`**Temos ${aposta} Moedas** de aposta total!`)

            console.log(`Depois da Aposta \n\nOuro ${stats[desafiante.id].nome}: ${stats[desafiante.id].gp} \nOuro ${stats[alvo.id].nome}: ${stats[alvo.id].gp}`)
            aposta = Math.floor((Number(bet) + Number(betAlvo)) * 1.2)

            setInterval(async () => {
                await resposta.delete().catch(() => { });
                await msg.delete().catch(() => { });
            }, 2000)

            /* --[Cara ou Coroa]-- */
            const coinEmbed = new EmbedBuilder()
                .setDescription(`🪙 <@${alvo.id}>, escolha **Cara ou Coroa**!!`)
                .setColor('#ffbe5d')

            const flipCoin = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("cara").setLabel("🪙 Cara").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('coroa').setLabel("👑 Coroa").setStyle(ButtonStyle.Secondary),
            )

            let msgCoin = null
            let escolha = null
            let resultado = null

            if (contraBot) {
                const options = ['cara', 'coroa']
                escolha = options[Math.floor(Math.random() * 2)]
                resultado = options[Math.floor(Math.random() * 2)]
                turno = escolha === resultado ? desafiante.id : stats["BOT"]
                coroa = turno
                cara = turno === desafiante.id ? stats["BOT"] : desafiante.id

                if (turno === "BOT") {
                    setTimeout(async () => {
                        if (stats['BOT'].cd > 0) {
                            stats["BOT"].cd--
                            textoBot = `🤖 O Bot está em Cooldown`;
                        }

                        let acao = "atacar"

                        let textoBot = "";
                        if (acao === "atacar") {
                            let dano = Math.floor(Math.random() * 5 + desafiado.for * 0.8)
                            const crit = Math.random() < 0.15
                            if (crit) dano = Math.floor(dano * 1.5)
                            const def = player.defendendo ? player.con * 1.5 : player.con
                            const danoFinal = Math.max(0, dano - def)
                            player.hp -= danoFinal;
                            player.defendendo = false
                            textoBot = `🤖 O Bot atacou e causou **${danoFinal} de dano!. ${crit ? "💥 CRITICO" : ""} **`
                        }

                        turno = player.id;
                        duelEmbed.setDescription(`${textoBot}\n\nTurno de <@${turno}>`);
                        duelEmbed.spliceFields(0, 2,
                            { name: player.nome, value: `❤️ ${Math.max(0, player.hp)} HP`, inline: true },
                            { name: desafiado.nome, value: `❤️ ${Math.max(0, desafiado.hp)} HP`, inline: true }
                        );

                        await msg.edit({ embeds: [duelEmbed] });
                    }, 2000)
                }
            } else {
                msgCoin = await interaction.channel.send({
                    content: `<@${alvo.id}>`,
                    embeds: [coinEmbed],
                    components: [flipCoin],
                })

                const colectorCoin = msgCoin.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 })

                await new Promise((resolve) => {
                    colectorCoin.on('collect', async (btn) => {
                        if (btn.user.id !== alvo.id) {
                            return btn.reply({ content: "Só o oponente pode escolher!", flags: MessageFlags.Ephemeral })
                        }

                        escolha = btn.customId
                        resultado = Math.random() < 0.5 ? "cara" : "coroa"
                        turno = resultado === escolha ? stats[alvo.id].id : desafiante.id
                        coroa = turno
                        cara = resultado === desafiante.id ? alvo.id : desafiante.id

                        coinEmbed.setDescription(`🪙 A moeda caiu em **${resultado.toUpperCase()}!!**\n <@${turno}> começa o duelo!`)

                        await btn.update({
                            embeds: [coinEmbed],
                            components: []
                        })
                        setInterval(async () => {
                            await msgCoin.delete().catch(() => { })
                        }, 500)
                        resolve()
                    })

                    colectorCoin.on("end", (_, reason) => {
                        if (reason === "time" && !turno) {
                            interaction.followUp("O duelo foi cancelado, o oponente não escolher cara ou coroa a tempo.")
                            resolve()
                        }
                    })
                })

                if (!turno) return
            }
        } else {
            await interaction.deferReply()
            /* --[Cara ou Coroa]-- */
            const coinEmbed = new EmbedBuilder()
                .setDescription(`🪙 <@${alvo.id}>, escolha **Cara ou Coroa**!!`)
                .setColor('#ffbe5d')

            const flipCoin = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("cara").setLabel("🪙 Cara").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('coroa').setLabel("👑 Coroa").setStyle(ButtonStyle.Secondary),
            )

            let msgCoin = null
            let escolha = null
            let resultado = null

            if (contraBot) {
                const options = ['cara', 'coroa']
                escolha = options[Math.floor(Math.random() * 2)]
                resultado = options[Math.floor(Math.random() * 2)]
                turno = escolha === resultado ? desafiante.id : stats["BOT"]
                coroa = turno
                cara = turno === desafiante.id ? stats["BOT"] : desafiante.id

                if (turno === "BOT") {
                    setTimeout(async () => {
                        if (stats['BOT'].cd > 0) {
                            stats["BOT"].cd--
                            textoBot = `🤖 O Bot está em Cooldown`;
                        }

                        let acao = "atacar"

                        let textoBot = "";
                        if (acao === "atacar") {
                            let dano = Math.floor(Math.random() * 5 + desafiado.for * 0.8)
                            const crit = Math.random() < 0.15
                            if (crit) dano = Math.floor(dano * 1.5)
                            const def = player.defendendo ? player.con * 1.5 : player.con
                            const danoFinal = Math.max(0, dano - def)
                            player.hp -= danoFinal;
                            player.defendendo = false
                            textoBot = `🤖 O Bot atacou e causou **${danoFinal} de dano!. ${crit ? "💥 CRITICO" : ""} **`
                        }

                        turno = player.id;
                        duelEmbed.setDescription(`${textoBot}\n\nTurno de <@${turno}>`);
                        duelEmbed.spliceFields(0, 2,
                            { name: player.nome, value: `❤️ ${Math.max(0, player.hp)} HP`, inline: true },
                            { name: desafiado.nome, value: `❤️ ${Math.max(0, desafiado.hp)} HP`, inline: true }
                        );

                        await msg.edit({ embeds: [duelEmbed] });
                    }, 2000)
                }
            } else {
                msgCoin = await interaction.editReply({
                    content: `<@${alvo.id}>`,
                    embeds: [coinEmbed],
                    components: [flipCoin],

                })

                const colectorCoin = msgCoin.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 })

                await new Promise((resolve) => {
                    colectorCoin.on('collect', async (btn) => {
                        if (btn.user.id !== alvo.id) {
                            return btn.reply({ content: "Só o oponente pode escolher!", flags: MessageFlags.Ephemeral })
                        }

                        escolha = btn.customId
                        resultado = Math.random() < 0.5 ? "cara" : "coroa"
                        turno = resultado === escolha ? stats[alvo.id].id : desafiante.id
                        coroa = turno
                        cara = resultado === desafiante.id ? alvo.id : desafiante.id

                        coinEmbed.setDescription(`🪙 A moeda caiu em **${resultado.toUpperCase()}!!**\n <@${turno}> começa o duelo!`)

                        await btn.update({
                            embeds: [coinEmbed],
                            components: []
                        })
                        setInterval(async () => {
                            await msgCoin.delete().catch(() => { })
                        }, 500)
                        resolve()
                    })

                    colectorCoin.on("end", (_, reason) => {
                        if (reason === "time" && !turno) {
                            interaction.followUp("O duelo foi cancelado, o oponente não escolher cara ou coroa a tempo.")
                            resolve()
                        }
                    })
                })

                if (!turno) return
            }
        }

        let duelEmbed = new EmbedBuilder()
            .setTitle("⚔️ Duelo Iniciado!")
            .setDescription(`Turno de <@${turno}>`)
            .addFields(
                { name: stats[desafiante.id].nome, value: `❤️ ${Math.max(0, stats[desafiante.id].hp)} HP \n🔹${Math.max(0, stats[desafiante.id].mp.atual)} MP`, inline: true },
                { name: stats[alvo.id].nome, value: `❤️ ${Math.max(0, stats[alvo.id].hp)} HP \n🔹${Math.max(0, stats[alvo.id].mp.atual)} MP`, inline: true }
            )
            .setColor("#f54269")
            .setFooter({ text: `${stats[alvo.id].id == "BOT" ? `Dificuldade: ${dif}` : " "}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("atacar").setLabel("🗡️ Atacar").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("defender").setLabel("🛡️ Defender").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("curar").setLabel("💚 Curar").setStyle(ButtonStyle.Success)
        )

        const msg = await interaction.channel.send({ content: `Turno de ${turno == desafiante.id ? `<@${turno}>` : "BOT"}`, embeds: [duelEmbed], components: [row] });

        async function iniciarDuelo() {

        }
        async function flipCoin() {

        }
        async function apostar() {

        }
        async function jogadorAtual() {

        }
        async function inimigo() {

        }

        const magicCollector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 300000 })
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });
        let regen = 2

        // ----[ Magias ]---- 
        magicCollector.on("collect", async (select) => {
            if (select.user.id !== turno) {
                return select.reply({ content: "Não é seu turno!", ephemeral: true });
            }

            const jogadorAtual = turno;
            const inimigo = jogadorAtual === desafiante.id ? alvo.id : desafiante.id;

            let resultado = "";

            const player1 = stats[jogadorAtual]
            const player2 = stats[inimigo]

            const classe = stats[jogadorAtual].classe
            const lvl = stats[jogadorAtual].lvl

            if (select.values[0] === "fireball") {
                if (player1.mp.atual < 25) {
                    await select.reply({ content: `Sem mana o suficiente`, flags: MessageFlags.Ephemeral })
                    return
                }
                if (player1.cd > 0 && player1.magia.fireBall === true) {
                    resultado = `<@${jogadorAtual}> tentou usar Bola de fogo, mas ficou sem força.`
                    if (player1.cd = 0) player1.magia.fireBall = false
                } else {
                    let dano = Math.floor(Math.random() * 2 + player1.int * 0.9);
                    const crit = Math.floor(Math.random() < 0.25 * (player1.per / 100))
                    if (crit) dano = Math.floor(dano * 1.5)
                    const def = player2.defendendo ? player2.con * 1.2 : player2.con * 0.6
                    const danoFinal = Math.floor(Math.max(0, dano - def))
                    player2.hp -= danoFinal;
                    resultado = `**<@${jogadorAtual}> Usou uma Bola de Fogo 🔥 causou ${danoFinal} de dano! ${player2.defendendo ? "🛡️ Defendido" : ""} ${crit ? "💥CRITICO MÁGICO🪄!!" : ""}**`;

                    player2.defendendo = false

                    player1.mp.atual -= 25
                    if (player1.mp.atual < 0) player1.mp.atual = 0
                    player1.cd = 2
                    player1.magia.fireBall = true
                }
            }

            // Verifica vitória 🏆
            if (player2.hp <= 0) {
                magicCollector.stop()
                collector.stop()
                const finalEmbed = new EmbedBuilder()
                    .setTitle("🏆 Vitória!")
                    .setDescription(`<@${jogadorAtual}> venceu o duelo!`)
                    .addFields(
                        { name: stats[desafiante.id].nome, value: `❤️ ${Math.max(0, stats[desafiante.id].hp)} HP`, inline: true },
                        { name: stats[alvo.id].nome, value: `❤️ ${Math.max(0, stats[alvo.id].hp)} HP`, inline: true }
                    )
                    .setColor("#57F287");

                if (bet) {
                    await fetch("https://habitica.com/api/v3/user", {
                        method: 'put',
                        headers: HEADERS(stats[jogadorAtual].habitica.habiticaUserId, stats[jogadorAtual].habitica.habiticaToken),
                        body: JSON.stringify({
                            "stats.gp": stats[jogadorAtual].gp + aposta
                        })
                    });
                }
                return select.update({ embeds: [finalEmbed], components: [] });
            }

            // Troca turno
            turno = inimigo;

            // Atualiza embed
            duelEmbed.setDescription(`${resultado}\n\nTurno de ${turno === "BOT" ? nomeOponente : `<@${turno}>`}`);
            duelEmbed.spliceFields(0, 2,
                { name: stats[desafiante.id].nome, value: `❤️ ${Math.max(0, stats[desafiante.id].hp)} HP \n🔹${Math.max(0, stats[desafiante.id].mp.atual)} MP`, inline: true },
                { name: stats[alvo.id].nome, value: `❤️ ${Math.max(0, stats[alvo.id].hp)} HP \n🔹${Math.max(0, stats[alvo.id].mp.atual)} MP`, inline: true }
            );

            await select.update({ content: `<@${turno}>`, embeds: [duelEmbed], components: [row, magic(classe, lvl)] });
        })

        collector.on("collect", async (btn) => {
            if (btn.user.id !== turno) {
                return btn.reply({ content: "Não é seu turno!", ephemeral: true });
            }

            const jogadorAtual = turno;
            const inimigo = jogadorAtual === desafiante.id ? alvo.id : desafiante.id;

            let resultado = "";

            const player1 = stats[jogadorAtual]
            const player2 = stats[inimigo]

            const classe = stats[jogadorAtual].classe
            const lvl = stats[jogadorAtual].lvl

            if (btn.customId === "atacar") {
                let dano = Math.floor(Math.random() * 5 + player1.for * 0.8);
                const crit = Math.floor(Math.random() < 0.1 * (player1.per / 100))
                if (crit) dano = Math.floor(dano * 1.5)
                const def = player2.defendendo ? player2.con * 1.5 : player2.con * 0.6
                const danoFinal = Math.floor(Math.max(0, dano - def))
                player2.hp -= danoFinal;
                resultado = `**<@${jogadorAtual}> atacou e causou ${danoFinal} de dano! ${player2.defendendo ? "🛡️ defendido" : ""} ${crit ? "💥CRITICO!!" : ""}**`;

                player2.defendendo = false

            } else if (btn.customId === "defender") {
                player1.defendendo = true
                resultado = `**<@${jogadorAtual}> se defende!**`;

            } else if (btn.customId === "curar") {
                if (player1.mp.atual < 10) {
                    await btn.reply({ content: `Sem mana o suficiente`, flags: MessageFlags.Ephemeral })
                    return
                }
                if (player1.hp >= 100) {
                    await btn.reply({ content: `Você está com o HP cheio!`, flags: MessageFlags.Ephemeral })
                    return
                }

                const cura = Math.floor(Math.random() + player1.con * 0.6);

                player1.hp += cura;
                if (player1.hp > 100) player1.hp = 100;

                player1.mp.atual -= 10
                if (player1.mp.atual < 0) player1.mp.atual = 0;

                resultado = `<@${jogadorAtual}> recuperou **${cura} de Hp❤️!**`;
            }

            // regen de Mana
            if (regen <= 0 && player1.mp.atual < player1.mp.max) {
                player1.mp.atual += Math.floor(1 + player1.int * 0.2)

                if (player1.mp.atual > player1.mp.max) player1.mp.atual = player1.mp.max
                regen += 2
            }
            regen--

            // Verifica vitória 🏆
            if (player2.hp <= 0) {
                collector.stop();
                magicCollector.stop()
                const finalEmbed = new EmbedBuilder()
                    .setTitle("🏆 Vitória!")
                    .setDescription(`<@${jogadorAtual}> venceu o duelo!`)
                    .addFields(
                        { name: stats[desafiante.id].nome, value: `❤️ ${Math.max(0, stats[desafiante.id].hp)} HP`, inline: true },
                        { name: stats[alvo.id].nome, value: `❤️ ${Math.max(0, stats[alvo.id].hp)} HP`, inline: true }
                    )
                    .setColor("#57F287");

                if (bet) {
                    await fetch("https://habitica.com/api/v3/user", {
                        method: 'put',
                        headers: HEADERS(stats[jogadorAtual].habitica.habiticaUserId, stats[jogadorAtual].habitica.habiticaToken),
                        body: JSON.stringify({
                            "stats.gp": stats[jogadorAtual].gp + aposta
                        })
                    });
                }
                return btn.update({ embeds: [finalEmbed], components: [] });
            }

            // Troca turno
            turno = inimigo;

            // Atualiza embed
            duelEmbed.setDescription(`${resultado}\n\nTurno de ${turno === "BOT" ? nomeOponente : `<@${turno}>`}`);
            duelEmbed.spliceFields(0, 2,
                { name: stats[desafiante.id].nome, value: `❤️ ${Math.max(0, stats[desafiante.id].hp)} HP \n🔹${Math.max(0, stats[desafiante.id].mp.atual)} MP`, inline: true },
                { name: stats[alvo.id].nome, value: `❤️ ${Math.max(0, stats[alvo.id].hp)} HP \n🔹${Math.max(0, stats[alvo.id].mp.atual)} MP`, inline: true }
            );

            await btn.update({ content: `<@${turno}>`, embeds: [duelEmbed], components: [row, magic(classe, lvl)] });

            // BOT joga automaticamente
            if (turno === "BOT") {
                setTimeout(async () => {
                    if (cd['BOT'] > 0) {
                        cd['BOT']--
                        resultado = `🤖 O Bot está em Cooldown`;
                        return
                    }

                    let acao = "atacar"
                    if (dif === "dificil" && hp["BOT"] <= 40 && Math.random() < 0.55) acao = "furia"
                    if (furia['BOT'].ativa === true && Math.random() < 0.99) acao = "furia"
                    if (hp["BOT"] <= 50 && Math.random() < 0.50) acao = "defender"
                    if (hp["BOT"] <= 30 && Math.random() < 0.65) acao = "curar"
                    if (hp[desafiante.id] <= 55 && Math.random() < 0.8) acao = "fire ball"

                    let textoBot = "";
                    if (acao === "atacar") {
                        let dano = Math.floor(Math.random() * 5 + strBot * 0.8)
                        const crit = Math.random() < 0.15
                        if (crit) dano = Math.floor(dano * 1.5)
                        const def = defBuff[desafiante.id] ? conJogador * 1.5 : conJogador
                        const danoFinal = Math.max(0, dano - def)
                        console.log("Def jogador: ", def)
                        hp[desafiante.id] -= danoFinal;
                        defBuff[desafiante.id] = false
                        textoBot = `🤖 O Bot atacou e causou **${danoFinal} de dano!. ${crit ? "💥 CRITICO" : ""} **`;
                    } else if (acao === "defender") {
                        defBuff[oponenteId] = true
                        console.log("Def BOT: ", conBot)
                        textoBot = `🤖 O Bot se **defende!**`;
                    } else if (acao === "fire ball") {
                        let dano = Math.floor(Math.random() * 6 + strBot * 2)
                        const crit = Math.random() < 0.15
                        if (crit) dano = Math.floor(dano * 1.5)
                        const def = defBuff[desafiante.id] ? conJogador * 1.5 : conJogador
                        const danoFinal = Math.max(0, dano - def)
                        hp[desafiante.id] -= danoFinal;
                        console.log("Def jogador: ", def)
                        defBuff[desafiante.id] = false
                        cd['BOT'] = 1
                        textoBot = `🤖 O Bot lançou uma **Bolo de fogo🔥** e causou **${danoFinal} de dano! ${crit ? "💥 CRITICO MÁGICO!!" : ""} **`;
                    } else if (acao === "curar") {
                        let cura = 0
                        if (dif == "facil") {
                            cura = Math.floor(Math.random() * 5) + 2;
                        } else if (dif == "medio") {
                            cura = Math.floor(Math.random() * 8) + 5;
                        } else {
                            cura = Math.floor(Math.random() * 11) + 9;
                        }
                        hp["BOT"] += cura;
                        if (hp["BOT"] > 100) hp["BOT"] = 100;
                        textoBot = `🤖 O Bot recuperou **${cura} de HP❤️!**`;
                    } else if (acao === "furia") {
                        furia["BOT"].ativa = true
                        furia["BOT"].usos = 3
                        const cura = Math.floor(Math.random() * 11) + 10;
                        hp["BOT"] += cura;
                        if (hp["BOT"] > 100) hp["BOT"] = 100;

                        textoBot = `🤖 O Bot entrou em **FÚRIA🔥🔥**`

                        await msg.edit({
                            embeds: [duelEmbed.setDescription(`🤖 O Bot Recuperou **🔥${cura} de HP🔥**\n\nTurno de ${turno === "BOT" ? nomeOponente : `<@${turno}>`}`)]
                        })

                        const furiaAtq = async () => {
                            if (furia["BOT"].usos <= 0) {
                                furia["BOT"].ativa = false
                                await msg.edit({
                                    embeds: [duelEmbed.setDescription(`A Fúria acabou!!\n\nTurno de ${turno === "BOT" ? nomeOponente : `<@${turno}>`}`)]
                                })
                                cd["BOT"] = 2
                                return
                            }

                            let dano = Math.floor(Math.random() * 5 + strBot * 1.5)
                            const crit = Math.random() < 0.3
                            if (crit) dano = Math.floor(dano * 1.5)

                            const def = defBuff[desafiante.id] ? conJogador * 1.5 : conJogador
                            const danoFinal = Math.max(0, dano - def)

                            hp[desafiante.id] -= danoFinal;
                            defBuff[desafiante.id] = false
                            console.log(furia["BOT"].ativa, furia["BOT"].usos)
                            furia[oponenteId].usos--

                            await msg.edit({
                                embeds: [duelEmbed.setDescription(`🤖 O Bot atacou e causou 🔥🔥**${danoFinal} de dano!🔥🔥. ${crit ? "💥 CRITICO FURIOSO🔥🔥" : ""} **\n\nTurno de ${turno === "BOT" ? nomeOponente : `<@${turno}>`}`)]
                            })
                            setTimeout(furiaAtq, 1200)
                        }
                        setTimeout(furiaAtq, 1500)

                    }

                    // Verificar se matou
                    if (hp[desafiante.id] <= 0) {
                        collector.stop();
                        const final = new EmbedBuilder()
                            .setTitle("😵 Derrota!")
                            .setDescription("🤖 O Bot venceu o duelo!")
                            .addFields(
                                { name: desafiante.displayName, value: `❤️ ${Math.max(0, hp[desafiante.id])} HP`, inline: true },
                                { name: nomeOponente, value: `❤️ ${Math.max(0, hp["BOT"])} HP`, inline: true }
                            )
                            .setColor("Red");
                        return msg.edit({ embeds: [final], components: [] });
                    }

                    // Troca de volta
                    turno = desafiante.id;
                    duelEmbed.setDescription(`${textoBot}\n\nTurno de <@${turno}>`);
                    duelEmbed.spliceFields(0, 2,
                        { name: desafiante.displayName, value: `❤️ ${Math.max(0, hp[desafiante.id])} HP`, inline: true },
                        { name: nomeOponente, value: `❤️ ${Math.max(0, hp["BOT"])} HP`, inline: true }
                    );

                    await msg.edit({ content: `turno de: ${turno}`, embeds: [duelEmbed] });

                }, 1500); // delay pro bot reagir
            }
        });

        collector.on("end", (_, reason) => {
            if (reason === "time") {
                interaction.followUp("⏰ O duelo expirou por inatividade.");
            }
        });
    }
}