import { Widget } from './widget.mjs';
import {
  IOptionsWidgetItem,
  IOptionsWidgetProps,
  OptionsWidget,
} from './options-widget.mjs';

export interface ICheckboxOption extends IOptionsWidgetItem {
  checked?: boolean;
}

export interface ICheckboxProps extends IOptionsWidgetProps<ICheckboxOption> {
  options: ICheckboxOption[];
}

export class Checkbox extends OptionsWidget<ICheckboxOption> {
  constructor(props: ICheckboxProps) {
    super(props);
    for (const optionsKey in this.options) {
      if (this.options[optionsKey].checked == null) {
        this.options[optionsKey].checked = false;
      }
    }
  }

  onOptionChange(option: ICheckboxOption, payload: unknown) {
    option.checked = payload === 'checked';
  }

  lineChatmark(option: ICheckboxOption): string {
    return `[${option.checked ? 'x' : ''}](${Widget.generateId(
      this.idPrefix,
      option.key
    )}) ${option.label}`;
  }
}
