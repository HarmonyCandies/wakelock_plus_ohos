/**
 * Host-runnable stand-in for WakelockPlugin toggle / isEnabled.
 *
 * ArkTS cannot run under Node, so this module mirrors the plugin control
 * flow with injectable window + context. Pigeon (WakelockApi.setup) reports
 * failures by letting the Promise reject; wrapError then completes the
 * channel with an error list instead of a success value.
 */

export class NoAbilityContextException extends Error {
  constructor() {
    super('wakelock requires an attached ability context');
    this.name = 'NoAbilityContextException';
    this.code = 'no-ability-context';
  }
}

export function requireAbilityContext(context) {
  if (context == null) {
    throw new NoAbilityContextException();
  }
  return context;
}

export async function toggle(context, windowApi, enable) {
  const attached = requireAbilityContext(context);
  const windowClass = await windowApi.getLastWindow(attached);
  await windowClass.setWindowKeepScreenOn(enable);
}

export async function isEnabled(context, windowApi) {
  const attached = requireAbilityContext(context);
  const windowClass = await windowApi.getLastWindow(attached);
  return windowClass.getWindowProperties().isKeepScreenOn;
}

/**
 * Same contract as WakelockApi.setup: a thrown/rejected host call is an
 * error outcome; a resolved value is success. Never swallow.
 */
export async function invokePigeonCall(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error };
  }
}
