const { SlashCommandBuilder } = require("discord.js")
const User = require("../database/models/user")

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
    .setName("depositar")
    .setDescription("Deposita "),

    async execute(interaction){
        interaction.reply(`oi!`);
    }
}