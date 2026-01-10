export interface Logger {
  trace(msg: string, obj?: object): void
  debug(msg: string, obj?: object): void
  info(msg: string, obj?: object): void
  warn(msg: string, obj?: object): void
  error(msg: string, obj?: object): void
  fatal(msg: string, obj?: object): void
  child(bindings: object): Logger
}

class ConsoleLogger implements Logger {
  constructor(private readonly bindings: object = {}) {}

  private log(level: string, msg: string, obj?: object) {
    const timestamp = new Date().toISOString()
    const data = { ...this.bindings, ...obj, level, msg, timestamp }
    // Use process.stdout for Node.js environments
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(JSON.stringify(data) + '\n')
    }
  }

  trace(msg: string, obj?: object): void {
    this.log('trace', msg, obj)
  }

  debug(msg: string, obj?: object): void {
    this.log('debug', msg, obj)
  }

  info(msg: string, obj?: object): void {
    this.log('info', msg, obj)
  }

  warn(msg: string, obj?: object): void {
    this.log('warn', msg, obj)
  }

  error(msg: string, obj?: object): void {
    this.log('error', msg, obj)
  }

  fatal(msg: string, obj?: object): void {
    this.log('fatal', msg, obj)
  }

  child(bindings: object): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings })
  }
}

let globalLogger: Logger = new ConsoleLogger()

export function setLogger(logger: Logger): void {
  globalLogger = logger
}

export function getLogger(): Logger {
  return globalLogger
}

export const logger = {
  trace: (msg: string, obj?: object) => globalLogger.trace(msg, obj),
  debug: (msg: string, obj?: object) => globalLogger.debug(msg, obj),
  info: (msg: string, obj?: object) => globalLogger.info(msg, obj),
  warn: (msg: string, obj?: object) => globalLogger.warn(msg, obj),
  error: (msg: string, obj?: object) => globalLogger.error(msg, obj),
  fatal: (msg: string, obj?: object) => globalLogger.fatal(msg, obj),
  child: (bindings: object) => globalLogger.child(bindings),
}
