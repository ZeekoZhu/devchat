import { noop } from 'lodash-es';
import { beforeAll, describe, expect } from 'vitest';

import { IDevChatIpc } from '../iobase';
import { Widget } from './widget';
import { Checkbox } from './checkbox';
import { TextEditor } from './text-editor';
import { Buttons } from './buttons';

const checkboxPrefix = '3c17158c-10bb-47dd-bfd7-df1ffc099971';
const widgetId = (key: string) => `${checkboxPrefix}_${key}`;
beforeAll(() => {
  vi.spyOn(Widget, 'generateIdPrefix').mockReturnValue(checkboxPrefix);
});
describe('Checkbox', () => {
  test('can render', async () => {
    const checkbox = new Checkbox({
      title: 'title',
      options: [
        { label: 'foo', key: 'foo' },
        { label: 'bar', key: 'bar' },
      ],
      actions: {
        cancel: 'cancel checkbox',
        submit: 'submit checkbox',
      },
    });
    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(Promise.resolve({ foo: 'checked' }));
    await checkbox.render(ipc);
    expect(sendSpy).toBeCalledTimes(1);
    expect(sendSpy.mock.lastCall[0]).toMatchInlineSnapshot(`
        "\`\`\`chatmark submit=submit checkbox cancel=cancel checkbox
        title
        > [](3c17158c-10bb-47dd-bfd7-df1ffc099971_foo) foo
        > [](3c17158c-10bb-47dd-bfd7-df1ffc099971_bar) bar
        \`\`\`"
      `);
  });

  test('update option(key).checked', async () => {
    const checkbox = new Checkbox({
      title: 'title',
      options: [
        { label: 'foo', key: 'foo' },
        { label: 'bar', key: 'bar' },
      ],
    });
    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(Promise.resolve({ [widgetId('foo')]: 'checked' }));
    await checkbox.render(ipc);
    expect(checkbox.options).toEqual([
      { label: 'foo', key: 'foo', checked: true },
      { label: 'bar', key: 'bar', checked: false },
    ]);
  });
});

describe('TextEditor', () => {
  test('can render', async () => {
    const textEditor = new TextEditor({
      value: 'value',
      title: 'editor title',
      actions: {
        submit: 'submit editor',
        cancel: 'cancel editor',
      },
    });

    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(
      Promise.resolve({ [widgetId('editor')]: 'new value' })
    );
    await textEditor.render(ipc);
    expect(sendSpy).toBeCalledTimes(1);
    expect(sendSpy.mock.lastCall[0]).toMatchInlineSnapshot(`
      "\`\`\`chatmark submit=submit editor cancel=cancel editor
      editor title
      > | (3c17158c-10bb-47dd-bfd7-df1ffc099971_editor)
      > value
      \`\`\`"
    `);
  });

  test('can render multi-line value', async () => {
    const textEditor = new TextEditor({
      value: 'line1\nline2\nline3',
    });

    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(
      Promise.resolve({ [widgetId('editor')]: 'new value\nfoo\nbar' })
    );
    await textEditor.render(ipc);

    expect(sendSpy).toBeCalledTimes(1);
    expect(sendSpy.mock.lastCall[0]).toMatchInlineSnapshot(`
      "\`\`\`chatmark
      > | (3c17158c-10bb-47dd-bfd7-df1ffc099971_editor)
      > line1
      > line2
      > line3
      \`\`\`"
    `);
  });

  test('can update value', async () => {
    const textEditor = new TextEditor({
      value: 'line1\nline2\nline3',
    });

    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(
      Promise.resolve({ [widgetId('editor')]: 'new value\nfoo\nbar' })
    );
    await textEditor.render(ipc);

    expect(textEditor.value).toEqual('new value\nfoo\nbar');
  });
});

describe('Buttons', async () => {
  test('can render', async () => {
    const buttons = new Buttons({
      title: 'title',
      options: [
        { label: 'foo', key: 'foo' },
        { label: 'bar', key: 'bar' },
      ],
      actions: {
        cancel: 'cancel buttons',
        submit: 'submit buttons',
      },
    });
    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(Promise.resolve({ foo: 'clicked' }));
    await buttons.render(ipc);
    expect(sendSpy).toBeCalledTimes(1);
    expect(sendSpy.mock.lastCall[0]).toMatchInlineSnapshot(`
        "\`\`\`chatmark submit=submit buttons cancel=cancel buttons
        title
        > (3c17158c-10bb-47dd-bfd7-df1ffc099971_foo) foo
        > (3c17158c-10bb-47dd-bfd7-df1ffc099971_bar) bar
        \`\`\`"
      `);
  });

  test('update option(key).clicked', async () => {
    const buttons = new Buttons({
      title: 'title',
      options: [
        { label: 'foo', key: 'foo' },
        { label: 'bar', key: 'bar' },
      ],
    });
    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(Promise.resolve({ [widgetId('foo')]: 'clicked' }));
    await buttons.render(ipc);
    expect(buttons.options).toEqual([
      { label: 'foo', key: 'foo', clicked: true },
      { label: 'bar', key: 'bar', clicked: false },
    ]);
  });

  test('get clicked', async () => {
    const buttons = new Buttons({
      title: 'title',
      options: [
        { label: 'foo', key: 'foo' },
        { label: 'bar', key: 'bar' },
      ],
    });
    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    const sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(Promise.resolve({ [widgetId('foo')]: 'clicked' }));
    await buttons.render(ipc);
    expect(buttons.clicked).toEqual({
      label: 'foo',
      key: 'foo',
      clicked: true,
    });
  });
});
