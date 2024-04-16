import { noop } from 'lodash-es';
import { beforeAll, expect } from 'vitest';

import { IDevChatIpc } from './iobase';
import { Checkbox, Widget } from './widget';

describe('checkbox', () => {
  const checkboxPrefix = '3c17158c-10bb-47dd-bfd7-df1ffc099971';
  const optionId = (key: string) => `${checkboxPrefix}_${key}`;
  beforeAll(() => {
    vi.spyOn(Widget, 'generateIdPrefix').mockReturnValue(checkboxPrefix);
  });

  test('can render', async () => {
    const checkbox = new Checkbox({
      title: 'title',
      options: [
        { label: 'foo', key: 'foo' },
        { label: 'bar', key: 'bar' },
      ],
      cancelButtonName: 'cancel checkbox',
      submitButtonName: 'submit checkbox',
    });
    const ipc = {
      send: noop,
    } as unknown as IDevChatIpc;

    let sendSpy = vi.spyOn(ipc, 'send');
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

    let sendSpy = vi.spyOn(ipc, 'send');
    sendSpy.mockReturnValue(Promise.resolve({ [optionId('foo')]: 'checked' }));
    await checkbox.render(ipc);
    expect(checkbox.options).toEqual([
      { label: 'foo', key: 'foo', checked: true },
      { label: 'bar', key: 'bar', checked: false },
    ]);
  });
});
