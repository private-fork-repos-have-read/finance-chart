import { ExclusiveDrawerPlugin, ExclusiveDrawerPluginConstructor } from '../chart/drawer-plugin';
import { createLinePlugin, DatumColorMap, TitleBarTheme  } from './line-indicator-plugin';

export function createMAPlugin(lineData: DatumColorMap[], dataObjectKey = 'ma'): ExclusiveDrawerPluginConstructor {
  return createLinePlugin(
    {
      dataObjectKey,
      title: 'MA',
      lineData,
      detailMapper(key, datum, i) {
        return `MA${key}: ${datum === 0 ? 0 : datum.toFixed(2)}`;
      },
    },
  );
}
