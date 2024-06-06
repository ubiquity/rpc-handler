import util from "util";
type PrettyLogsWithOk = "ok" | (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];
type Colors = (typeof COLOURS)[keyof typeof COLOURS];

export class PrettyLogs {
  constructor() {
    this.ok = this.ok.bind(this);
    this.info = this.info.bind(this);
    this.error = this.error.bind(this);
    this.fatal = this.fatal.bind(this);
    this.debug = this.debug.bind(this);
    this.verbose = this.verbose.bind(this);
  }
  public fatal(message: string, metadata?: Metadata) {
    this._logWithStack(LOG_LEVEL.FATAL, message, metadata);
  }

  public error(message: string, metadata?: Metadata) {
    this._logWithStack(LOG_LEVEL.ERROR, message, metadata);
  }

  public ok(message: string, metadata?: Metadata) {
    this._logWithStack("ok", message, metadata);
  }

  public info(message: string, metadata?: Metadata) {
    this._logWithStack(LOG_LEVEL.INFO, message, metadata);
  }

  public debug(message: string, metadata?: Metadata) {
    this._logWithStack(LOG_LEVEL.DEBUG, message, metadata);
  }

  public verbose(message: string, metadata?: Metadata) {
    this._logWithStack(LOG_LEVEL.VERBOSE, message, metadata);
  }

  private _logWithStack(type: PrettyLogsWithOk, message: string, metadata?: Metadata | string) {
    this._log(type, message);
    if (typeof metadata === "string") {
      this._log(type, metadata);
      return;
    }
    if (metadata) {
      let stack = metadata?.error?.stack || metadata?.stack;
      if (!stack) {
        // generate and remove the top four lines of the stack trace
        const stackTrace = new Error().stack?.split("\n");
        if (stackTrace) {
          stackTrace.splice(0, 4);
          stack = stackTrace.filter((line) => line.includes(".ts:")).join("\n");
        }
      }
      const newMetadata = { ...metadata };
      delete newMetadata.message;
      delete newMetadata.name;
      delete newMetadata.stack;

      if (!this._isEmpty(newMetadata)) {
        this._log(type, newMetadata);
      }

      if (typeof stack == "string") {
        const prettyStack = this._formatStackTrace(stack, 1);
        const colorizedStack = this._colorizeText(prettyStack, COLOURS.dim);
        this._log(type, colorizedStack);
      } else if (stack) {
        const prettyStack = this._formatStackTrace((stack as unknown as string[]).join("\n"), 1);
        const colorizedStack = this._colorizeText(prettyStack, COLOURS.dim);
        this._log(type, colorizedStack);
      } else {
        throw new Error("Stack is null");
      }
    }
  }

  private _colorizeText(text: string, color: Colors): string {
    if (!color) {
      throw new Error(`Invalid color: ${color}`);
    }
    return color.concat(text).concat(COLOURS.reset);
  }

  private _formatStackTrace(stack: string, linesToRemove = 0, prefix = ""): string {
    const lines = stack.split("\n");
    for (let i = 0; i < linesToRemove; i++) {
      lines.shift(); // Remove the top line
    }
    return lines
      .map((line) => `${prefix}${line.replace(/\s*at\s*/, "  ↳  ")}`) // Replace 'at' and prefix every line
      .join("\n");
  }

  private _isEmpty(obj: Record<string, unknown>) {
    return !Reflect.ownKeys(obj).some((key) => typeof obj[String(key)] !== "function");
  }

  private _log(type: PrettyLogsWithOk, message: unknown) {
    const defaultSymbols: Record<PrettyLogsWithOk, string> = {
      fatal: "×",
      ok: "✓",
      error: "⚠",
      info: "›",
      debug: "››",
      verbose: "💬",
    };

    const symbol = defaultSymbols[type];

    // Formatting the message
    const messageFormatted = typeof message === "string" ? message : util.inspect(message, { showHidden: true, depth: null, breakLength: Infinity });
    // const messageFormatted =
    //   typeof message === "string" ? message : JSON.stringify(Logs.convertErrorsIntoObjects(message));

    // Constructing the full log string with the prefix symbol
    const lines = messageFormatted.split("\n");
    const logString = lines
      .map((line, index) => {
        // Add the symbol only to the first line and keep the indentation for the rest
        const prefix = index === 0 ? `\t${symbol}` : `\t${" ".repeat(symbol.length)}`;
        return `${prefix} ${line}`;
      })
      .join("\n");

    const fullLogString = logString;

    const colorMap: Record<PrettyLogsWithOk, [keyof typeof console, Colors]> = {
      fatal: ["error", COLOURS.fgRed],
      ok: ["log", COLOURS.fgGreen],
      error: ["warn", COLOURS.fgYellow],
      info: ["info", COLOURS.dim],
      debug: ["debug", COLOURS.fgMagenta],
      verbose: ["debug", COLOURS.dim],
    };

    const _console = console[colorMap[type][0] as keyof typeof console] as (...args: string[]) => void;
    if (typeof _console === "function") {
      _console(this._colorizeText(fullLogString, colorMap[type][1]));
    } else {
      throw new Error(fullLogString);
    }
  }
}
interface Metadata {
  error?: { stack?: string };
  stack?: string;
  message?: string;
  name?: string;
  [key: string]: unknown;
}

const COLOURS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
} as const;

export const LOG_LEVEL = {
  FATAL: "fatal",
  ERROR: "error",
  INFO: "info",
  VERBOSE: "verbose",
  DEBUG: "debug",
} as const;
