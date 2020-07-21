/* eslint-disable sort-keys */
const mongoose = require("mongoose");

const trackSchema = mongoose.Schema(
    {
        value: {
            type: mongoose.Schema.Types.Mixed,
        },
        selector: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Selector",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Track", trackSchema);
