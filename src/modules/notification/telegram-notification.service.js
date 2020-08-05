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

    async selectorValueChangeNotify({
        selector,
        oldValue,
        newValue,
        screenshotsUrls,
    }) {
        const message = oldValue
            ? `Selector _${selector.name}_ was changed from *${oldValue}* to *${newValue}*`
            : `Started tracking new selector _${selector.name}_ with value *${newValue}*`;

        if (screenshotsUrls && screenshotsUrls.length === 1) {
            await this.bot.telegram.sendPhoto(
                process.env.TELEGRAM_CHAT_ID,
                screenshotsUrls[0],
                {
                    caption: message,
                    parse_mode: "markdown",
                }
            );
            return;
        }

        await this.bot.telegram.sendMessage(
            process.env.TELEGRAM_CHAT_ID,
            message,
            {
                parse_mode: "markdown",
            }
        );

        if (screenshotsUrls && screenshotsUrls.length > 1) {
            await this.bot.telegram.sendMediaGroup(
                process.env.TELEGRAM_CHAT_ID,
                screenshotsUrls.map((url) => ({
                    caption: message,
                    media: url,
                    parse_mode: "markdown",
                    type: "photo",
                }))
            );
        }
    }
}

module.exports = { TelegramNotificationService };
