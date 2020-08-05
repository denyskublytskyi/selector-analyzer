const mongoose = require("mongoose");

const analyzer = require("./modules/analyzer");
const {
    TelegramNotificationService,
} = require("./modules/notification/telegram-notification.service");

const logger = console;

const start = async () => {
    mongoose.connect(process.env.MONGO_URI, {
        useCreateIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const notificationService = await TelegramNotificationService.init({
        token: process.env.TELEGRAM_BOT_TOKEN,
    });

    await analyzer.start({
        logger,
        notificationService,
    });
};

module.exports.handler = async () => {
    process.on("uncaughtException", (e) => {
        logger.error(e, "Uncaught exception");
        process.exit(1);
    });

    process.on("unhandledRejection", (reason, p) => {
        logger.error(reason, "Unhandled Rejection at Promise", p);
    });

    try {
        await start();
        logger.info("Job is successfully finished!");
    } catch (e) {
        logger.error(e, "Job failed");
        throw e;
    }
};
