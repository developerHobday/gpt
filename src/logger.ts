import * as winston from 'winston';
import { config } from './config.js';
import {
    fileURLToPath
  } from 'url';

const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
      Object.assign(info, { message: info.stack });
    }
    return info;
  });

const upperCaseLevel = winston.format((info) => {
    info.level = info.level.toUpperCase() // must be done before colorize
    return info
});

winston.addColors({ label: 'cyan' });
const colorizer = winston.format.colorize();
const myFormat = winston.format.printf( ({ level, label, message, timestamp }) => {
    const coloredLabel = colorizer.colorize('label', label)
    return `${timestamp} ${level} ${coloredLabel}: ${message}`;
});

const getFileName = () => {
    return 'Automator'
    // returns logger.ts for now
    const path = fileURLToPath(import.meta.url)
    const parts = path.split('/')
    return parts.slice(-1)[0]
}

export const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({label: getFileName() }),
        enumerateErrorFormat(),
        upperCaseLevel(),
        config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
        winston.format.splat(),
        myFormat,
        // winston.format.printf(({ level, message }) => 
        //     `${level}: Automator ${message}`)
    ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error'],
        }),
    ],
});

