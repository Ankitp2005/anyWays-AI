import winston from 'winston';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'info'; // Set default to info to see HTTP logs
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => {
            const { timestamp, level, message, ...meta } = info;
            const metaString = Object.keys(meta).length ? `\n\t${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} ${level}: ${message}${metaString}`;
        }
    ),
);

const transports = [
    new winston.transports.Console(),
];

const Logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
});

export default Logger;
