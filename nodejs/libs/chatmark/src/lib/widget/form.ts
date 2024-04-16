import { Widget } from './widget';
import { IDevChatIpc } from '../iobase';
import { Buttons } from './buttons';
import { get, set } from 'lodash-es';

export interface IFormProps<T extends FormPropChild[]> {
  /**
   * `Buttons` can not be used in a form.
   */
  children: T;
  title?: string;
  actions?: {
    submit?: string;
    cancel?: string;
  };
}

export type FormPropChild = string | [string, Widget];

/**
 * Extract the components from the form props, ignore the string children
 */
export type WidgetFields<T extends readonly FormPropChild[]> = {
  [K in keyof T as T[K] extends [string, Widget]
    ? T[K][0] extends string
      ? T[K][0]
      : never
    : never]: T[K] extends [string, infer TW] ? TW : never;
};

function isWidgetChild(child: FormPropChild): child is [string, Widget] {
  return Array.isArray(child);
}

/**
 * A container for multiple widgets.
 */
export class Form<T extends FormPropChild[]> {
  fields: WidgetFields<T>;
  protected rendered = false;

  constructor(protected props: IFormProps<T>) {
    this.fields = {} as WidgetFields<T>;
    for (const child of props.children) {
      if (isWidgetChild(child)) {
        const [field, widget] = child;
        if (widget instanceof Buttons) {
          throw new Error('Buttons cannot be used in a form');
        }
        this.fields[field] = widget;
        // hack to ensure that the idPrefix is unique for each component in tests
        set(widget, 'idPrefix', field + ':' + get(widget, 'idPrefix'));
      } else if (typeof child === 'string') {
        // ignore string children
      } else {
        throw new Error(`Invalid component type: ${child}`);
      }
    }
  }

  toChatmark(): string {
    const lines: string[] = [];
    if (this.props.title) {
      lines.push(this.props.title);
    }
    for (const key in this.fields) {
      const component = this.fields[key];
      if (typeof component === 'string') {
        lines.push(component);
      } else if (component instanceof Widget) {
        lines.push(component.toChatmark());
      } else {
        throw new Error(`Invalid component type: ${component}`);
      }
    }

    return lines.join('\n');
  }

  parseResponse(response: Record<string, unknown>) {
    for (const key in this.fields) {
      const component = this.fields[key];
      if (component instanceof Widget) {
        component.parseResponse(response);
      }
    }
  }

  async render(ipc: IDevChatIpc) {
    if (this.rendered) {
      throw new Error('Form can only be rendered once');
    }

    this.rendered = true;

    let header = '```chatmark';
    if (this.props.actions?.submit) {
      header += ` submit=${this.props.actions.submit}`;
    }
    if (this.props.actions?.cancel) {
      header += ` cancel=${this.props.actions.cancel}`;
    }
    const lines = [header, this.toChatmark(), '```'];
    const chatmark = lines.join('\n');
    const response = await ipc.send<Record<string, unknown>>(chatmark);
    this.parseResponse(response);
  }
}
