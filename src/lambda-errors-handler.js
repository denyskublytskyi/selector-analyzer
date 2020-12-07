const zlib = require("zlib");
const utils = require("util");

const gunzip = utils.promisify(zlib.gunzip);

module.exports.handler = async (event) => {
    const compressedPayload = Buffer.from(event.awslogs.data, "base64");
    const decompressedPayload = await gunzip(compressedPayload);

    const payload = decompressedPayload.toString("utf-8");
    console.log(payload);
};
