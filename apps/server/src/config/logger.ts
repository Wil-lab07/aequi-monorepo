import pino from 'pino'
import type { LoggerOptions } from 'pino'

const isDevelopment = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

export const loggerConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Disable logger in test environment
  enabled: !isTest,
  
  // Development: Pretty print
  // Production: JSON for log aggregation
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
    
  // Redact sensitive data
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'password',
      'token',
      'secret',
      'apiKey',
    ],
    censor: '[REDACTED]',
  },
  
  // Serializers for consistent logging
  serializers: {
    req(request) {
      return {
        method: request.method,
        url: request.url,
        headers: request.headers,
        remoteAddress: request.socket?.remoteAddress,
        remotePort: request.socket?.remotePort,
      }
    },
    res(reply) {
      return {
        statusCode: reply.statusCode,
      }
    },
    err: pino.stdSerializers.err,
  },
}
