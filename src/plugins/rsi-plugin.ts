import { ExclusiveDrawerPlugin, ExclusiveDrawerPluginConstructor } from '../chart/drawer-plugin';
import { createLinePlugin, DatumColorMap, TitleBarTheme  } from './line-indicator-plugin';

export function createRSIPlugin(
  lineData: DatumColorMap[] = [
    {
      key: '1',
      color: '#FF8E29',
    },
    {
      key: '2',
      color: '#ADE3F3',
    },
    {
      key: '3',
      color: '#EC6ED9',
    },
  ],
  dataObjectKey = 'rsi',
): ExclusiveDrawerPluginConstructor {
  return class RSIPlugin extends createLinePlugin(
    {
      dataObjectKey,
      title: 'RSI',
      lineData,
      detailMapper(key, datum, i) {
        return {
          x: i * 80 + 50,
          label: `RSI${key}: ${datum === 0 ? 0 : datum.toFixed(2)}`,
        };
      },
    },
  ) {
    public onSetRange() {
      let minValue = Number.MAX_SAFE_INTEGER;
      let maxValue = Number.MIN_SAFE_INTEGER;
      const data = this.pluginHost.range.visible();
      const all = [
        ...data.map((item) => (item as any)[dataObjectKey]['1']),
        ...data.map((item) => (item as any)[dataObjectKey]['2']),
        ...data.map((item) => (item as any)[dataObjectKey]['3']),
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
