import { beforeAll, expect } from 'vitest';
import { noop } from 'lodash-es';
import { Checkbox } from './checkbox.mjs';
import { _IdSeparator, Widget } from './widget.mjs';
import { Form } from './form.mjs';
import { TextEditor } from './text-editor.mjs';
import { IDevChatIpc } from '../iobase.mjs';

const idPrefix = '3c17158c-10bb-47dd-bfd7-df1ffc099971';
const fieldWidgetId = (field: string, key: string) =>
  `${field}:${idPrefix}${_IdSeparator}${key}`;

beforeAll(() => {
  vi.spyOn(Widget, 'generateIdPrefix').mockReturnValue(idPrefix);
});

function createTestForm() {
  return new Form({
    children: [
      'label 1',
      ['textField', new TextEditor({ value: 'text editor value' })],
      [
        'checkbox',
        new Checkbox({
          title: 'checkbox title',
          options: [
            { label: 'foo', key: 'foo', checked: true },
            { label: 'bar', key: 'bar' },
          ],
        }),
      ],
    ] as const,
  });
}

test('can render', async () => {
  const form = createTestForm();

  const ipc = {
    send: noop,
  } as unknown as IDevChatIpc;
  const sendSpy = vi.spyOn(ipc, 'send');

  sendSpy.mockReturnValue(
    Promise.resolve({
      [fieldWidgetId('textField', 'editor')]: 'updated text',
      [fieldWidgetId('checkbox', 'foo')]: 'unchecked',
      [fieldWidgetId('checkbox', 'bar')]: 'checked',
    })
  );

  await form.render(ipc);
  expect(sendSpy).toBeCalledTimes(1);
  expect(sendSpy.mock.lastCall[0]).toMatchInlineSnapshot(`
    "\`\`\`chatmark
    label 1
    > | (textField:3c17158c-10bb-47dd-bfd7-df1ffc099971♯editor)
    > text editor value
    checkbox title
    > [x](checkbox:3c17158c-10bb-47dd-bfd7-df1ffc099971♯foo) foo
    > [](checkbox:3c17158c-10bb-47dd-bfd7-df1ffc099971♯bar) bar
    \`\`\`"
  `);
});
test('can render text row', async () => {
  const form = new Form({
    children: [
      'label 1',
      'label 2'
    ]
  });
  const ipc = {
    send: noop
  } as unknown as IDevChatIpc;
  const sendSpy = vi.spyOn(ipc, 'send');
  sendSpy.mockReturnValue(
    Promise.resolve({})
  );
  await form.render(ipc);
  expect(sendSpy).toBeCalledTimes(1);
  expect(sendSpy.mock.lastCall[0]).toMatchInlineSnapshot(`
    "\`\`\`chatmark
    label 1
    label 2
    \`\`\`"
  `);
});

test('can update child widgets', async () => {
  const form = createTestForm();

  const ipc = {
    send: noop,
  } as unknown as IDevChatIpc;
  const sendSpy = vi.spyOn(ipc, 'send');
  sendSpy.mockReturnValue(
    Promise.resolve({
      [fieldWidgetId('textField', 'editor')]: 'updated text',
      [fieldWidgetId('checkbox', 'foo')]: 'unchecked',
      [fieldWidgetId('checkbox', 'bar')]: 'checked',
    })
  );

  await form.render(ipc);

  expect(form.fields.textField.value).toBe('updated text');
  expect(form.fields.checkbox.options).toEqual([
    { label: 'foo', key: 'foo', checked: false },
    { label: 'bar', key: 'bar', checked: true },
  ]);
});
