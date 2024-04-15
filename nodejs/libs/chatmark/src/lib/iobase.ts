import { concatMap, EMPTY, filter, from, Observable, of, reduce, scan } from 'rxjs';
import * as Yaml from 'yaml';
import * as tty from 'node:tty';

export interface IDevChatIpc {
  send: (msg: string) => Promise<void>;
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

export const createStdIOIpc = ({ stdout = process.stdout, stdin = process.stdin }: StdIOIpcOptions) => ({
  send: (msg: string) => {
    return new Promise<void>((resolve, reject) => {
      const content = `"""\n${msg}\n"""`;
      stdout.write(content, (err) => {
        if (err) {
          reject(err);
        }
      });
      resolve();
    });
  },
  messages: new Observable(subscriber => {
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
  ),
} as IDevChatIpc);

