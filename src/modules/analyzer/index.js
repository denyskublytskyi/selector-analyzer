const puppeteer = require("puppeteer");
const map = require("lodash/map");
const identity = require("lodash/identity");
const pickBy = require("lodash/pickBy");
const asyncEachSeries = require("async/eachSeries");

const { SelectorsService } = require("./selectors.service");

const start = async ({ notificationService, logger }) => {
    const selectorsService = new SelectorsService();
    const selectors = await selectorsService.getActiveSelectors();

    logger.info("Active selectors", {
        selectors: map(selectors, "name"),
    });

    const browser = await puppeteer.launch({
        headless: true,
    });

    await asyncEachSeries(selectors, async (selector) => {
        const values = [];

        logger.info("Start processing selector", {
            selector,
        });

        const browserContext = await browser.createIncognitoBrowserContext();
        const page = await browserContext.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
        );
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en;q=0.9",
        });
        await page.setViewport({
            deviceScaleFactor: 1,
            height: 1080,
            width: 1920,
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
                    logger.info("Get value", context);
                    const result = await page.$eval(
                        path,
                        (element) => element.textContent
                    );
                    values.push(result.replace(/[\t\n\r]/, "").trim());
                }

                if (action === "click") {
                    logger.info("Click", context);
                    await page.click(path);

                    return;
                }

                if (action === "type") {
                    logger.info("Click", context);
                    await page.click(path, { clickCount: 3 });
                    await page.type(path, value, { delay: 100 });
                }
            }
        );

        const value = values.join(" ");
        const lastTrack = await selectorsService.getLastTrack({
            // eslint-disable-next-line no-underscore-dangle
            selectorId: selector._id,
        });
        logger.info("Last track", { lastTrack, selector });

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
                selector,
            });
        }

        logger.info("Saving track", { selector, value });
        await selectorsService.saveTrack({
            selector,
            value,
        });

        await page.close();

        return values;
    });

    await browser.close();
};

module.exports = { start };
