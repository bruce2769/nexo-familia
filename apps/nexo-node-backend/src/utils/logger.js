const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

const transport = isProduction
    ? undefined // En producción usa stdout json stream nativo de pino (el más rápido y seguro)
    : pino.transport({
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    });

const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    base: { service: 'nexo-backend', env: process.env.NODE_ENV }
}, transport);

module.exports = logger;
