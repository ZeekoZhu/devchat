import {
  IOptionsWidgetItem,
  IOptionsWidgetProps,
  OptionsWidget,
} from './options-widget';
import { Widget } from './widget';

export interface IButtonOption extends IOptionsWidgetItem {
  clicked?: boolean;
}

export interface IButtonsProps extends IOptionsWidgetProps<IButtonOption> {
  options: IButtonOption[];
}

export class Buttons extends OptionsWidget<IButtonOption> {
  constructor(props: IButtonsProps) {
    super(props);
    for (const optionsKey in this.options) {
      if (this.options[optionsKey].clicked == null) {
        this.options[optionsKey].clicked = false;
      }
    }
  }

  get clicked(): IButtonOption | undefined {
    return this.options.find((option) => option.clicked);
  }

  lineChatmark(option: IButtonOption): string {
    return `(${Widget.generateId(this.idPrefix, option.key)}) ${option.label}`;
  }

  onOptionChange(option: IButtonOption, payload: unknown): void {
    if (payload === 'clicked') {
      option.clicked = true;
    }
  }
}
