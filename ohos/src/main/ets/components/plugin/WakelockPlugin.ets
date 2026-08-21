import {
  AbilityAware,
  AbilityPluginBinding,
  FlutterPlugin,
  FlutterPluginBinding,
} from '@ohos/flutter_ohos';
import { FlutterError, IsEnabledMessage, ToggleMessage, WakelockApi } from './WakelockApi';
import window from '@ohos.window';
import { Context } from '@ohos.abilityAccessCtrl';
import runningLock from '@ohos.runningLock';

/** WakelockPlugin **/
export default class WakelockPlugin extends WakelockApi implements FlutterPlugin, AbilityAware {
  private context: Context | null = null;
  private lock: runningLock.RunningLock | null = null;

  constructor() {
    super();
  }

  onAttachedToAbility(binding: AbilityPluginBinding): void {
    this.context = binding.getAbility().context;
  }

  onDetachedFromAbility(): void {
    this.lock?.unhold();
    this.lock = null;
    this.context = null;
  }


  /**
   * Pigeon reports host failures by throwing; WakelockApi.setup wraps the
   * rejection via wrapError so Dart sees a PlatformException.
   */
  private requireAbilityContext(): Context {
    const context = this.context;
    if (context == null) {
      throw new FlutterError(
        'no-ability-context',
        'NoAbilityContextException',
        'wakelock requires an attached ability context',
        ''
      );
    }
    return context;
  }

  async toggle(msg: ToggleMessage): Promise<void> {
    const context = this.requireAbilityContext();
    let windowClass = await window.getLastWindow(context);
    await windowClass.setWindowKeepScreenOn(msg.getEnable());

    // let isSupported = runningLock.isSupported(runningLock.RunningLockType.BACKGROUND);
    // if (!isSupported) {
    //   return;
    // }
    // this.lock?.unhold();
    // this.lock = null;
    //
    // if (msg.getEnable()) {
    //   this.lock = await runningLock.create('wakelock', runningLock.RunningLockType.BACKGROUND);
    //   this.lock?.hold(1000);
    // }
  }

  async isEnabled(): Promise<IsEnabledMessage> {
    const context = this.requireAbilityContext();
    let windowClass = await window.getLastWindow(context);
    let isEnabled = windowClass.getWindowProperties().isKeepScreenOn;
    // isEnabled = isEnabled || (this.lock?.isHolding() ?? false);
    return new IsEnabledMessage(isEnabled);
  }

  getUniqueClassName(): string {
    return "WakelockPlugin"
  }

  onAttachedToEngine(binding: FlutterPluginBinding): void {
    WakelockApi.setup(binding.getBinaryMessenger(), this);
  }

  onDetachedFromEngine(binding: FlutterPluginBinding): void {
    WakelockApi.setup(binding.getBinaryMessenger(), null);
  }
}