const { Op } = require('sequelize');
const { Client, codeBlock, Collection, Events, GatewayIntentBits } = require('discord.js');

// dotenv
require('dotenv').config()
const connectToMongo = require('./database/db');

// Importação dos Comandos
const fs = require("node:fs")
const path = require("node:path")

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] })
client.commands = new Collection()

const commandsPath = path.join(__dirname, "commands")
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"))

for (const file of commandFiles){
    const filePath = path.join(commandsPath,file)
    const command = require(filePath)
    if("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command)
    } else {
        console.log(`Este comando em ${filePath}  está com "data" ou "execute" ausentes`)
    }
}

const eventsPath = path.join(__dirname, 'events')
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'))

for(const file of eventFiles){
    const filePath = path.join(eventsPath, file)
    const event = require(filePath)
    if (event.file){
        client.once(event.name, (...args) => event.execute(...args))
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Conexão com o banco de Dados - GPT
(async () => {
  try {
    await connectToMongo(); // espera a conexão com o Mongo
    await client.login(process.env.DISCORD_TOKEN); // só loga depois disso
  } catch (err) {
    console.error("Erro ao iniciar bot:", err);
  }
})();

client.once(Events.Ready, async () => {
    await connectToMongo();
	console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.TOKEN)