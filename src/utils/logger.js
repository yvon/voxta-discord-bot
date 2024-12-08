export default {
    info: (msg, ...args) => console.log(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args),
    debug: (msg, ...args) => console.debug(msg, ...args)
};

