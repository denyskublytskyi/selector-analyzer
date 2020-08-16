const shouldNotify = require("./shouldNotify");

describe("shouldNotify", () => {
    test("Should notify when 'notifyWhen' parameter is not specified or is invalid", () => {
        expect(shouldNotify("newValue", "oldValue")).toBe(true);
        expect(shouldNotify("newValue", "oldValue", {})).toBe(true);
        expect(shouldNotify("newValue", "oldValue", { type: "increase" })).toBe(
            true
        );
    });

    test("Should notify when value was decreased on specified value", () => {
        expect(
            shouldNotify("9500 UAH", "10500 UAH", {
                type: "decrease",
                value: 1000,
            })
        ).toBe(true);
        expect(
            shouldNotify("8500 UAH", "10500 UAH", {
                type: "decrease",
                value: 1000,
            })
        ).toBe(true);
    });

    test("Shouldn't notify when value was decreased on less than specified value", () => {
        expect(
            shouldNotify("11000 UAH", "10500 UAH", {
                type: "decrease",
                value: 1000,
            })
        ).toBe(false);
        expect(
            shouldNotify("10000 UAH", "10500 UAH", {
                type: "decrease",
                value: 1000,
            })
        ).toBe(false);
    });

    test("Shouldn notify when value was changed to non numeric", () => {
        expect(
            shouldNotify("UAH", "10500 UAH", {
                type: "decrease",
                value: 1000,
            })
        ).toBe(true);
    });
});
