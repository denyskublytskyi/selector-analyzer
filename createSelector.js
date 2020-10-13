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
        name: "Elmag Духовой шкаф Pyramida F 100 S GBL",
        selectors: [
            {
                action: "getValue",
                path:
                    "#middle_box > div > div.content.part > div > div > div.contentView.assortment_main > div.productDescription > div > div > div.productItemBid.na > div.bh_out > div",
            },
        ],
        url: "https://elmag.com.ua/product/pyramida-f-100-s-gbl-p87870",
    });
    console.log("Created");
    process.exit(0);
};

module.exports = createSelector;
