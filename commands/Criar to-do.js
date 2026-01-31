const { SlashCommandBuilder } = require("discord.js")


module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
    .setName("criar-tarefa")
    .setDescription("apenas um teste"),

    async execute(interaction){
        interaction.reply(`oi!`);
    }
}