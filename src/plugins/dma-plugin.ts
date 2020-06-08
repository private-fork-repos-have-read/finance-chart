import { IExclusiveDrawerPlugin, IExclusiveDrawerPluginConstructor } from '../types/drawer-plugin';
import { findMaxValue, findMinValue } from '../paint-utils/index';
import { createLinePlugin, DatumColorMap, TitleBarTheme  } from './line-indicator-plugin';

export function createDMAPlugin(
  lineData: DatumColorMap[] = [
    {
      key: 'dif',
      color: '#FF8E29',
    },
    {
      key: 'ama',
      color: '#ADE3F3',
    },
  ],
  dataObjectKey = 'dma',
): IExclusiveDrawerPluginConstructor {
  return class DMAPlugin extends createLinePlugin(
    {
      dataObjectKey,
      title: 'DMA',
      lineData,
      detailMapper(key, datum, i, precision = 2) {
        return `${key.toUpperCase()}: ${datum === 0 ? 0 : datum.toFixed(precision)}`;
      },
    },
  ) {
    public onSetRange() {
      const data = this.pluginHost.range.visible();
      const all = [
        ...data.map((item) => (item as any)[dataObjectKey].dif),
        ...data.map((item) => (item as any)[dataObjectKey].ama),
      ];

      this.pluginHost.minValue = findMinValue(all);
      this.pluginHost.maxValue = findMaxValue(all);
    }
  };
}
