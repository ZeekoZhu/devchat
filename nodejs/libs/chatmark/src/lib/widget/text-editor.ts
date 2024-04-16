import { ISubmitableWidgetProps, Widget } from './widget';
import { pick } from 'lodash-es';

export interface ITextEditorProps extends ISubmitableWidgetProps {
  value: string;
}

export class TextEditor extends Widget {
  value: string;
  protected editorId = Widget.generateId(this.idPrefix, 'editor');

  constructor(protected props: ITextEditorProps) {
    super(pick(props, ['submit', 'cancel']));
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
