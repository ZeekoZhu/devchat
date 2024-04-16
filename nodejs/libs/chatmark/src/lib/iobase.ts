import {
  concatMap,
  EMPTY,
  filter,
  firstValueFrom,
  from,
  Observable,
  of,
  reduce,
  scan,
  share,
  timeout,
} from 'rxjs';
import * as Yaml from 'yaml';
import * as tty from 'node:tty';

export interface IDevChatIpc {
  send: <T>(msg: string) => Promise<T>;
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
}

export const createStdIOIpc = ({
  stdout = process.stdout,
  stdin = process.stdin,
}: StdIOIpcOptions) => {
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
    // to lines of string
    concatMap(parseLine()),
    concatMap(parseMessage()),
    share()
  );
  messages$.subscribe();
  return {
    send: async <T>(msg: string) => {
      await new Promise<void>((resolve, reject) => {
        const content = `"""\n${msg}\n"""`;
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
