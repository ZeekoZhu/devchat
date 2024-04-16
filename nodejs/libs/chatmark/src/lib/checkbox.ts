import { cloneDeep, entries } from 'lodash-es';
import { ISubmitableWidgetProps, Widget } from './widget';

export type CheckboxOption = { label: string; key: string; checked?: boolean };

export class Checkbox extends Widget {
  public options: CheckboxOption[];
  private readonly title?: string;

  constructor(
    props: {
      options: CheckboxOption[];
    } & ISubmitableWidgetProps
  ) {
    super({ submit: props.submit, cancel: props.cancel });
    this.title = props.title;
    const optionsInput = props.options;
    Checkbox.validateOptions(optionsInput);
    this.options = cloneDeep(optionsInput);
    for (const optionsKey in this.options) {
      if (this.options[optionsKey].checked == null) {
        this.options[optionsKey].checked = false;
      }
    }
  }

  private static validateOptions(optionsInput: CheckboxOption[]) {
    // ensure option key is unique
    const keys = new Set<string>(optionsInput.map((option) => option.key));
    if (keys.size !== optionsInput.length) {
      throw new Error(
        `Option must have unique keys: ${JSON.stringify(optionsInput)}`
      );
    }
    // ensure options keys are not empty
    if (optionsInput.some((option) => !option.key)) {
      throw new Error(
        `Option must have non-empty keys: ${JSON.stringify(optionsInput)}`
      );
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
