import { IExclusiveDrawerPluginConstructor } from '../types/drawer-plugin';
import { findMaxValue, findMinValue } from '../paint-utils/index';
import { createLinePlugin, DatumColorMap } from './line-indicator-plugin';

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
): IExclusiveDrawerPluginConstructor {
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
      const data = this.pluginHost.range.visible();
      const all = [
        ...data.map((item) => (item as any)[dataObjectKey].k),
        ...data.map((item) => (item as any)[dataObjectKey].d),
        ...data.map((item) => (item as any)[dataObjectKey].j),
        20,
        50,
        80,
      ];
      this.pluginHost.minValue = findMinValue(all);
      this.pluginHost.maxValue = findMaxValue(all);
    }
  };
}
