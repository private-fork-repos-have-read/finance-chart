import { ExclusiveDrawerPlugin, ExclusiveDrawerPluginConstructor } from '../chart/drawer-plugin';
import { createLinePlugin, DatumColorMap, TitleBarTheme  } from './line-indicator-plugin';

export function createKDJPlugin(
  lineData: DatumColorMap[] = [
    {
      key: 'k',
      color: '#FF8E29',
    },
    {
      key: 'd',
      color: '#ADE3F3',
    },
    {
      key: 'j',
      color: '#EC6ED9',
    },
  ],
  dataObjectKey = 'kdj',
): ExclusiveDrawerPluginConstructor {
  return class KDJPlugin extends createLinePlugin(
    {
      dataObjectKey,
      title: 'KDJ',
      lineData,
      detailMapper(key, datum, i) {
        return `${key.toUpperCase()}: ${datum === 0 ? 0 : datum.toFixed(2)}`;
      },
    },
  ) {
    public onSetRange() {
      let minValue = Number.MAX_SAFE_INTEGER;
      let maxValue = Number.MIN_SAFE_INTEGER;
      const data = this.pluginHost.range.visible();
      const all = [
        ...data.map((item) => (item as any)[dataObjectKey].k),
        ...data.map((item) => (item as any)[dataObjectKey].d),
        ...data.map((item) => (item as any)[dataObjectKey].j),
      ];
      for (let i = 0, len = all.length; i < len; ++i) {
        const v = all[i];
        if (v < minValue) {
          minValue = v;
        } else if (v > maxValue) {
          maxValue = v;
        }
      }
      this.pluginHost.minValue = minValue;
      this.pluginHost.maxValue = maxValue;
    }
  };
}
