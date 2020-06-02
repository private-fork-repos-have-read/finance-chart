import { drawLine, findMaxValue, findMinValue, drawText } from '../paint-utils/index';
import { trimNulls } from '../algorithm/arrays';
import { isEmptyWithoutZero } from '../helper/num';
import { determineCandleColor } from '../algorithm/color';
import { MovableRange } from '../algorithm/range';

import { IGenericObject } from '../types/default';
import { Drawer } from '../index';
import { ChartTitle } from '../chart/chart-title';
import { IExclusiveDrawerPluginConstructor, IExclusiveDrawerPlugin } from '../types/drawer-plugin';

// @ts-ignore
import ICONDtoc from '../images/icon_dtoc@2x.png';
// @ts-ignore
import ICONKtoc from '../images/icon_ktoc@2x.png';

export function createDZMainCustomPlugin(
  config: {
    dataDescriptor: IGenericObject,
    title: string,
    dataObjKey: string,
    detailWrapper: (key: string, data: number, dataDescriptorIndex: number) => string,
  },
): IExclusiveDrawerPluginConstructor {
  return class DZMainCustomPlugin extends IExclusiveDrawerPlugin {
    public titleDrawer: ChartTitle;

    constructor(protected pluginHost: Drawer) {
      super(pluginHost);
      const theme = pluginHost.chart.theme;

      this.titleDrawer = new ChartTitle(
        this.pluginHost.context,
        config.title,
        config.dataDescriptor
          ? config.dataDescriptor.map((item: any, i: number) => ({
            label: config.detailWrapper(item.LName, 0, i),
            color: item.LColor,
          }))
          : [{ label: '' }],
        theme.titleBackground,
        theme.title,
        this.pluginHost.chart.options.resolution,
      );
    }

    public postdraw() {
      const { context: ctx, yScale, range, chartFrame } = this.pluginHost;
      const { chart } = this.pluginHost;
      const { xScale } = chart;

      config.dataDescriptor.forEach(({ LName, LColor, LThick = 1, LType, EData }: any) => {
        const data = range.visible().map((d) => (d as any)[config.dataObjKey][LName]);
        const trimed = trimNulls(data);

        ctx.save();
        switch (+LType) {
          case 0: // 完整线条
            drawLine(
              this.pluginHost.context,
              trimed.result.map((d, i) => ({
                x: xScale(i + trimed.deleted),
                y: yScale(d),
              })),
              LColor,
              LThick * chart.options.resolution,
            );

            break;
          case 11: // 矩形
            let isDottdLine = false;
            let isFill = false;

            if (EData) {
              const numList = EData.split('');
              let testNum;

              if (numList.length === 1) {
                testNum = numList[0].chartAt(numList[0].length - 1);
              } else if (numList.length >= 2) {
                testNum = Number(numList[numList.length - 1]);
              }

              if (testNum === -1) {
                isDottdLine = true;
              } else if (testNum === 0) {
                isFill = true;
              }
            }

            data.forEach((d, i) => {
              if (d.length < 2 || d.some((v: number) => isEmptyWithoutZero(v))) return;
              const height = yScale(d[0]) - yScale(d[1]);
              if (height <= 0) return;

              const x = xScale(i);
              const y = yScale(d[1]);
              let width = xScale(1) - xScale(0);
              width -= width * 0.2;

              if (isFill) {
                ctx.fillStyle = LColor;
                ctx.fillRect(x - width / 2, y, width, height);
                return;
              }

              if (isDottdLine) ctx.setLineDash([5, 10]);

              ctx.strokeStyle = LColor;
              ctx.strokeRect(x - width / 2, y, width, height);
            });
            break;
          case 12: // 图片
            const imgUrl = (['2', '4', 'dtcc', 'ktoc', 'dcko'].indexOf(EData) === -1)
              ? ICONDtoc
              : ICONKtoc;

            let imgDom = document.createElement('img');
            imgDom.src = imgUrl;

            data.forEach((item, index) => {
              if (item) {
                ctx.drawImage(imgDom, xScale(index), yScale(item), 20, 20);
              }
            });

            imgDom = null;
            break;
          case 13: // 文字
            data.forEach((item, index) => {
              if (item) {
                drawText(
                  this.pluginHost.context,
                  EData,
                  {
                    x: xScale(index),
                    y: yScale(item),
                  },
                  {
                    color: LColor,
                    font: '16px serif',
                  },
                );
              }
            });
            break;
          // case 14: // K线
          //   const candleData = data.map((item) => {
          //     const [open, close, high, low] = item;
          //     return {open, high, low, close, time: '', volume: 0 };
          //   });

          //   const range = new MovableRange(candleData, 0);

          //   candleData.forEach((d, index) => {
          //     // if (item.length < 4 || item.some((v: number) => isEmptyWithoutZero(v))) return;

          //     const maxV = Math.max(d.close, d.open);
          //     const minV = Math.min(d.close, d.open);
          //     const y = yScale(maxV);
          //     const height = Math.max(
          //       Math.abs(yScale(d.close) - yScale(d.open)), 1 * chart.options.resolution,
          //     );
          //     let width = xScale(1) - xScale(0);
          //     width -= width * 0.2;
          //     const x = xScale(index) - width / 2;
          //     ctx.fillStyle = determineCandleColor(d, index, range) > 0 ?
          //       chart.theme.rise : chart.theme.fall;

          //     ctx.fillStyle = chart.theme.rise;
          //     ctx.fillRect(x, y, width, height);
          //     const lineWidth = 1 * chart.options.resolution;
          //     ctx.fillRect(x + width / 2 - lineWidth / 2, yScale(d.high), lineWidth, yScale(maxV) - yScale(d.high));
          //     ctx.fillRect(x + width / 2 - lineWidth / 2, yScale(minV), lineWidth, yScale(d.low) - yScale(minV));
          //   });
          //   break;
          default:
            break;
        }

        ctx.restore();

        this.drawTitle(
          this.pluginHost.selectedIndex || this.pluginHost.range.visible().length - 1,
        );
      });
    }

    protected drawTitle(i: number) {
      const { context: ctx, frame, range } = this.pluginHost;
      const data = range.visible();
      const d = data[i];

      if (data.length > 0) {
        config.dataDescriptor.forEach(({ LName }: any, i: number) => {
          const n = (d as any)[config.dataObjKey][LName] || 0;

          this.titleDrawer.setLabel(i, config.detailWrapper(LName, n, i));
        });

        ctx.clearRect(0, frame.y, frame.width, this.pluginHost.titleHeight);
        this.titleDrawer.draw({
          ...frame,
          height: this.pluginHost.titleHeight,
        });
      }
    }
  };
}
