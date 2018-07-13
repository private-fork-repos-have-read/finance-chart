import { Rect } from '../graphic/primitive';
import { drawText } from '../paint-utils/index';
import { autoResetStyle } from './chart';

export class ChartTitle {
  constructor(
    public context: CanvasRenderingContext2D,
    public title: string,
    public labels: Array<{label: string, color: string }>,
    public background = 'black',
    public titleColor = 'white',
    public resolution = 1,
  ) {

  }
  public setLabel(i: number, label: string) {
    this.labels[i].label = label;
  }
  @autoResetStyle()
  public draw(frame: Rect) {
    const { context: ctx, background, title, titleColor, resolution } = this;
    ctx.fillStyle = background;
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
    const font = `${11 * resolution}px sans-serif`;
    const spacing = 10 * resolution;
    let nextX = 8 * resolution;
    ctx.font = font;
    if (title) {
      drawText(ctx, title, {
        x: nextX,
        y: frame.y + 6 * resolution,
      }, {
        font,
        color: titleColor,
      });
      nextX += ctx.measureText(title).width + spacing * 2;
    }
    this.labels.forEach(({ label, color }) => {
      drawText(ctx, label, {
        x: nextX,
        y: frame.y + 6 * resolution,
      }, {
        font,
        color,
      });
      nextX += ctx.measureText(label).width + spacing;
    });
  }
}
