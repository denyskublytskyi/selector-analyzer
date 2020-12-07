const map = require("lodash/map");
const identity = require("lodash/identity");
const pickBy = require("lodash/pickBy");
const asyncEachSeries = require("async/eachSeries");
const chromeLambda = require("chrome-aws-lambda");
const S3Client = require("aws-sdk/clients/s3");
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");

const { SelectorsService } = require("./selectors.service");
const shouldNotify = require("./lib/shouldNotify");

const s3 = new S3Client({ region: process.env.S3_REGION });

const start = async ({ notificationService, logger }) => {
    const selectorsService = new SelectorsService();
    const selectors = await selectorsService.getActiveSelectors();

    logger.info(
        {
            selectors: map(selectors, "name"),
        },
        "Active selectors"
    );

    await asyncEachSeries(selectors, async (selector) => {
        let page;
        let browser;
        try {
            const opts = {
                defaultViewport: {
                    deviceScaleFactor: 1,
                    height: 1080,
                    width: 1920,
                },
                headless: process.env.NODE_ENV !== "development",
            };

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

            logger.info(
                {
                    selector,
                },
                "Start processing selector"
            );

            page = await browser.newPage();

            await page.setUserAgent(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
            );
            await page.setExtraHTTPHeaders({
                "Accept-Language": "en;q=0.9",
            });

            await Promise.all([
                page.goto(selector.url),
                page.waitForNavigation(),
            ]);

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
                    logger.info(context, "Waiting for selector path");
                    // await page.screenshot({ path: `${selector.name}-${path}.png` });
                    await page.waitForSelector(path);

                    if (wait) {
                        logger.info(context, "Waiting");
                        await page.waitFor(wait);
                    }

                    if (action === "getValue") {
                        const valueElement = await page.$(path);
                        if (!(await valueElement.isIntersectingViewport())) {
                            await page.evaluate(
                                ({ path: selectorPath }) => {
                                    // eslint-disable-next-line no-undef
                                    const el = document.querySelector(
                                        selectorPath
                                    );

                                    if (el) {
                                        el.scrollIntoView({ block: "center" });
                                    }
                                },
                                { path }
                            );
                        }

                        await page.evaluate(
                            ({ path: selectorPath }) => {
                                // eslint-disable-next-line no-undef
                                const el = document.querySelector(selectorPath);
                                el.style.border = "2px solid red";
                                el.style.padding = "15px";
                            },
                            { path }
                        );

                        logger.info(context, "Making screenshot");
                        const buffer = await page.screenshot();

                        const optimizedBuffer = await imagemin.buffer(buffer, {
                            plugins: [
                                imageminPngquant({
                                    quality: [0.6, 0.8],
                                }),
                            ],
                        });

                        logger.info(context, "Uploading screenshot");
                        const s3Response = await s3
                            .upload({
                                ACL: "private",
                                Body: optimizedBuffer,
                                Bucket: process.env.S3_BUCKET,
                                ContentType: "image/png",
                                Key: `${
                                    selector.name
                                }/${new Date().toISOString()}.png`,
                            })
                            .promise();

                        logger.info(
                            {
                                ...context,
                                s3Response,
                            },
                            "Screenshot is uploaded"
                        );

                        logger.info(context, "Get value");
                        const result = await page.$eval(
                            path,
                            (element) => element.textContent
                        );

                        values.push({
                            screenshotUrl: s3.getSignedUrl("getObject", {
                                Bucket: process.env.S3_BUCKET,
                                Expires: 3600,
                                Key: s3Response.Key,
                            }),
                            value: result.replace(/[\t\n\r]/, "").trim(),
                        });
                    }

                    if (action === "click") {
                        logger.info(context, "Click");
                        await page.click(path);

                        return;
                    }

                    if (action === "type") {
                        logger.info(context, "Type");
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
            logger.info({ lastTrack, selector }, "Last track");

            const screenshotsUrls = map(values, "screenshotUrl");

            if (!lastTrack) {
                logger.log(
                    selector,
                    `Start tracking with value ${JSON.stringify(value)}`
                );
                logger.log(
                    {
                        newValue: value,
                        screenshotsUrls,
                        selector,
                    },
                    "Sending notification"
                );
                await notificationService.selectorValueChangeNotify({
                    newValue: value,
                    screenshotsUrls,
                    selector,
                });
            }

            if (
                lastTrack &&
                lastTrack.value !== value &&
                shouldNotify(value, lastTrack.value, selector.notifyWhen)
            ) {
                logger.log(
                    `Value changes from ${JSON.stringify(
                        lastTrack.value
                    )} to ${JSON.stringify(value)}`,
                    selector
                );
                logger.log(
                    {
                        newValue: value,
                        oldValue: lastTrack.value,
                        screenshotsUrls,
                        selector,
                    },
                    "Sending notification"
                );
                await notificationService.selectorValueChangeNotify({
                    newValue: value,
                    oldValue: lastTrack.value,
                    screenshotsUrls,
                    selector,
                });
            }

            logger.info({ selector, value }, "Saving track");
            await selectorsService.saveTrack({
                screenshotsUrls,
                selector,
                value,
            });
        } catch (e) {
            logger.error({ selector }, e.message);
        } finally {
            if (page) {
                await page.close();
            }
            if (browser) {
                await browser.close();
            }
        }
    });
};

module.exports = { start };
