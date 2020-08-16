/* eslint-disable sort-keys */

const mongoose = require("mongoose");

const selectorSchema = mongoose.Schema(
    {
        name: {
            isRequired: true,
            type: String,
        },
        isEnabled: {
            default: false,
            index: true,
            isRequired: true,
            type: Boolean,
        },
        url: {
            isRequired: true,
            type: String,
        },
        selectors: {
            isRequired: true,
            type: [
                {
                    path: {
                        isRequired: true,
                        type: String,
                    },
                    value: String,
                    action: {
                        type: String,
                        enum: ["getValue", "click", "type"],
                    },
                    wait: Number,
                },
            ],
        },
        notifyWhen: {
            type: {
                type: {
                    type: String,
                    enum: ["decrease"],
                },
                value: {
                    type: Number,
                },
            },
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Selector", selectorSchema);
