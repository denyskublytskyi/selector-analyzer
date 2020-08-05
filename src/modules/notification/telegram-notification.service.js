const { Telegraf } = require("telegraf");

const { INotificationService } = require("./notification.service.interface");

class TelegramNotificationService extends INotificationService {
    static async init({ token }) {
        return new TelegramNotificationService({ token });
    }

    constructor({ token }) {
        super();
        this.bot = new Telegraf(token);
    }

    async selectorValueChangeNotify({ selector, oldValue, newValue }) {
        await this.bot.telegram.sendMessage(
            process.env.TELEGRAM_CHAT_ID,
            oldValue
                ? `Selector _${selector.name}_ was changed from *${oldValue}* to *${newValue}*`
                : `Started tracking new selector _${selector.name}_ with value *${newValue}*`,
            {
                parse_mode: "markdown",
            }
        );
    }
}

module.exports = { TelegramNotificationService };
