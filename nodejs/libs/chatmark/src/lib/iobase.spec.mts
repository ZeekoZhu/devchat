import { createStdIOIpc } from './iobase.mjs';
import * as tty from 'node:tty';
import { firstValueFrom, toArray } from 'rxjs';
import pino from 'pino';

test('can write msg to stdout', async () => {
  const stdout = {
    buffer: '',
    write: (content: string, cb: (err: Error | null) => void) => {
      stdout.buffer += content;
      cb(null);
    },
  };
  const stdin = new FakeReadStream();
  const ipc = createStdIOIpc({
    stdout: stdout as unknown as tty.WriteStream,
    stdin: stdin as unknown as tty.ReadStream,
  });
  const msg = 'hello';
  const task = ipc.send(msg);
  await stdin.playChunks(['```yaml\n', 'foo: bar\n', '```\n']);
  const result = await task;
  expect(stdout.buffer).toBe(`\n${msg}\n`);
  expect(result).toEqual({ foo: 'bar' });
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class FakeReadStream {
  callbacks: Map<string, Function> = new Map();

  setEncoding(encoding: string) {}

  on(event: string, cb: Function) {
    this.callbacks.set(event, cb);
    return this;
  }

  async playChunks(chunks: string[]) {
    for (const chunk of chunks) {
      this.data(chunk);
      await delay(10);
    }
    this.end();
  }

  data(chunk: string) {
    this.callbacks.get('data')?.(chunk);
  }

  error(err: Error) {
    this.callbacks.get('error')?.(err);
  }

  end() {
    this.callbacks.get('end')?.();
  }

  removeAllListeners() {}
}

test('can parse messages', async () => {
  const stdin = new FakeReadStream();

  const ipc = createStdIOIpc({ stdin: stdin as unknown as tty.ReadStream, logger: pino() });
  const promise = firstValueFrom(ipc.messages.pipe(toArray()));
  await stdin.playChunks(['```yaml\n', 'foo: bar\n', '```\n']);
  const messages = await promise;
  expect(messages).toEqual([{ foo: 'bar' }]);
});

test('can parse messages with incomplete messages', async () => {
  const stdin = new FakeReadStream();
  const ipc = createStdIOIpc({ stdin: stdin as unknown as tty.ReadStream });

  const promise = firstValueFrom(ipc.messages.pipe(toArray()));
  await stdin.playChunks([
    'hello\n',
    '```yaml\n',
    'foo: bar\n',
    '```\n',
    '```yaml\n',
    'bar: baz\n',
  ]);

  const messages = await promise;

  expect(messages).toEqual([{ foo: 'bar' }]);
});

test('can handle nested yaml', async () => {
  const stdin = new FakeReadStream();
  const ipc = createStdIOIpc({ stdin: stdin as unknown as tty.ReadStream });

  const promise = firstValueFrom(ipc.messages.pipe(toArray()));
  /**
   * ```yaml
   * file: |
   *   ```yaml
   *   foo: bar
   *   ```
   * ```
   */
  await stdin.playChunks([
    '```yaml\n',
    'file: |\n',
    '  ```yaml\n',
    '  foo: bar\n',
    '  ```\n',
    '```\n',
  ]);

  const messages = await promise;

  expect(messages).toEqual([{ file: '```yaml\nfoo: bar\n```\n' }]);
});
