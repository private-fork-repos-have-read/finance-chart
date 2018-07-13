import { ExclusiveDrawerPlugin, ExclusiveDrawerPluginConstructor } from '../chart/drawer-plugin';
import { createLinePlugin, DatumColorMap, TitleBarTheme  } from './line-indicator-plugin';

export function createSMAPlugin(lineData: DatumColorMap[]): ExclusiveDrawerPluginConstructor {
  return createLinePlugin(
    {
      dataObjectKey: 'sma',
      title: 'SMA',
      lineData,
      detailMapper(key, datum, i) {
        return `SMA ${key}: ${datum === 0 ? 0 : datum.toFixed(2)}`;
      },
    },
  );
}
