import {
  concatMap,
  EMPTY,
  firstValueFrom,
  from,
  Observable,
  of,
  share, tap
} from 'rxjs';
import * as Yaml from 'yaml';
import * as tty from 'node:tty';
import pino, { Logger } from 'pino';

export interface IDevChatIpc {
  send: <T>(msg: string) => Promise<T>;
  oneWaySend: (msg: string) => void;
  sendError: (msg: string) => void;
  messages: Observable<Record<string, string>>;
}

const parseLine = () => {
  let buffer = '';
  return (data: string) => {
    const content = buffer + data;
    const lines = content.split('\n');
    const last = lines.pop();
    buffer = last || '';
    if (lines.length > 0) {
      return from(lines);
    }
    return EMPTY;
  };
};

const parseMessage = () => {
  let buffer = '';
  return (line: string) => {
    if (line.startsWith('```yaml')) {
      buffer = '';
    } else if (line.trimEnd() === '```') {
      const yamlContent = buffer;
      buffer = '';
      try {
        const msg = Yaml.parse(yamlContent);
        return of(msg);
      } catch (e) {
        console.error('[iobase] Error parsing yaml', e);
      }
    } else {
      buffer += line + '\n';
    }
    return EMPTY;
  };
};

interface StdIOIpcOptions {
  stdout?: tty.WriteStream;
  stdin?: tty.ReadStream;
  stderr?: tty.WriteStream;
  logger?: Logger;
}

export const createStdIOIpc = ({
  stdout = process.stdout,
  stdin = process.stdin,
  stderr = process.stderr,
  logger = pino()
}: StdIOIpcOptions) => {
  const dataLogger = logger.child({ category: 'ipc.data' });
  const lineLogger = logger.child({ category: 'ipc.line' });
  const messageLogger = logger.child({ category: 'ipc.message' });
  const messages$ = new Observable((subscriber) => {
    stdin.setEncoding('utf-8');
    const handleOnData = (data: string) => {
      subscriber.next(data);
    };
    stdin.on('data', handleOnData);
    stdin.on('close', () => {
      subscriber.complete();
    });
    stdin.on('end', () => {
      subscriber.complete();
    });
    stdin.on('error', (err) => {
      subscriber.error(err);
    });
    return () => {
      stdin.removeAllListeners('data');
      stdin.removeAllListeners('close');
      stdin.removeAllListeners('end');
      stdin.removeAllListeners('error');
    };
  }).pipe(
    tap((data) => dataLogger.trace(data)),
    concatMap(parseLine()),
    tap((line) => lineLogger.trace(line)),
    concatMap(parseMessage()),
    tap((msg) => messageLogger.debug(msg)),
    share()
  );
  messages$.subscribe();
  return {
    oneWaySend: (msg: string) => {
      logger.debug(`oneWaySend: ${msg}`);
      stdout.write(msg);
    },
    sendError: (msg: string) => {
      logger.error(`sendError: ${msg}`);
      stderr.write(msg);
    },
    send: async <T,>(msg: string) => {
      await new Promise<void>((resolve, reject) => {
        const content = `\n${msg}\n`;
        logger.debug(`send: ${content}`);
        stdout.write(content, (err) => {
          if (err) {
            reject(err);
          }
        });
        resolve();
      });
      return (await firstValueFrom(messages$)) as Promise<T>;
    },
    messages: messages$,
  } as IDevChatIpc;
};
