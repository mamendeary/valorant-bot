// Load the discord.js library.
const discord = require("discord.js");

// 1. A list (array) with one item in it.
const intentList = [discord.GatewayIntentBits.Guilds];

// 2. A settings object with one property called "intents".
const settings = {
    intents: intentList
};

// 3. Create the bot, handing it the settings.
const client = new discord.Client(settings);

/**
 * Runs once, when the bot has finished logging in.
 */
function onReady(readyClient) {
    console.log("Logged in as " + readyClient.user.tag);
}

// When the "ready" event happens, call onReady.
client.once(discord.Events.ClientReady, onReady);

// Connect to Discord using the token from the .env file.
client.login(process.env.DISCORD_TOKEN);