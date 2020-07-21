const Selector = require("./models/Selector");
const Track = require("./models/Track");

class SelectorsService {
    // eslint-disable-next-line class-methods-use-this
    async getActiveSelectors() {
        return Selector.find({ isEnabled: true });
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
