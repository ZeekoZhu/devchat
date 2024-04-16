import { IWidgetProps, Widget } from './widget.mjs';

export interface ITextEditorProps extends IWidgetProps {
  title?: string;
  value: string;
}

export class TextEditor extends Widget {
  value: string;

  protected get editorId() {
    return Widget.generateId(this.idPrefix, 'editor');
  }

  constructor(protected props: ITextEditorProps) {
    super(props);
    this.value = props.value;
  }

  parseResponse(response: Record<string, unknown>): void {
    this.value = response[this.editorId] as string;
  }

  toChatmark(): string {
    const lines: string[] = [];

    if (this.props.title) {
      lines.push(this.props.title);
    }

    lines.push(`> | (${this.editorId})`);
    this.value
      .split('\n')
      .map((l) => `> ${l}`)
      .forEach((l) => lines.push(l));

    return lines.join('\n');
  }
}
