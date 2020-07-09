import 'core-js/modules/es6.object.assign';
import { ScaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { PADDING_LEFT, PADDING_RIGHT, TICK_MARGIN } from '../constants/constants';
import { IPoint, IRect } from '../types/drawer';

export function drawLine(ctx: CanvasRenderingContext2D, data: IPoint[], color = 'black', lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  line<IPoint>()
    .x((d) => d.x)
    .y((d) => d.y)
    .defined((d) => {
      if (typeof d.defined === 'undefined') {
        return true;
      }

      return d.defined;
    })
    .context(ctx)(data);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}
export interface TextStyle {
  font?: string;
  color?: string;
  textAlign?: any;
  textBaseline?: any;
  [key: string]: any;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  position: IPoint = { x: 0, y: 0 },
  styles: TextStyle = {},
) {
  const defaultStyles = {
    font: '11px serif',
    fillStyle: 'black',
    textAlign: 'left',
    textBaseline: 'top',
  };
  const mergeStyles = Object.assign({}, defaultStyles, styles);
  ctx.save();

  for (const key in mergeStyles) {
    if (mergeStyles.hasOwnProperty(key)) {
      (ctx as any)[key] = mergeStyles[key];
    }
  }
  // ctx.textAlign = mergeStyles.textAlign;
  // ctx.textBaseline = mergeStyles.textBaseline;
  // ctx.font = mergeStyles.font;
  // ctx.fillStyle = mergeStyles.color;
  ctx.fillText(text, position.x, position.y);
  ctx.restore();
}
export interface TickValueDescription {
  value: number;
  color?: string;
}
export function drawYAxis(
  ctx: CanvasRenderingContext2D,
  tickValues: TickValueDescription[],
  frame: IRect,
  scale: ScaleLinear<number, number>,
  resolution = 1,
  withLine = true,
  lineColor = 'black',
  formatter: (v: number, i: number) => string = (v: number) => v.toFixed(2),
  align: 'left' | 'right' = 'left',
) {
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    ctx.lineWidth = 0.8;
    ctx.font = `${10 * resolution}px sans-serif`;
    ctx.textBaseline = 'bottom';
    let x: number;
    if (align === 'left') {
      ctx.textAlign = 'left';
      x = (PADDING_LEFT + TICK_MARGIN) * resolution;
    } else {
      ctx.textAlign = 'right';
      x = frame.width - (PADDING_RIGHT + TICK_MARGIN) * resolution;
    }
    tickValues.forEach(({value, color = '#5E667F' }, i) => {
      const y = scale(value);
      if (withLine) {
        ctx.moveTo(PADDING_LEFT * resolution, y);
        ctx.lineTo(frame.width - PADDING_RIGHT * resolution, y);
      }
      ctx.fillStyle = color;
      ctx.fillText(formatter(value, i), x, y);
    });
    ctx.stroke();
    ctx.restore();
}

export function drawXAxis(
  ctx: CanvasRenderingContext2D,
  tickValues: number[],
  frame: IRect,
  scale: ScaleLinear<number, number>,
  resolution = 1,
  withTick = true,
  lineColor = 'black',
  formatter: (v: number, i: number) => string = (v: number) => v.toFixed(2),
  tickColor = '#5E667F',
) {
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    ctx.lineWidth = 0.8;
    ctx.font = `${10 * resolution}px sans-serif`;
    ctx.fillStyle = tickColor;
    ctx.textBaseline = 'top';
    const bottomY = frame.y + frame.height;
    tickValues.forEach((value, i) => {
      if (i === 0) {
        ctx.textAlign = 'left';
      } else if (i === tickValues.length - 1) {
        ctx.textAlign = 'right';
      } else {
        ctx.textAlign = 'center';
      }
      const x = scale(value);
      ctx.moveTo(x, frame.y);
      ctx.lineTo(x, bottomY);
      if (withTick) {
        ctx.fillText(formatter(value, i), x, bottomY + TICK_MARGIN * resolution);
      }
    });
    ctx.stroke();
    ctx.restore();
}

export function findMinValue(arr: number[]) {
  return Math.min.apply(null, arr.filter((i) => i || +i === 0));
}

export function findMaxValue(arr: number[]) {
  return  Math.max.apply(null, arr.filter((i) => i || +i === 0));
}
