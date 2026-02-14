// Debug utility to manage console logs
// Only outputs logs in development mode

export const DEBUG = import.meta.env.DEV;

export const log = {
    info: (...args: any[]) => {
        if (DEBUG) console.log(...args);
    },
    warn: (...args: any[]) => {
        if (DEBUG) console.warn(...args);
    },
    error: (...args: any[]) => {
        // Errors should always be logged
        console.error(...args);
    },
    // Specialized loggers
    map: (...args: any[]) => {
        if (DEBUG) console.log('[Map]', ...args);
    },
    game: (...args: any[]) => {
        if (DEBUG) console.log('[Game]', ...args);
    },
    data: (...args: any[]) => {
        if (DEBUG) console.log('[Data]', ...args);
    }
};
