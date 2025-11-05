const { Events } = require('discord.js')
const fs = require('node:fs')
const path = require('node:path')

const dbPath = path.join(__dirname, '..', 'pontos.json')

function savePnts(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
    } catch (error) {
        console.error('Erro ao salvar is dados:', e)
    }
}


module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return
        // teste de contador

        let pntsData = {}
        try {
            if (fs.existsSync(dbPath)) {
                const content = fs.readFileSync(dbPath, 'utf8')
                if (content) {
                    pntsData = JSON.parse(content)
                }
            }

            const data = fs.readFileSync(dbPath, 'utf8')
            pntsData = JSON.parse(data)
        } catch (error) {
            console.log('Arquivo do Banco de dados não encontrado. Criando um novo arquivo.')
        }

        const userId = message.author.id

        if (!pntsData[userId]) {
            pntsData[userId] = {
                mensagens: 0,
                pontos: 0
            }
        }

        pntsData[userId].mensagens += 1;

        if (pntsData[userId].mensagens % 5 === 0) {
            const morePnts = Math.floor(Math.random() * 5) + 1;

            pntsData[userId].pontos += morePnts
        }
        savePnts(pntsData);
    }
}