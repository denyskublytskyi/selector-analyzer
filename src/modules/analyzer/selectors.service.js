const Selector = require("./models/Selector");
const Track = require("./models/Track");

class SelectorsService {
    // eslint-disable-next-line class-methods-use-this
    async getActiveSelectors() {
        // await Selector.create({
        //     isEnabled: true,
        //     name: "Kia Sportage 1.6 6AT",
        //     selectors: [
        //         {
        //             action: "getValue",
        //             path:
        //                 "#equipments > div.modelSlider > div > div.owl-stage-outer > div > div:nth-child(4) > a > span.price_text.small-price",
        //         },
        //     ],
        //     url: "https://avtocentr.com.ua/kia/kia-sportage-fl",
        // });
        return Selector.find({ isEnabled: true }).sort("-createdAt");
    }

    // eslint-disable-next-line class-methods-use-this
    async saveTrack(payload) {
        const track = new Track(payload);

        await track.save();
    }

    // eslint-disable-next-line class-methods-use-this
    async getLastTrack({ selectorId }) {
        return Track.findOne({ selector: selectorId }).sort({ createdAt: -1 });
    }
}

module.exports = {
    SelectorsService,
};
