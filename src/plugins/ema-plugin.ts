import { IExclusiveDrawerPlugin, IExclusiveDrawerPluginConstructor } from '../types/drawer-plugin';
import { createLinePlugin, DatumColorMap, TitleBarTheme  } from './line-indicator-plugin';

export function createEMAPlugin(lineData: DatumColorMap[]): IExclusiveDrawerPluginConstructor {
  return createLinePlugin(
    {
      dataObjectKey: 'ema',
      title: 'EMA',
      lineData,
      detailMapper(key, datum, i, precision = 2) {
        return `EMA ${key}: ${datum === 0 ? 0 : datum.toFixed(precision)}`;
      },
    },
  );
}
