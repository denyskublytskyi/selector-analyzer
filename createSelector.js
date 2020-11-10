const mongoose = require("mongoose");
const Selector = require("./src/modules/analyzer/models/Selector");

const createSelector = async () => {
    mongoose.connect(process.env.MONGO_URI, {
        useCreateIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    console.log("Start creating");
    await Selector.create({
        isEnabled: true,
        name: "KingCamp стол на Amazon",
        selectors: [
            {
                action: "getValue",
                path: "#availability > span",
            },
        ],
        url: "https://www.amazon.com/dp/B08JP7DQMH",
    });
    console.log("Created");
    process.exit(0);
};

module.exports = createSelector;
