const { SlashCommandBuilder, MessageFlags, EmbedBuilder, AttachmentBuilder } = require("discord.js")
const User = require("../database/models/user");
const Canvas = require('@napi-rs/canvas');
const { captureAvatar } = require("../Habitica_avatar");
const { GerarAvatar } = require("../costumeAvatar.js")
const { request } = require("undici");
const { fetchHabiticaUser } = require("../utils/habiticaPlayer.js");
const { AUTHOR_ID } = process.env

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("ver-perfil")
        .setDescription("Veja seu perfil do Habitica"),

    async execute(interaction) {
        await interaction.deferReply();

        const user = await User.findOne({ discordId: interaction.user.id })
        const canvas = Canvas.createCanvas(500, 750);
        const ctx = canvas.getContext('2d');

        if (!user) {
            interaction.editReply({ content: "Você não está vinculado ao Bot", flags: MessageFlags.Ephemeral })
            return
        }
        
        const HEADERS = {
            "x-client": `${AUTHOR_ID}-BotDiscord`,
            "x-api-user": user.habiticaUserId,
            "x-api-key": user.habiticaToken,
            'Content-Type': "application/json",
        }

        const resUser = await fetch('https://habitica.com/api/v3/user', {
            method: "GET",
            headers: HEADERS,
        })
        const data = await resUser.json()
        const gameClass = data.data.stats.class
        let classePath

        switch (gameClass) {
            case 'wizard':
                classePath = "./assets/game_class/mage.png"
                break;
            case 'rogue':
                classePath = "./assets/game_class/rogue.png"
                break;
            case 'healer':
                classePath = "./assets/game_class/healer.png"
                break;
            default:
                classePath = "./assets/game_class/warrior.png"
                break;
        }

        const resDaily = await fetch("https://habitica.com/api/v3/tasks/user?type=dailys", {
            method: "get",
            headers: HEADERS,
        })
        const dataDaily = await resDaily.json()
        const dailys = dataDaily.data.filter(daily => {
            if (daily.isDue === true) {
                return true
            }
        }).filter(daily => {
            if (daily.completed === false) {
                return true
            }
        }).length

        const dailysMax = dataDaily.data.filter(daily => {
            if (daily.isDue === true) {
                return true
            }
        }).length

        // DADOS DO GRUPOS
        const party = await fetch(`https://habitica.com/api/v3/groups/party`, {
            method: 'GET',
            headers: HEADERS
        });
        const partyData = await party.json();
        const pickQuest = partyData.data.quest.progress.collect
        const questkey = partyData.data.quest.key // Chave do boss atual

        let QuestStatus = "Sem Missão"

        if (!questkey || partyData.data.quest.active == false) {
            QuestStatus = "Sem missão"
        }

        // DADOS DE CONTEUDO
        const content = await fetch("https://habitica.com/api/v3/content", {
            method: "get",
            headers: HEADERS,
        })

        const contData = await content.json();
        const questInfo = contData.data.quests[questkey]

        if (!questInfo) {
            QuestStatus = "Erro ao Buscar Missão"
        } else if (questInfo.boss) {
            const bossHp = partyData.data.quest.progress.hp
            const bossMaxHp = questInfo.boss.hp || 0
            const progressBoss = ((1 - bossHp / bossMaxHp) * 100).toFixed(1)

            QuestStatus = `${progressBoss}%`
        } else if (questInfo.collect) {
            const collectInfo = questInfo.collect
            let totalItens = 0
            let totalColetado = 0

            for (const items in collectInfo) {
                const required = collectInfo[items].count
                const atual = pickQuest[items] || 0

                totalItens += required
                totalColetado += atual
            }
            const progressCollect = ((totalColetado / totalItens) * 100).toFixed(1)

            QuestStatus = `${progressCollect}%`
        } else {
            QuestStatus = "Missão deu Bug"
        }

        const card = await Canvas.loadImage("./assets/avatar_profile.png")
        const token = await Canvas.loadImage("./assets/class_token.png")
        const coin = await Canvas.loadImage("./assets/game_class/gold.png")
        const classe = await Canvas.loadImage(classePath)
        
        const avatarHabitica = {
            head: data.data.items.gear.costume.head,
            armor: data.data.items.gear.costume.armor,
            weapon: data.data.items.gear.costume.weapon,
            shield: data.data.items.gear.costume.shield,
            back: data.data.items.gear.costume.back,
            body: data.data.items.gear.costume.body,
            eyewear: data.data.items.gear.costume.eyewear,
            headAccessory: data.data.items.gear.costume.headAccessory,
            preferences: {
                hair: {
                    color: data.data.preferences.hair.color,
                    base: data.data.preferences.hair.base,
                    bangs: data.data.preferences.hair.bangs,
                    beard: data.data.preferences.hair.beard,
                    mustache: data.data.preferences.hair.mustache,
                    flower: data.data.preferences.hair.flower
                },
                skin: data.data.preferences.skin,
                shirt: data.data.preferences.shirt,
                chair: data.data.preferences.chair,
                size: data.data.preferences.size,
                background: data.data.preferences.background
            }
        }

        const body = await GerarAvatar(avatarHabitica)
        const avatar = await Canvas.loadImage(body)

        ctx.drawImage(card, 0, 0, canvas.width, canvas.height)
        ctx.drawImage(avatar, 42, 28, 415, 432)
        ctx.drawImage(token, 187.5, 400, 125, 125)
        ctx.drawImage(classe, 221.5, 433, 55, 55)
        ctx.drawImage(coin, 360, 686, 23, 23)

        const status = {
            name: data.data.auth.local.username,
            class: gameClass == 'wizard' ? "Mago" : gameClass == 'rogue' ? 'Assassino' : gameClass == 'healer' ? 'Curandeiro' : 'Guerreiro',
            lvl: data.data.stats.lvl,
            hp: data.data.stats.hp,
            hpMax: data.data.stats.maxHealth,
            mana: data.data.stats.mp,
            manaMax: data.data.stats.maxMP,
            xp: data.data.stats.exp,
            xpMax: data.data.stats.toNextLevel,
            gold: data.data.stats.gp,
            quest: QuestStatus,
            dailys: dailys,
            Maxday: dailysMax,
        }


        //stats bar
        ctx.lineJoin = 'bevel'
        ctx.lineWidth = 18

        // Vida
        ctx.strokeStyle = '#f74e52'
        ctx.strokeRect(86, 569, (312 * status.hp / status.hpMax), 0)
        // mana
        ctx.strokeStyle = '#50b5e9'
        ctx.strokeRect(86, 608, (312 * status.mana / status.manaMax), 0)
        // Exp
        ctx.strokeStyle = '#ffb445'
        ctx.strokeRect(86, 646, (312 * status.xp / status.xpMax), 0)

        // Infos
        ctx.font = "12px Roboto"
        ctx.fillStyle = 'white'
        ctx.textAlign = 'left'
        ctx.fillText(`${status.hp.toFixed(0)} / ${status.hpMax}`, 404, 572, 80) // vida
        ctx.fillText(`${status.mana.toFixed(0)} / ${status.manaMax}`, 404, 612, 80) // mana
        ctx.fillText(`${status.xp.toFixed(0)} / ${status.xpMax}`, 404, 650, 65) // xp

        // Nome e nível
        ctx.font = 'bold 15px Roboto'
        ctx.textAlign = "left"
        ctx.fillText(`${status.name} • Nível ${status.lvl} ${status.class}`, 50, 704, 230)

        // Ouro
        ctx.font = "bold 18px Roboto"
        ctx.textAlign = "left"
        ctx.fillText(`${status.gold.toFixed(2)}`, 390, 704, 120)

        // Diária e quest
        ctx.font = 'bold 12px Roboto'
        ctx.textAlign = "right"
        ctx.fillText(`Progressão da Missão: ${status.quest}`, 460, 535, 120)
        ctx.textAlign = "left"
        ctx.fillText(`Diárias Incompletas: ${status.dailys} / ${status.Maxday}`, 38, 535, 120)

        const foto = new AttachmentBuilder(await canvas.encode('png'), { name: 'avatar_card.png' })
        const Profile = interaction.user.avatarURL({ dynamic: true, format: "png", size: 1024 })

        const userEmbed = new EmbedBuilder()
            .setTitle(`${data.data.auth.local.username}`)
            .setAuthor({ name: interaction.user.displayName, iconURL: Profile })
            .setImage('attachment://avatar_card.png')
            .setColor("#925Cf3")

        if (questInfo.boss) {
            await interaction.editReply({
                embeds: [userEmbed],
                files: [foto]
            })
        }

        if (questInfo.collect) {
            await interaction.editReply({
                embeds: [userEmbed],
                files: [foto]
            })
        }
    }
}