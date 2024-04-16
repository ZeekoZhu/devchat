import { IWidgetProps, Widget } from './widget';
import { cloneDeep, entries } from 'lodash-es';
import { ICheckboxOption } from './checkbox';

export interface IOptionsWidgetItem {
  label: string;
  key: string;
}

export interface IOptionsWidgetProps<T extends IOptionsWidgetItem>
  extends IWidgetProps {
  options: T[];
  title?: string;
}

/**
 * the base class for widgets that present a list of options to the user
 */
export abstract class OptionsWidget<
  T extends IOptionsWidgetItem
> extends Widget {
  public options: T[];
  protected readonly title?: string;

  protected constructor(props: IOptionsWidgetProps<T>) {
    super(props);
    this.title = props.title;
    OptionsWidget.validateOptions(props.options);
    this.options = cloneDeep(props.options);
  }

  protected static validateOptions(optionsInput: ICheckboxOption[]) {
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

  option(key: string): T | undefined {
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
      if (option) {
        this.onOptionChange(option, value);
      }
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
      lines.push(`> ${this.lineChatmark(option)}`);
    }

    return lines.join('\n');
  }

  abstract onOptionChange(option: T, payload: unknown): void;

  abstract lineChatmark(option: T): string;
}
