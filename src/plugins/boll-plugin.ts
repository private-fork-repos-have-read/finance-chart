import { IExclusiveDrawerPlugin, IExclusiveDrawerPluginConstructor } from '../types/drawer-plugin';
import { createLinePlugin, DatumColorMap, TitleBarTheme  } from './line-indicator-plugin';

export function createBOLLPlugin(
  lineData: DatumColorMap[] = [
    {
      key: 'mid',
      color: '#FF8E29',
    },
    {
      key: 'upper',
      color: '#ADE3F3',
    },
    {
      key: 'lower',
      color: '#EC6ED9',
    },
  ],
  dataObjectKey = 'boll',
): IExclusiveDrawerPluginConstructor {
  return createLinePlugin(
    {
      dataObjectKey,
      title: 'BOLL(40,2)',
      lineData,
      detailMapper(key, datum, i, precision = 2) {
        return `${key.toUpperCase()}: ${datum === 0 ? 0 : datum.toFixed(precision)}`;
      },
    },
  );
}
