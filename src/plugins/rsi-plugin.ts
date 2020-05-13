import { IExclusiveDrawerPluginConstructor } from '../types/drawer-plugin';
import { findMaxValue, findMinValue } from '../paint-utils/index';
import { createLinePlugin, DatumColorMap } from './line-indicator-plugin';

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
): IExclusiveDrawerPluginConstructor {
  return class RSIPlugin extends createLinePlugin(
    {
      dataObjectKey,
      title: 'RSI',
      lineData,
      detailMapper(key, datum, i) {
        return `RSI${key}: ${datum === 0 ? 0 : datum.toFixed(2)}`;
      },
    },
  ) {
    public onSetRange() {
      const data = this.pluginHost.range.visible();
      const all = [
        ...data.map((item) => (item as any)[dataObjectKey]['1']),
        ...data.map((item) => (item as any)[dataObjectKey]['2']),
        ...data.map((item) => (item as any)[dataObjectKey]['3']),
        30,
        50,
        70,
      ];
      this.pluginHost.minValue = findMinValue(all);
      this.pluginHost.maxValue = findMaxValue(all);
    }
  };
}
