// Debug utility to manage console logs
// Only outputs logs in development mode

export const DEBUG = import.meta.env.DEV;

export const log = {
    info: (...args: unknown[]) => {
        if (DEBUG) console.log(...args);
    },
    warn: (...args: unknown[]) => {
        if (DEBUG) console.warn(...args);
    },
    error: (...args: unknown[]) => {
        // Errors should always be logged
        console.error(...args);
    },
    // Specialized loggers
    map: (...args: unknown[]) => {
        if (DEBUG) console.log('[Map]', ...args);
    },
    game: (...args: unknown[]) => {
        if (DEBUG) console.log('[Game]', ...args);
    },
    data: (...args: unknown[]) => {
        if (DEBUG) console.log('[Data]', ...args);
    }
};
