const { SlashCommandBuilder, MessageFlags, EmbedBuilder, AttachmentBuilder } = require("discord.js")
const User = require("../database/models/user");
const fs = require("node:fs")
const path = require("node:path")


module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName("criar-habito")
        .setDescription("Cria um hábito no seu hábitica. O hábito vem positivo por padrão.")
        .addStringOption(option => option
            .setName("nome")
            .setDescription("Escreva o nome do hábito")
            .setRequired(true))
        .addStringOption(option => option
            .setName("descrição")
            .setDescription("Escreva a descrição do hábito"))
        .addBooleanOption(option => option
            .setName("positivo")
            .setDescription("Define se é um hábito positivo"))
        .addBooleanOption(option => option
            .setName("negativo")
            .setDescription('Define se é um hábito negativo'))
        .addNumberOption(option => option
            .setName("dificuldade")
            .setDescription("Defina qual é o nível de dificuldade do seu Hábito.")
            .addChoices(
                { name: 'Trivial', value: 0.1 },
                { name: 'Normal', value: 1 },
                { name: 'Médio', value: 1.5 },
                { name: 'Difícil', value: 2 },
            ))
        .addStringOption(option => option
            .setName("etiquetas")
            .setDescription("BETA-Adicione uma etiqueta ao seu hábito.")
            .setAutocomplete(true))
        .addStringOption(option => option
            .setName("frequencia")
            .setDescription("A frequÊncia em que o contador do seu habito será resetado.")
            .addChoices(
                { name: 'Diária', value: 'diary' },
                { name: 'Semanalmente', value: 'weekly' },
                { name: 'Mensalmente', value: 'monthly' },
            )),
    async autocomplete(interaction) {
        const focus = interaction.options.getFocused()
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.respond([])

        // Cabeçalho da requisição da API
        const HEADERS = {
            "x-client": `${user.habiticaUserId}-BotDiscord`,
            "x-api-user": user.habiticaUserId,
            "x-api-key": user.habiticaToken,
            'Content-Type': "application/json",
        }

        // Testando a requisição API e enviando a responsta ao discord.js
        try {
            const res = await fetch('https://habitica.com/api/v3/tags', {
                method: "GET",
                headers: HEADERS
            })
            const data = await res.json()
            if (!res.ok) return interaction.respond([])

            const filtered = data.data.filter(tag => tag.name.toLowerCase().includes(focus.toLowerCase()))
                .slice(0, 25)
                .map(tag => ({
                    name: tag.name,
                    value: tag.id
                }))

            await interaction.respond(filtered)

        } catch (error) {
            console.error("Deu um erro ao acessar suas etiquetas", error)
            await interaction.respond([])
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        const discordId = interaction.user.id
        const text = interaction.options.getString("nome")
        const tags = interaction.options.getString("etiquetas")
        const desc = interaction.options.getString("descrição")
        const plus = interaction.options.getBoolean("positivo")
        const minus = interaction.options.getBoolean("negativo")
        const dif = interaction.options.getNumber("dificuldade")
        const freq = interaction.options.getString("frequencia")

        const user = await User.findOne({ discordId })

        const up = (plus === null || plus === undefined) ? true : plus;
        const down = (minus === null || minus === undefined) ? false : minus;
        const diff = (dif === null || dif === undefined) ? 1 : dif;

        let tagId = null


        if (tags) {
            try {
                const HEADERS = {
                    "x-client": `${user.habiticaUserId}-BotDiscord`,
                    "x-api-user": user.habiticaUserId,
                    "x-api-key": user.habiticaToken,
                    'Content-Type': "application/json",
                }

                const resTag = await fetch('https://habitica.com/api/v3/tags', {
                    method: "GET",
                    headers: HEADERS
                })
                const data = await resTag.json()

                const ttags = data.data.find(tag => tag.id === tags) || data.data.find(tag => tag.name.toLowerCase() === tags.toLowerCase())

                if (ttags) {
                    tagId = ttags.id
                } else {
                    const resNewTag = await fetch('https://habitica.com/api/v3/tags', {
                        method: "POST",
                        headers: HEADERS,
                        body: JSON.stringify({ name: tags })
                    })

                    const newTag = await resNewTag.json()

                    if (!resNewTag.ok) {
                        console.error("Erro ao criar a nova tag", newTag)
                        return interaction.editReply(`❌ Erro ao criar a ${newTag.message}`)
                    }

                    tagId = newTag.data.id
                }
            } catch (error) {
                console.error("Erro ao lidar com tags:", error)
                return interaction.editReply("❌ Erro ao verificar ou criar a tag.")
            }
        }


        try {
            if (!user) {
                return await interaction.editReply("Você ainda não vinculou sua conta. Use /vincular")
            }

            const HEADERS = {
                "x-client": `${user.habiticaUserId}-BotDiscord`,
                "x-api-user": user.habiticaUserId,
                "x-api-key": user.habiticaToken,
                'Content-Type': "application/json",
            }

            const Task = {
                "text": text,
                "notes": desc,
                "type": "habit",
                "up": up,
                "down": down,
                "priority": diff,
                "tags": tagId ? [tagId] : [],
                "frequency": freq ? freq : "daily",
            }

            const res = await fetch('https://habitica.com/api/v3/tasks/user', {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify(Task)
            })

            const data = await res.json()

            if (!res.ok) {
                await interaction.editReply(`Erro ao criar o Hábito: ${data.message}`)
            }

            // Gerçao do avatar do habitica
            avatarHabitica =  await captureAvatar(user.habiticaUserId)

            if (!avatarHabitica){
                return await interaction.editReply({
                    content: "Erro ao gerar a imagem do habitica",
                    flags: MessageFlags.Ephemeral
                })
            }
            console.log(avatarHabitica)

            const avatarFile = new AttachmentBuilder(avatarHabitica, {
                name: `avatar_${user.habiticaUserId}.png`
            })
            const avatar = interaction.user.avatarURL({ dynamic: true, format: "png", size: 1024 })

            const userObj = {
                description: desc ? desc : "Nenhuma",
                type: up && down ? "Binário" : up ? "Positivo" : down ? "Negativo" : "Nenhum",
                tags: tags ? tags : "Nenhuma Etiqueta"
            }

            const userEmbed = new EmbedBuilder()
                .setTitle(`Hábito do ${interaction.user.displayName}`)
                .setAuthor({ name: interaction.user.displayName, iconURL: avatar })
                .setThumbnail(`attachment://avatar_${user.habiticaUserId}.png`)
                .setColor("#925Cf3")
                .addFields(
                    { name: 'Hábito', value: `${data.data.text}` },
                    { name: 'Descrição', value: userObj.description},
                    { name: 'Tipo', value: userObj.type, inline: true },
                    { name: 'Etiquetas', value: userObj.tags, inline: true },
                )

            await interaction.editReply({
                embeds: [userEmbed],
                files: [avatarFile]
            })
        } catch (err) {
            console.error(err)
            await interaction.editReply("❌ Ocorreu um erro ao criar o hábito.");
        }

    }
}