const map = require("lodash/map");
const identity = require("lodash/identity");
const pickBy = require("lodash/pickBy");
const asyncEachSeries = require("async/eachSeries");
const chromeLambda = require("chrome-aws-lambda");
const S3Client = require("aws-sdk/clients/s3");
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");

const { SelectorsService } = require("./selectors.service");

const s3 = new S3Client({ region: process.env.S3_REGION });

const start = async ({ notificationService, logger }) => {
    const selectorsService = new SelectorsService();
    const selectors = await selectorsService.getActiveSelectors();

    logger.info("Active selectors", {
        selectors: map(selectors, "name"),
    });

    await asyncEachSeries(selectors, async (selector) => {
        const opts = {
            defaultViewport: {
                deviceScaleFactor: 1,
                height: 1080,
                width: 1920,
            },
            headless: true,
        };

        let browser;

        if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line global-require,import/no-extraneous-dependencies
            const puppeteer = await require("puppeteer");
            browser = await puppeteer.launch(opts);
        } else {
            browser = await chromeLambda.puppeteer.launch({
                args: chromeLambda.args,
                executablePath: await chromeLambda.executablePath,
                ...opts,
            });
        }

        const values = [];

        logger.info("Start processing selector", {
            selector,
        });

        const page = await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
        );
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en;q=0.9",
        });

        await Promise.all([page.goto(selector.url), page.waitForNavigation()]);

        await asyncEachSeries(
            selector.selectors,
            async ({ action, wait, value, path }) => {
                const context = pickBy(
                    {
                        action,
                        path,
                        selector,
                        value,
                        wait,
                    },
                    identity
                );
                logger.info("Waiting for selector path", context);
                // await page.screenshot({ path: `${selector.name}-${path}.png` });
                await page.waitForSelector(path);

                if (wait) {
                    logger.info("Waiting", context);
                    await page.waitFor(wait);
                }

                if (action === "getValue") {
                    await page.evaluate(
                        ({ path: selectorPath }) => {
                            // eslint-disable-next-line no-undef
                            const el = document.querySelector(selectorPath);
                            el.style.border = "2px solid red";
                            el.style.padding = "15px";
                        },
                        { path }
                    );

                    logger.info("Making screenshot", context);
                    const buffer = await page.screenshot();

                    const optimizedBuffer = await imagemin.buffer(buffer, {
                        plugins: [
                            imageminPngquant({
                                quality: [0.6, 0.8],
                            }),
                        ],
                    });

                    logger.info("Uploading screenshot", context);
                    const s3Response = await s3
                        .upload({
                            ACL: "public-read",
                            Body: optimizedBuffer,
                            Bucket: process.env.S3_BUCKET,
                            ContentType: "image/png",
                            Key: `${
                                selector.name
                            }/${new Date().toISOString()}.png`,
                        })
                        .promise();

                    logger.info("Screenshot is uploaded", {
                        ...context,
                        s3Response,
                    });

                    logger.info("Get value", context);
                    const result = await page.$eval(
                        path,
                        (element) => element.textContent
                    );

                    values.push({
                        screenshotUrl: s3Response.Location,
                        value: result.replace(/[\t\n\r]/, "").trim(),
                    });
                }

                if (action === "click") {
                    logger.info("Click", context);
                    await page.click(path);

                    return;
                }

                if (action === "type") {
                    logger.info("Type", context);
                    await page.click(path, { clickCount: 3 });
                    await page.type(path, value, { delay: 100 });
                }
            }
        );

        const value = map(values, "value").join(" ");
        const lastTrack = await selectorsService.getLastTrack({
            // eslint-disable-next-line no-underscore-dangle
            selectorId: selector._id,
        });
        logger.info("Last track", { lastTrack, selector });

        const screenshotsUrls = map(values, "screenshotUrl");

        if (!lastTrack) {
            logger.log(
                `Start tracking with value ${JSON.stringify(value)}`,
                selector
            );
            await notificationService.selectorValueChangeNotify({
                newValue: value,
                screenshotsUrls,
                selector,
            });
        }

        if (lastTrack && lastTrack.value !== value) {
            logger.log(
                `Value changes from ${JSON.stringify(
                    lastTrack.value
                )} to ${JSON.stringify(value)}`,
                selector
            );
            await notificationService.selectorValueChangeNotify({
                newValue: value,
                oldValue: lastTrack.value,
                screenshotsUrls,
                selector,
            });
        }

        logger.info("Saving track", { selector, value });
        await selectorsService.saveTrack({
            screenshotsUrls,
            selector,
            value,
        });

        await page.close();
        await browser.close();

        return values;
    });
};

module.exports = { start };
