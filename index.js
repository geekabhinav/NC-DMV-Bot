const TelegramBot = require("node-telegram-bot-api");
const CONFIG = require("./src/constants.json");
const moment = require("moment");
// Initialize Telegram bot
const bot = new TelegramBot(CONFIG.telegram_bot_token, { polling: true });
const sendToGroup = (message) => {
  // Create a bot that uses 'polling' to fetch new updates
  try {
    console.log(message);
    bot.sendMessage(CONFIG.telegram_group_id, message);
    if (message.includes(CONFIG.telegram_username)) {
      bot.sendMessage(CONFIG.telegram_user_id, message);
    }
  } catch (error) {
    console.log("[ERROR_TG] " + error.message);
  }
};

const handleMessage = (msg, match) => {
  const user = msg.from.id
  const chatId = msg.chat.id;
  if (chatId !== CONFIG.telegram_group_id) {
    bot.sendMessage(chatId, "You don't have permission to do this. Check telegram_group_id in constants.json");
    return false;
  }

  const { getCredentials, clearSession } = require("./src/visa-check");
  if (msg.text === "/start") {
    process.env["DMV_BOT"] = "ACTIVE";
    process.env["DMV_TARGET"] = CONFIG.target_date;
    process.env["DMV_TARGET_START"] = CONFIG.target_start_date;
    process.env["DMV_CATEGORY"] = CONFIG.category_tile_index;
    process.env["DMV_INTERVAL"] = String(CONFIG.polling_interval);
    getCredentials().catch(console.log);
  } else if (msg.text === "/stop") {
    bot.sendMessage(chatId, "Stopping the bot");
    clearSession().catch(console.log);
    process.env["DMV_BOT"] = "INACTIVE";
  }
}

const handleTargetChange = (msg, match) => {
  const user = msg.from.id
  const chatId = msg.chat.id;
  if (chatId !== CONFIG.telegram_group_id) {
    bot.sendMessage(chatId, "You don't have permission to do this. Check telegram_group_id in constants.json");
    return false;
  }

  try {
    const date = msg.text.replace(/\/target\s(.*)/ig, "$1");
    const dateMoment = moment(date, "YYYY-MM-DD");
    if (dateMoment.isValid()) {
      process.env["DMV_TARGET"] = dateMoment.format("YYYY-MM-DD");
      bot.sendMessage(chatId, `Changed target date to ${dateMoment.format("YYYY-MM-DD")}`);
    } else {
      throw new Error("Invalid command. Send /target YYYY-MM-DD to change target date");
    }
  } catch (error) {
    bot.sendMessage(chatId, error.message);
  }
}

const handleCategoryChange = (msg, match) => {
  const user = msg.from.id
  const chatId = msg.chat.id;
  if (chatId !== CONFIG.telegram_group_id) {
    bot.sendMessage(chatId, "You don't have permission to do this. Check telegram_group_id in constants.json");
    return false;
  }

  try {
    const cat = msg.text.replace(/\/category\s(.*)/ig, "$1");
    if (Number.isNaN(parseInt(cat.trim(), 10))) {
      throw new Error("Invalid command. Send /category 9 to change the DMV appointment type. Value passed can only be an integer");
    }
    process.env["DMV_CATEGORY"] = cat.trim();
    bot.sendMessage(chatId, `Changed DMV category tile index to ${cat}`);
  } catch (error) {
    bot.sendMessage(chatId, error.message);
  }
}

const handleIntervalChange = (msg, match) => {
  const user = msg.from.id
  const chatId = msg.chat.id;
  if (chatId !== CONFIG.telegram_group_id) {
    bot.sendMessage(chatId, "You don't have permission to do this. Check telegram_group_id in constants.json");
    return false;
  }

  try {
    const interval = msg.text.replace(/\/interval\s(\d*)/ig, "$1");
    if (Number.isNaN(parseInt(interval))) {
      throw new Error("Invalid interval. Use /interval 60000 to set checking interval as 60 seconds.");
    }
    process.env["DMV_INTERVAL"] = interval;
    bot.sendMessage(chatId, `Changed polling interval to ${interval} ms`);
  } catch (error) {
    bot.sendMessage(chatId, error.message);
  }
}

bot.onText(/\/start/, handleMessage);
bot.onText(/\/stop/, handleMessage);
bot.onText(/\/target/, handleTargetChange);
bot.onText(/\/interval/, handleIntervalChange);
bot.onText(/\/category/, handleCategoryChange);
bot.on("polling_error", console.log);

module.exports.sendToGroup = sendToGroup;
module.exports.bot = bot;
