import { v4 as uuidv4 } from 'uuid';
import { IDevChatIpc } from '../iobase.mjs';

export interface IWidgetProps {
  actions?: { submit?: string; cancel?: string };
}

export interface IRenderable {
  render(ipc: IDevChatIpc): Promise<void>;
}

// uncommon utf-8 character
export const _IdSeparator = '♯';
export abstract class Widget implements IRenderable {
  protected idPrefix: string;
  private rendered = false;

  public actions?: { submit?: string; cancel?: string };

  protected constructor({ actions }: IWidgetProps) {
    this.actions = actions;
    this.idPrefix = Widget.generateIdPrefix();
  }

  static generateIdPrefix() {
    return uuidv4();
  }

  static generateId(idPrefix: string, index: string) {
    return `${idPrefix}${_IdSeparator}${index}`;
  }

  static parseId(id: string) {
    const parts = id.split(_IdSeparator);
    return { prefix: parts[0], id: parts[1] };
  }

  abstract toChatmark(): string;

  abstract parseResponse(response: Record<string, unknown>): void;

  async render(ipc: IDevChatIpc) {
    if (this.rendered) {
      throw new Error('Widget can only be rendered once');
    }

    this.rendered = true;

    let header = '```chatmark';
    if (this.actions?.submit) {
      header += ` submit=${this.actions.submit}`;
    }
    if (this.actions?.cancel) {
      header += ` cancel=${this.actions.cancel}`;
    }
    const lines = [header, this.toChatmark(), '```'];
    const chatmark = lines.join('\n');
    const response = await ipc.send<Record<string, unknown>>(chatmark);
    this.parseResponse(response);
  }
}
