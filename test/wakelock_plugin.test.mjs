import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  isEnabled,
  invokePigeonCall,
  NoAbilityContextException,
  toggle,
} from './wakelock_ops.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginSrc = readFileSync(
  join(repoRoot, 'ohos/src/main/ets/components/plugin/WakelockPlugin.ets'),
  'utf8',
);
const pigeonSrc = readFileSync(
  join(repoRoot, 'ohos/src/main/ets/components/plugin/WakelockApi.ets'),
  'utf8',
);

function createWindowApi({
  keepScreenOn = false,
  getLastWindow,
  setWindowKeepScreenOn,
} = {}) {
  let state = keepScreenOn;
  const windowClass = {
    async setWindowKeepScreenOn(enable) {
      if (setWindowKeepScreenOn) {
        return setWindowKeepScreenOn(enable);
      }
      state = enable;
    },
    getWindowProperties() {
      return { isKeepScreenOn: state };
    },
  };
  return {
    getLastWindow:
      getLastWindow ??
      (async () => windowClass),
    getState: () => state,
  };
}

test('Pigeon generated API reports host failures by throwing, not result.error', () => {
  assert.match(pigeonSrc, /abstract toggle\(msg: ToggleMessage\): Promise<void>/);
  assert.match(pigeonSrc, /await api!\.toggle\(/);
  assert.match(pigeonSrc, /catch \(error\)/);
  assert.match(pigeonSrc, /wrapError\(error\)/);
  assert.doesNotMatch(pigeonSrc, /result\.error/);
});

test('toggle: context == null fails the Pigeon call (never silent success)', async () => {
  const windowApi = createWindowApi();
  const outcome = await invokePigeonCall(() => toggle(null, windowApi, true));
  assert.equal(outcome.ok, false);
  assert.ok(outcome.error instanceof NoAbilityContextException);
  assert.equal(outcome.error.code, 'no-ability-context');
});

test('isEnabled: context == null fails the Pigeon call (never false success)', async () => {
  const windowApi = createWindowApi();
  const outcome = await invokePigeonCall(() => isEnabled(null, windowApi));
  assert.equal(outcome.ok, false);
  assert.ok(outcome.error instanceof NoAbilityContextException);
});

test('toggle: getLastWindow reject is an error, never silent success', async () => {
  const windowApi = createWindowApi({
    getLastWindow: async () => {
      throw new Error('getLastWindow failed');
    },
  });
  const outcome = await invokePigeonCall(() =>
    toggle({ ability: true }, windowApi, true),
  );
  assert.equal(outcome.ok, false);
  assert.match(String(outcome.error), /getLastWindow failed/);
});

test('isEnabled: getLastWindow reject is an error, never false success', async () => {
  const windowApi = createWindowApi({
    getLastWindow: async () => {
      throw new Error('getLastWindow failed');
    },
  });
  const outcome = await invokePigeonCall(() => isEnabled({ ability: true }, windowApi));
  assert.equal(outcome.ok, false);
  assert.match(String(outcome.error), /getLastWindow failed/);
});

test('toggle: setWindowKeepScreenOn reject is an error, never silent success', async () => {
  const windowApi = createWindowApi({
    setWindowKeepScreenOn: async () => {
      throw new Error('setWindowKeepScreenOn failed');
    },
  });
  const outcome = await invokePigeonCall(() =>
    toggle({ ability: true }, windowApi, true),
  );
  assert.equal(outcome.ok, false);
  assert.match(String(outcome.error), /setWindowKeepScreenOn failed/);
});

test('happy path: toggle sets keep-screen-on and isEnabled reads it back', async () => {
  const windowApi = createWindowApi({ keepScreenOn: false });
  const context = { ability: true };

  const toggleOn = await invokePigeonCall(() => toggle(context, windowApi, true));
  assert.equal(toggleOn.ok, true);
  assert.equal(windowApi.getState(), true);

  const enabled = await invokePigeonCall(() => isEnabled(context, windowApi));
  assert.equal(enabled.ok, true);
  assert.equal(enabled.value, true);

  const toggleOff = await invokePigeonCall(() => toggle(context, windowApi, false));
  assert.equal(toggleOff.ok, true);
  assert.equal(windowApi.getState(), false);

  const disabled = await invokePigeonCall(() => isEnabled(context, windowApi));
  assert.equal(disabled.ok, true);
  assert.equal(disabled.value, false);
});

test('ETS plugin throws on null context and does not swallow window errors', () => {
  assert.match(pluginSrc, /requireAbilityContext/);
  assert.match(pluginSrc, /FlutterError/);
  assert.match(pluginSrc, /no-ability-context/);
  assert.match(pluginSrc, /setWindowKeepScreenOn/);
  assert.match(pluginSrc, /getWindowProperties\(\)\.isKeepScreenOn/);
  assert.doesNotMatch(pluginSrc, /console\.error\('toggle failed/);
  assert.doesNotMatch(
    pluginSrc,
    /catch\s*\([^)]*\)\s*\{\s*console\.error/,
  );
});
