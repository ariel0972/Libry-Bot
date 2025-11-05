const { SlashCommandBuilder } = require("discord.js")
const User = require("../database/models/user")

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
    .setName("teste")
    .setDescription("apenas um teste"),

    async execute(interaction){
        interaction.reply(`oi!`);
    }
}