import { ScaleLinear, scaleLinear } from 'd3-scale';
import detectIt from 'detect-it';
import clamp from 'lodash.clamp';
import { MovableRange } from '../algorithm/range';
import { TradeTimeSegment } from '../algorithm/tradetime';
import {
  DETAIL_PANEL_WIDTH,
  FRONT_SIGHT_LABEL_HEIGHT,
  PADDING_LEFT,
  PADDING_RIGHT,
  TICK_MARGIN,
  TITLE_HEIGHT,
  X_AXIS_HEIGHT,
  X_FRONT_SIGHT_LABEL_PADDING,
} from '../constants/constants';
import { Point, Rect } from '../graphic/primitive';
import './chart.scss';
import {
  Drawer,
  DrawerContructor,
  DrawerOptions,
} from './drawer';

export interface YAxisDetail {
  left: string;
  right?: string;
}

export interface DrawerConfig {
  constructor: DrawerContructor;
  options?: DrawerOptions;
}

export interface ChartOptions {
  /**
   * Selector use in document.querySelector or an document element
   */
  selector: string | HTMLElement;
  lastPrice: number;
  data: any[];
  tradeTimes: TradeTimeSegment[];
  mainDrawer: DrawerConfig;
  theme?: ChartTheme;
  resolution?: number;
  count?: number;
  mainRatio?: number;
  selectedAuxiliaryDrawer?: number;
  auxiliaryDrawers?: DrawerConfig[];
  detailProvider?:
    (selectedIndex: number, data: any[]) => {
      title: string;
      tables: ChartDetail[]
    };
}

export interface ChartDetail {
  name: string;
  value: string;
  color: string;
}

export function autoResetStyle() {
  // tslint:disable-next-line:only-arrow-functions
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const raw = target[propertyKey];
    descriptor.value = function(this: { context: CanvasRenderingContext2D }) {
      this.context.save();
      const r = raw.apply(this, arguments);
      this.context.restore();
      return r;
    };
    return descriptor;
  };
}
export function shouldRedraw() {
  // tslint:disable-next-line:only-arrow-functions
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const raw = target[propertyKey];
    descriptor.value = function(this: Chart) {
      raw.apply(this, arguments);
      this.drawAtEndOfFrame();
    };
    return descriptor;
  };
}
function createOptions(options: ChartOptions) {
  if (options.mainDrawer) {
    if (options.auxiliaryDrawers.length === 0) {
      options.mainRatio = 1;
    }
  }
  return Object.assign({}, {
    lastPrice: 0.01,
    data: [],
    tradeTimes: [],
    theme: ChartBlackTheme,
    resolution: (window.devicePixelRatio || 1),
    count: 240,
    mainRatio: 0.6,
    mainDrawer: null,
    selectedAuxiliaryDrawer: 0,
    auxiliaryDrawers: [],
  }, options);
}

enum InteractiveState {
  None = 0,
  ShowDetail = 1,
  Dragging = 1 << 1,
  Srolling = 1 << 2,
}
export interface ChartTheme {
  rise: string;
  fall: string;
  gridLine: string;
  yTick: string;
  xTick: string;
  frontSight: string;
  frontSightLabelBackground: string;
  background: string;
  detailColor: string;
  detailBackground: string;
  title: string;
  titleBackground: string;
  [key: string]: string | object;
}
export const ChartWhiteTheme: ChartTheme = {
  rise: '#F55559',
  fall: '#7DCE8D',
  gridLine: '#E7EAEB',
  yTick: '#5E667F',
  xTick: '#5E667F',
  frontSight: '#4B99FB',
  frontSightLabelBackground: '#E2F1FE',
  background: '#ffffff',
  detailColor: '#5E667F',
  detailBackground: '#F0F2F2',
  title: '#5E667F',
  titleBackground: '#F2F4F4',
};
export const ChartBlackTheme: ChartTheme = {
  rise: '#F55559',
  fall: '#7DCE8D',
  gridLine: '#282D38',
  yTick: '#AEB4BE',
  xTick: '#AEB4BE',
  frontSight: '#4B99FB',
  frontSightLabelBackground: '#1D1F23',
  background: '#1D1F23',
  detailColor: '#7B7E8D',
  detailBackground: '#282E36',
  title: '#AEB4BE',
  titleBackground: '#22252B',
};
export class Chart {
  public theme: ChartTheme;
  public options: ChartOptions;
  public requestAnimationFrameId: number = null;
  public rootElement: HTMLElement;
  public detailElement: HTMLElement;
  public canvas: HTMLCanvasElement;
  public context: CanvasRenderingContext2D;
  public xScale: ScaleLinear<number, number>;
  public width: number = 0;
  public height: number = 0;
  public mainDrawer: Drawer;
  public auxiliaryDrawer: Drawer;
  public selectedAuxiliaryDrawer = 0;
  public destroyed = false;
  public movableRange: MovableRange<object>;
  /**
   * 昨收价
   */
  public lastPrice: number;
  private detailPoint: Point;
  private interactive: InteractiveState = InteractiveState.None;
  private touchTimeoutId: number;
  private lastMouseX: number;
  private lastMouseY: number;
  private hasMoved = 0;
  private isDirty = false;

  constructor(options: ChartOptions) {
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.options = createOptions(options);
    this.selectedAuxiliaryDrawer = this.options.selectedAuxiliaryDrawer;
    this.theme = this.options.theme;
    this.lastPrice = this.options.lastPrice;
    this.resize = this.resize.bind(this);
    this.movableRange = new MovableRange(this.options.data, 0);
    this.create();
    this.setData(this.options.data);
  }
  @shouldRedraw()
  public resize() {
    const { options } = this;
    this.width = this.rootElement.clientWidth * options.resolution;
    this.height = this.rootElement.clientHeight * options.resolution;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.mainDrawer && this.mainDrawer.resize({
      x: 0,
      y: this.mainChartY,
      width: this.width,
      height: this.mainChartHeight,
    });
    this.auxiliaryDrawer.resize({
      x: 0,
      y: this.auxiliaryChartY,
      width: this.width,
      height: this.auxiliaryChartHeight,
    });
    this.resetXScale();
  }
  public setData(data: any[], clean = false) {
    if (this.destroyed) {
      throw new Error('Chart has been destroyed, method#setData didn\'t allow to be called');
    }

    this.movableRange.setData(data);
    if (clean) {
      this.destroyDrawer();
      this.createDrawers();
    }
    this.isDirty = true;
  }
  public drag(distance: number) {
    const dist = distance * this.options.resolution;
    this.hasMoved += dist;
    const width = this.xScale(2) - this.xScale(1);
    let count = this.hasMoved / width;
    count = count > 0 ? Math.floor(count) : Math.ceil(count);
    this.hasMoved %= width;
    if (count !== 0) {
      // reverse direction
      this.move(-count);
    }
  }
  @shouldRedraw()
  public move(step: number) {
    const moved = this.movableRange.move(step);
    if (moved) {
      this.isDirty = true;
    } else if (step < 0) {
      // console.log(moved)
    }
  }
  @shouldRedraw()
  public setLastPrice(value: number) {
    this.lastPrice = value;
  }
  public count() {
    return this.mainDrawer.count();
  }
  public resetXScale() {
    const { resolution } = this.options;
    this.xScale = scaleLinear()
      .domain([0, this.count() - 1])
      .range([PADDING_LEFT * resolution, this.width - PADDING_RIGHT * resolution]);
  }
  public drawAtEndOfFrame() {
    if (!this.requestAnimationFrameId) {
      this.requestAnimationFrameId = requestAnimationFrame(() => {
        try {
          if (this.isDirty) {
            this.mainDrawer && this.mainDrawer.setRange(this.movableRange);
            this.auxiliaryDrawer && this.auxiliaryDrawer.setRange(this.movableRange);
            this.isDirty = false;
          }
          this.context.clearRect(0, 0, this.width, this.height);
          // if (process.env.NODE_ENV === 'development') {
          //   console.time('rendering cost');
          // }
          this.context.fillStyle = this.theme.background;
          this.context.fillRect(0, 0, this.width, this.height);
          this.mainDrawer && this.mainDrawer.update();

          this.context.fillRect(0, this.auxiliaryChartY, this.width, this.auxiliaryChartHeight);
          this.auxiliaryDrawer && this.auxiliaryDrawer.update();
          this.requestAnimationFrameId = null;
          if (this.interactive & InteractiveState.ShowDetail) {
            this.drawFrontSight();
          }

          // if (process.env.NODE_ENV === 'development') {
          //   console.timeEnd('rendering cost');
          // }
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  public destroy() {
    this.destroyed = true;
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter);
    this.canvas.removeEventListener('mousemove', this.onMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.onMouseEnter);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    if (this.requestAnimationFrameId) {
      cancelAnimationFrame(this.requestAnimationFrameId);
    }
    this.rootElement.removeChild(this.canvas);
    this.detailElement && this.rootElement.removeChild(this.detailElement);

    this.destroyDrawer();
  }
  @shouldRedraw()
  public nextMainExclusivePlugin() {
    this.mainDrawer.nextExclusivePlugin();
  }
  @shouldRedraw()
  public useMainExclusivePlugin(index: number) {
    this.mainDrawer.useExclusivePlugin(index);
  }
  @shouldRedraw()
  public nextAuxiliarDrawer() {
    const auxiliaryDrawerCount = this.options.auxiliaryDrawers.length;
    if (auxiliaryDrawerCount === 0) {
      throw Error(`expect auxiliary drawer exist, but only 0 auxiliary drawer`);
    }
    this.useAuxiliarDrawer((this.selectedAuxiliaryDrawer + 1) % auxiliaryDrawerCount);
  }
  @shouldRedraw()
  public useAuxiliarDrawer(index: number) {
    if (index < 0 || index >= this.options.auxiliaryDrawers.length) {
      throw new Error('index out of bound');
    }
    this.selectedAuxiliaryDrawer = index;
    const auxiliaryConfig = this.options.auxiliaryDrawers[this.selectedAuxiliaryDrawer];
    this.auxiliaryDrawer = new auxiliaryConfig.constructor(
      this, auxiliaryConfig.options,
    );
    this.resize();
  }
  get data() {
    return this.movableRange.visible();
  }
  get mainChartY() {
    return 0;
  }
  get mainChartHeight() {
    return this.height * this.options.mainRatio;
  }
  get auxiliaryChartHeight() {
    return this.height - this.mainChartHeight;
  }
  get auxiliaryChartY() {
    return this.mainChartHeight + 1;
  }
  private create() {
    const { options } = this;
    this.rootElement = (options.selector instanceof HTMLElement)
        ? options.selector as HTMLElement
        : document.querySelector(options.selector as string);
    this.rootElement.className = 'finance-chart';
    this.canvas = document.createElement('canvas');
    window.addEventListener('resize', this.resize);
    this.rootElement.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');
    this.createDrawers();
    if (typeof this.options.detailProvider === 'function') {
      this.watchDetail();
    }
  }
  private createDrawers() {
    const { options } = this;
    if (options.mainDrawer) {
      this.mainDrawer = new options.mainDrawer.constructor(this, options.mainDrawer.options);
    }
    const auxiliaryConfig = this.options.auxiliaryDrawers[this.selectedAuxiliaryDrawer];
    if (auxiliaryConfig) {
      this.auxiliaryDrawer = new auxiliaryConfig.constructor(this, auxiliaryConfig.options);
    }
    this.movableRange.setVisibleLength(this.count());
    this.resize();
  }
  private destroyDrawer() {
    // clear referecne to Chart instance
    this.mainDrawer.chart = null;
    this.auxiliaryDrawer = null;
    this.mainDrawer = null;
  }
  @autoResetStyle()
  private drawFrontSight() {
    const { context: ctx } = this;
    const { resolution } = this.options;
    let { x } = this.detailPoint;
    const { y } = this.detailPoint;
    const { xScale } = this;
    const i = this.clampSelectedIndex();
    this.detailAt(i);
    x = xScale(i);
    ctx.beginPath();
    ctx.moveTo(x, TITLE_HEIGHT * resolution);
    ctx.lineTo(x, this.height);
    ctx.moveTo(PADDING_LEFT * resolution, y);
    ctx.lineTo(this.width - PADDING_RIGHT * resolution, y);
    ctx.lineWidth = 1 * this.options.resolution;
    ctx.strokeStyle = this.theme.frontSight;
    // not support in ie 10
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([2, 5, 15, 5]);
    }
    ctx.stroke();
    let yAxisDetail: YAxisDetail;
    if (y <= this.mainChartHeight) {
      yAxisDetail = this.mainDrawer.getYAxisDetail(y);
    } else {
      yAxisDetail = this.auxiliaryDrawer.getYAxisDetail(y);
    }
    this.forEachVisibleDrawer((drawer) => drawer.drawFrontSight());
    ctx.strokeStyle = this.theme.frontSight;
    // not support in ie 10
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    ctx.font = `${10 * resolution}px sans-serif`;
    const xAxisDetail = this.mainDrawer.getXAxisDetail(i);
    if (xAxisDetail) {
      const textWidth = ctx.measureText(xAxisDetail).width;
      const labelWidth = textWidth + 2 * X_FRONT_SIGHT_LABEL_PADDING * resolution;
      const rect = {
        x: clamp(x - labelWidth / 2, 0, this.width - labelWidth),
        y: this.mainChartHeight - X_AXIS_HEIGHT * resolution,
        width: labelWidth,
        height: X_AXIS_HEIGHT * resolution,
      };
      ctx.fillStyle = this.theme.frontSightLabelBackground;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillStyle = this.theme.frontSight;
      ctx.fillText(xAxisDetail, rect.x + rect.width / 2, rect.y +  TICK_MARGIN * resolution);
    }
    ctx.textBaseline = 'middle';
    const clampY = clamp(y, 0, this.height - FRONT_SIGHT_LABEL_HEIGHT * resolution / 2);
    if (yAxisDetail.left) {
      const textWidth = ctx.measureText(yAxisDetail.left).width;
      ctx.textAlign = 'left';
      const rect: Rect = {
        x: PADDING_LEFT * resolution,
        y: clampY,
        width: textWidth + TICK_MARGIN * 2 * resolution,
        height: FRONT_SIGHT_LABEL_HEIGHT * resolution,
      };
      ctx.fillStyle = this.theme.frontSightLabelBackground;
      ctx.fillRect(rect.x, rect.y - rect.height / 2, rect.width, rect.height);
      ctx.strokeRect(rect.x, rect.y - rect.height / 2, rect.width, rect.height);
      ctx.fillStyle = this.theme.frontSight;
      ctx.fillText(yAxisDetail.left, rect.x + TICK_MARGIN * resolution, rect.y);
    }
    if (yAxisDetail.right) {
      const textWidth = ctx.measureText(yAxisDetail.right).width;
      ctx.textAlign = 'right';
      const w = textWidth + TICK_MARGIN * 2 * resolution;
      const rect: Rect = {
        x: this.width - w - PADDING_RIGHT * resolution,
        y: clampY,
        width: w,
        height: FRONT_SIGHT_LABEL_HEIGHT * resolution,
      };
      ctx.fillStyle = this.theme.frontSightLabelBackground;
      ctx.fillRect(rect.x, rect.y - rect.height / 2, rect.width, rect.height);
      ctx.strokeRect(rect.x, rect.y - rect.height / 2, rect.width, rect.height);
      ctx.fillStyle = this.theme.frontSight;
      ctx.fillText(yAxisDetail.right, rect.x + rect.width -  TICK_MARGIN * resolution, rect.y);
    }
    this.drawDetail();
  }
  private watchDetail() {
    const { canvas } = this;
    this.detailElement = document.createElement('div');
    this.detailElement.style.backgroundColor = this.theme.detailBackground;
    this.detailElement.style.color = this.theme.detailColor;
    this.detailElement.className = 'chart-detail';
    this.rootElement.appendChild(this.detailElement);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    // will be 'hybrid' on android system
    if (detectIt.deviceType === 'mouseOnly') {
      canvas.addEventListener('mouseenter', this.onMouseEnter);
      canvas.addEventListener('mousemove', this.onMouseMove);
      canvas.addEventListener('mouseleave', this.onMouseLeave);
      canvas.addEventListener('mousedown', this.onMouseDown);
      canvas.addEventListener('mouseup', this.onMouseUp);
    } else {
      canvas.addEventListener('touchstart', this.onTouchStart);
      canvas.addEventListener('touchmove', this.onTouchMove);
      canvas.addEventListener('touchend', this.onTouchEnd);
    }
  }
  private onTouchStart(e: TouchEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e.touches[0];
    this.lastMouseX = clientX;
    this.lastMouseY = clientY;
    this.touchTimeoutId = window.setTimeout(() => {
      this.showDetail(
        clientX - rect.left,
        clientY - rect.top,
      );
      this.touchTimeoutId = null;
    }, 200);
  }
  private onTouchMove(e: TouchEvent) {
    const { clientX, clientY } = e.touches[0];
    if (this.interactive & InteractiveState.ShowDetail) {
      e.cancelable && e.preventDefault();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      this.showDetail(
        clientX - rect.left,
        clientY - rect.top,
      );
    } else if (this.interactive & InteractiveState.Dragging) {
      e.cancelable && e.preventDefault();
      this.onDrag(clientX);
    } else if (this.interactive === InteractiveState.None) {
      this.clearTouchTimeout();
      if (Math.abs(clientX - this.lastMouseX) > Math.abs(clientY - this.lastMouseY)) {
        this.interactive |= InteractiveState.Dragging;
        this.lastMouseX = clientX;
      } else {
        this.interactive |= InteractiveState.Srolling;
      }
    }
  }
  private onDrag(clientX: number) {
    const distance = clientX - this.lastMouseX;
    this.lastMouseX = clientX;
    this.drag(distance);
  }
  private onTouchEnd(e: TouchEvent) {
    this.clearTouchTimeout();
    this.hideDetail();
    this.interactive = InteractiveState.None;
  }
  private clearTouchTimeout() {
    if (this.touchTimeoutId) {
      clearTimeout(this.touchTimeoutId);
    }
    this.touchTimeoutId = null;
  }
  private onMouseDown(e: MouseEvent) {
    this.interactive |= InteractiveState.Dragging;
    this.lastMouseX = e.clientX;
  }
  private onMouseUp(e: MouseEvent) {
    this.interactive &= ~InteractiveState.Dragging;
  }
  private onContextMenu(e: PointerEvent) {
    e.preventDefault();
  }
  private onMouseEnter(e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    this.showDetail(
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }
  private onMouseMove(e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = e.clientX;
    if (this.interactive & InteractiveState.Dragging) {
      this.onDrag(clientX);
    }
    this.showDetail(
      clientX - rect.left,
      e.clientY - rect.top,
    );
  }
  private onMouseLeave(e: MouseEvent) {
    const x = e.clientX - (e.target as HTMLElement).getBoundingClientRect().left;
    const y = e.clientY - (e.target as HTMLElement).getBoundingClientRect().top;
    this.hideDetail();
    this.interactive &= ~InteractiveState.Dragging;
  }
  @shouldRedraw()
  private showDetail(x: number, y: number) {
    const { data } = this;
    const { resolution } = this.options;
    this.detailPoint = {
      x: x * resolution,
      y: y * resolution,
    };
    if (!data || data.length === 0) {
      return;
    }
    if (y < TITLE_HEIGHT ||
        y > this.height / resolution) {
      this.hideDetail();
      return;
    }
    this.interactive |= InteractiveState.ShowDetail;
    this.detailElement.style.display = 'block';
    const distanceToEnd = this.width / resolution - PADDING_RIGHT - x;
    if (distanceToEnd < DETAIL_PANEL_WIDTH + 10) {
      // snap to left
      this.detailElement.style.right = 'auto';
      this.detailElement.style.left = `${PADDING_LEFT}px`;
    } else {
      // snap to right
      this.detailElement.style.left = 'auto';
      this.detailElement.style.right = `${PADDING_RIGHT}px`;
    }
  }
  private detailAt(i: number) {
    this.forEachVisibleDrawer((drawer) => drawer.select(i));
  }
  private forEachVisibleDrawer(action: (drawer: Drawer) => void) {
    this.mainDrawer && action(this.mainDrawer);
    this.auxiliaryDrawer && action(this.auxiliaryDrawer);
  }
  private clampSelectedIndex() {
    return clamp(
      Math.round(this.xScale.invert(this.detailPoint.x)),
      0,
      this.data.length - 1,
    );
  }
  private drawDetail() {
    const xScale = this.xScale.clamp(true);
    const detailIndex = Math.min(
      Math.round(xScale.invert(this.detailPoint.x)),
      this.data.length - 1,
    );
    const { title, tables } = this.options.detailProvider(detailIndex, this.data);
    const fragment = document.createDocumentFragment();
    const $title = document.createElement('div');
    $title.className = 'chart-detail__title';
    $title.textContent = title;
    fragment.appendChild($title);
    tables.forEach((row) => {
      const $row = document.createElement('div');
      const $name = document.createElement('span');
      const $value = document.createElement('span');
      $row.className = 'chart-detail__row';
      $name.className = 'chart-detail__row__name';
      $name.textContent = row.name;
      $value.className = 'chart-detail__row__value';
      $value.textContent = row.value;
      $value.style.color = row.color || 'black';
      $row.appendChild($name);
      $row.appendChild($value);
      fragment.appendChild($row);
    });
    this.detailElement.innerHTML = '';
    this.detailElement.appendChild(fragment);
  }
  @shouldRedraw()
  private hideDetail() {
    this.interactive &= ~InteractiveState.ShowDetail;
    this.detailElement.style.display = 'none';
    this.detailAt(null);
  }
}
