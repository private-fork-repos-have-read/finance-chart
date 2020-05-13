import { findMaxValue, findMinValue } from '../paint-utils/index';

import { IGenericObject } from '../types/default';
import { IExclusiveDrawerPluginConstructor } from '../types/drawer-plugin';
import { createDZMainCustomPlugin } from './dz-main-custom-plugin';

export function createDZCustomPlugin(
  config: {
    dataDescriptor: IGenericObject,
    title: string,
    dataObjKey: string,
    detailWrapper: (key: string, data: number, dataDescriptorIndex: number) => string,
  },
): IExclusiveDrawerPluginConstructor {
  return class DZCustomPlugin extends createDZMainCustomPlugin(config) {
    public onSetRange() {
      const data = this.pluginHost.range.visible();
      const combineData: any[] = [];

      data.forEach((dataItem: any) => {
        config.dataDescriptor.forEach(({ LName }: any) => {
          const value = dataItem[config.dataObjKey][LName];

          if (Array.isArray(value)) {
            value.forEach(((valueItem) => combineData.push(valueItem)));
          } else {
            combineData.push(value);
          }
        });
      });

      this.pluginHost.minValue = findMinValue(combineData);
      this.pluginHost.maxValue = findMaxValue(combineData);
    }
  };
}
