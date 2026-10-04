// SPDX-License-Identifier: GPL-3.0-or-later
import { UIAbility } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';

export default class EntryAbility extends UIAbility {
  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index').catch(() => {
      hilog.error(0x0000, 'RedReader', 'Unable to load the reader page');
    });
  }
}
