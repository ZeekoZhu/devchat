import { v4 as uuidv4 } from 'uuid';
import { IDevChatIpc } from './iobase';
import { cloneDeep, entries } from 'lodash-es';

export abstract class Widget {
  abstract toChatmark(): string;

  abstract parseResponse(response: Record<string, unknown>): void;

  protected idPrefix: string;

  protected constructor(public actions: { submit?: string; cancel?: string }) {
    this.idPrefix = Widget.generateIdPrefix();
  }

  private rendered = false;

  async render(ipc: IDevChatIpc) {
    if (this.rendered) {
      throw new Error('Widget can only be rendered once');
    }

    this.rendered = true;

    let header = '```chatmark';
    if (this.actions.submit) {
      header += ` submit=${this.actions.submit}`;
    }
    if (this.actions.cancel) {
      header += ` cancel=${this.actions.cancel}`;
    }
    const lines = [header, this.toChatmark(), '```'];
    const chatmark = lines.join('\n');
    const response = await ipc.send<Record<string, unknown>>(chatmark);
    this.parseResponse(response);
  }

  static generateIdPrefix() {
    return uuidv4();
  }

  static generateId(idPrefix: string, index: string) {
    return `${idPrefix}_${index}`;
  }

  static parseId(id: string) {
    const parts = id.split('_');
    return { prefix: parts[0], id: parts[1] };
  }
}

export type CheckboxOption = { label: string; key: string; checked?: boolean };

export class Checkbox extends Widget {
  public options: CheckboxOption[];
  private readonly title?: string;

  constructor(props: {
    title?: string;
    submitButtonName?: string;
    cancelButtonName?: string;
    options: CheckboxOption[];
  }) {
    super({ submit: props.submitButtonName, cancel: props.cancelButtonName });
    this.title = props.title;
    // ensure option key is unique
    const keys = new Set<string>(props.options.map((option) => option.key));
    if (keys.size !== props.options.length) {
      throw new Error(
        `Option must have unique keys: ${JSON.stringify(props.options)}`
      );
    }
    // ensure options keys are not empty
    if (props.options.some((option) => !option.key)) {
      throw new Error(
        `Option must have non-empty keys: ${JSON.stringify(props.options)}`
      );
    }
    this.options = cloneDeep(props.options);
    for (const optionsKey in this.options) {
      if (this.options[optionsKey].checked == null) {
        this.options[optionsKey].checked = false;
      }
    }
  }

  option(key: string) {
    return this.options.find((option) => option.key === key);
  }

  /**
   * @param response
   */
  parseResponse(response: Record<string, string>): void {
    entries(response).forEach(([key, value]) => {
      const { prefix, id: optionKey } = Widget.parseId(key);
      if (prefix !== this.idPrefix) {
        return;
      }
      const option = this.option(optionKey);
      if (!option) {
        return;
      }
      option.checked = value === 'checked';
    });
  }

  /**
   * ```chatmark
   * Which files would you like to commit? I've suggested a few.
   * > [x](file1) devchat/engine/prompter.py
   * > [x](file2) devchat/prompt.py
   * > [](file3) tests/test_cli_prompt.py
   * ```
   */
  toChatmark(): string {
    const lines: string[] = [];
    if (this.title) {
      lines.push(this.title);
    }

    for (const option of this.options) {
      const checked = option.checked ? 'x' : '';
      lines.push(
        `> [${checked}](${Widget.generateId(this.idPrefix, option.key)}) ${
          option.label
        }`
      );
    }

    return lines.join('\n');
  }
}
