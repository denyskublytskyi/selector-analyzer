const shouldNotify = (newValue, oldValue, notifyWhen) => {
    if (!notifyWhen || !notifyWhen.type || !notifyWhen.value) {
        return true;
    }

    const parsedNewValue = parseFloat(newValue);
    const parsedOldValue = parseFloat(oldValue);

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(parsedNewValue) || isNaN(parsedOldValue)) {
        return true;
    }

    return (
        notifyWhen.type === "decrease" &&
        parsedOldValue - parsedNewValue >= notifyWhen.value
    );
};

module.exports = shouldNotify;
