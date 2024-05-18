import { $, os, ProcessPromise  } from 'zx';
import * as path from 'node:path';
import { nanoid } from 'nanoid';
import { IRenderable } from './widget/index.mjs';
import { createStdIOIpc, IDevChatIpc } from './iobase.mjs';
import pino, { Logger } from 'pino';
import { ChatOpenAI } from '@langchain/openai';
import { get } from 'lodash-es';

const createWorkflowShell = (logger: Logger, ipc: IDevChatIpc) => {
  return (
    pieces: TemplateStringsArray,
    ...args: unknown[]
  ): ProcessPromise => {
    const processPromise = $(pieces, ...args)
      .stdio('pipe', 'pipe', 'pipe')
      .quiet();
    logger.debug(`Running: ${get(processPromise, '_command')}`);
    processPromise.stdout.on('data', (data) => {
        logger.debug(`stdout: ${data}`);
      });
    processPromise.stderr.on('data', (data) => {
        logger.error(`stderr: ${data}`);
      });
    processPromise.catch((err) => {
      logger.error(err, 'Error running shell command');
      ipc.sendError(
        `Error: ${err.message}`
      );
      throw err;
    });

    return processPromise;
  };
};

export class WorkflowContext {
  /**
   * Execute a shell command in the workflow context
   * equivalent to `zx`: $`command`.stdio('pipe', 'pipe', 'pipe').quiet()
   */
  exec = createWorkflowShell(this.logger, this.ipc);

  constructor(protected ipc: IDevChatIpc, protected logger: Logger, private logFile: string) {
    if (this.logger.isLevelEnabled('debug')) {
      this.println('DEBUG MODE ENABLED');
      this.println(`Logs are being written to ${this.logFile}`);
    }
  }

  async render(widget: IRenderable) {
    await widget.render(this.ipc);
  }

  print(text: string) {
    this.ipc.oneWaySend(text);
  }

  println(text: string) {
    this.ipc.oneWaySend(text + '<br/>');
  }

  llm(options?: { model?: string }) {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: options?.model
    }, {
      baseURL: process.env.OPENAI_BASE_URL
    });
  }

  getLogger() {
    return this.logger.child({ category: 'workflow.command' });
  }
}

export const createWorkflow = (options: { loglevel?: 'trace' | 'debug' | 'error' } = {}) => {
  let logFile = path.join(os.tmpdir(), `devchat-${nanoid(6)}.log`);
  const logger = pino(pino.destination(logFile));
  logger.level = options.loglevel ?? 'error';
  const ipc = createStdIOIpc({ logger: logger.child({ category: 'ipc' }) });
  return new WorkflowContext(ipc, logger.child({ category: 'workflow' }), logFile);
};
