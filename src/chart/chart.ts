import { ScaleLinear, scaleLinear } from 'd3-scale';
import detectIt from 'detect-it';
import jss from 'jss';
import preset from 'jss-preset-default';
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
import {
  Drawer,
  DrawerContructor,
  DrawerOptions,
} from './drawer';

jss.setup(preset());

const styles = {
  'finance-chart': {
    position: 'relative',
    '& canvas': {
      '-webkit-tap-highlight-color': 'transparent',
      'user-select': 'none',
    },
  },
  detail: {
    boxSizing: 'border-box',
    position: 'absolute',
    padding: '8px',
    width: '120px',
    background: '#F0F2F2',
    top: '30px',
    right: '0',
    display: 'none',
    color: '#5E667F',
    fontSize: '12px',
  },
  title: {
    textAlign: 'center',
    paddingBottom: 6,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    '& span': {
      display: 'inline-block',
    },
  },
};

const { classes } = jss.createStyleSheet(styles).attach();

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
   * 用于放置图表的dom节点或dom节点选择器
   */
  selector: string | HTMLElement;
  /**
   * 昨收价
   */
  lastPrice: number;
  /**
   * 数据, 数据格式参考demo
   */
  data: any[];
  /**
   * 金融产品交易时间段
   */
  tradeTimes: TradeTimeSegment[];
  /**
   * 主图绘图器配置
   */
  mainDrawer: DrawerConfig;
  /**
   * 主题配置，内置黑白两套主题, 默认使用黑色主题
   */
  theme?: ChartTheme;
  /**
   * 设备像素比, 通常不需要主动设置
   * 在性能较差的设备可主动设置为1，提高性能, 降低画面质量
   */
  resolution?: number;
  /**
   * 默认绘制数据项数量
   * 例如默认需要绘制50项，即显示50根k线
   * 分时图绘制数据项数量只取决于交易时间, 忽略此配置
   */
  count?: number;
  /**
   * 最小绘制数据项数量，控制缩放范围
   */
  minCount?: number;
  /**
   * 最大绘制数据项数量，控制缩放范围
   */
  maxCount?: number;
  /**
   * 主图大小屏占比，默认为0.6, 不配置副图时，屏占比为1，即占满绘图区域
   */
  mainRatio?: number;
  /**
   * 默认选中副图
   */
  selectedAuxiliaryDrawer?: number;
  /**
   * 副图配置
   */
  auxiliaryDrawers?: DrawerConfig[];
  /**
   * 查看详情数据委托，返回用于显示的详情数据
   */
  detailProvider?:
    (selectedIndex: number, data: any[]) => {
      title: string;
      tables: ChartDetail[]
    };
  /**
   * 加载更多数据委托
   */
  onMoreData?:
    (this: Chart, tep: number) => void | Promise<any[]>;
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
    if (!options.auxiliaryDrawers || options.auxiliaryDrawers.length === 0) {
      options.mainRatio = 1;
    }
  }
  return Object.assign({}, {
    lastPrice: 0.01,
    data: [],
    tradeTimes: [],
    theme: ChartBlackTheme,
    resolution: (window.devicePixelRatio || 1),
    count: 50,
    minCount: 10,
    maxCount: 300,
    mainRatio: 0.6,
    mainDrawer: null,
    selectedAuxiliaryDrawer: 0,
    auxiliaryDrawers: [],
    onMoreData: () => { /* noop */ },
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

/**
 * 金融图
 */
export class Chart {
  /**
   * @property 当前主题配置
   */
  public theme: ChartTheme;
  /**
   * @property 当前图表配置
   */
  public options: ChartOptions;
  public requestAnimationFrameId: number = null;
  /**
   * @property 图表界面根节点
   */
  public rootElement: HTMLElement;
  /**
   * @property 图表详情界面根节点
   */
  public detailElement: HTMLElement;
  /**
   * @property 画布节点
   */
  public canvas: HTMLCanvasElement;
  /**
   * @property 绘图上下文
   */
  public context: CanvasRenderingContext2D;
  /**
   * @property 线性缩放转换器实例
   */
  public xScale: ScaleLinear<number, number>;
  /**
   * @property 实际绘制宽度，不受设备像素比影响
   */
  public width: number = 0;
  /**
   * @property 实际绘制高度，不受设备像素比影响
   */
  public height: number = 0;
  /**
   * @property 主图绘图器实例
   */
  public mainDrawer: Drawer;
  /**
   * @property 当前激活的副图绘图实例
   */
  public auxiliaryDrawer: Drawer;
  /**
   * @property 当前激活的副图序号
   */
  public selectedAuxiliaryDrawer = 0;
  /**
   * @property 图表已被销毁
   */
  public destroyed = false;
  /**
   * @property 当前数据的数据管理器实例
   */
  public movableRange: MovableRange<object>;
  /**
   * @property 昨收价
   */
  public lastPrice: number;
  private detailPoint: Point;
  private interactive: InteractiveState = InteractiveState.None;
  private touchTimeoutId: number;
  private lastMouseX: number;
  private lastMouseY: number;
  private lastPinchDistance = 0; // in pixel
  private hasMoved = 0; // in pixel
  private hasScale = 0; // in pixel
  private isDirty = false;
  private isFetchingMoreData = false;
  private noMoreData = false;

  constructor(options: ChartOptions) {
    this.onWindownResize = this.onWindownResize.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onWheel = this.onWheel.bind(this);
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
    this._draw();
  }
  public resize(redraw = true) {
    const { options } = this;
    this.width = this.rootElement.clientWidth * options.resolution;
    this.height = this.rootElement.clientHeight * options.resolution;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this._resizeMainDrawer();
    this._resizeAuxiliaryDrawer();
    this.resetXScale();
    redraw && this._draw();
  }
  public onWindownResize() {
    this.resize();
  }
  /**
   * 更新数据
   * @param data 新数据
   * @param clean 强制清除所有状态
   */
  @shouldRedraw()
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
  /**
   * 移动绘制数据区, 向前移动传入负数，向后移动传入正数
   * 例如，向前移动1项，传入-1
   * @param step 移动数目
   */
  @shouldRedraw()
  public move(step: number) {
    const moved = this.movableRange.move(step);
    if (moved) {
      this.isDirty = true;
    } else if (!this.isFetchingMoreData && !this.noMoreData) {
      this.getMoreData(step);
    }
  }
  @shouldRedraw()
  public recenterVisibleArea(centerIndex: number, length: number) {
    const { minCount, maxCount } = this.options;
    const range = this.movableRange;
    const nextLength = clamp(length, minCount, maxCount);
    if (nextLength !== range.visibleLength && (!this.isFetchingMoreData || this.noMoreData)) {
      range.recenter(centerIndex, nextLength);
      const visible = range.visible();
      const step = visible.length - range.visibleLength;
      if (step < 0 && !this.noMoreData) {
        this.getMoreData(step);
      }
    }
  }
  /**
   * 更新昨收价
   * @param value 昨收价
   */
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
        this._draw();
      });
    }
  }
  /**
   * 销毁图表实例
   */
  public destroy() {
    this.destroyed = true;
    window.removeEventListener('resize', this.onWindownResize);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter);
    this.canvas.removeEventListener('mousemove', this.onMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.onMouseEnter);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('wheel', this.onWheel);
    if (this.requestAnimationFrameId) {
      cancelAnimationFrame(this.requestAnimationFrameId);
    }
    this.rootElement.removeChild(this.canvas);
    this.detailElement && this.rootElement.removeChild(this.detailElement);

    this.destroyDrawer();
  }
  /**
   * 切换下一个互斥插件
   */
  @shouldRedraw()
  public nextMainExclusivePlugin() {
    this.mainDrawer.nextExclusivePlugin();
  }
  /**
   * 使用指定互斥插件
   * @param index 序号
   */
  @shouldRedraw()
  public useMainExclusivePlugin(index: number) {
    this.mainDrawer.useExclusivePlugin(index);
  }
  /**
   * 切换下一个副图
   */
  @shouldRedraw()
  public nextAuxiliarDrawer() {
    const auxiliaryDrawerCount = this.options.auxiliaryDrawers.length;
    if (auxiliaryDrawerCount === 0) {
      throw Error(`expect auxiliary drawer exist, but only 0 auxiliary drawer`);
    }
    this.useAuxiliarDrawer((this.selectedAuxiliaryDrawer + 1) % auxiliaryDrawerCount);
  }
  /**
   * 切换下一个副图
   * @param index 副图序号
   */
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
    this._resizeAuxiliaryDrawer();
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
  /**
   * The distance of neighbor point
   */
  private get neighborDistance() {
    return this.xScale(2) - this.xScale(1);
  }
  private create() {
    const { options } = this;
    this.rootElement = (options.selector instanceof HTMLElement)
        ? options.selector as HTMLElement
        : document.querySelector(options.selector as string);
    this.rootElement.classList.add(classes['finance-chart']);
    this.canvas = document.createElement('canvas');
    window.addEventListener('resize', this.onWindownResize);
    this.rootElement.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');
    this.createDrawers();
    this.listenEvents();
  }
  private createDrawers() {
    this._createMainDrawer();
    this._createAuxiliaryDrawer();
    this.movableRange.setVisibleLength(this.mainDrawer.count() || this.options.count);
    this.resize(false);
  }
  private _createMainDrawer() {
    const { options } = this;
    if (options.mainDrawer) {
      this.mainDrawer = new options.mainDrawer.constructor(this, options.mainDrawer.options);
    }
  }
  private _createAuxiliaryDrawer() {
    const auxiliaryConfig = this.options.auxiliaryDrawers[this.selectedAuxiliaryDrawer];
    if (auxiliaryConfig) {
      this.auxiliaryDrawer = new auxiliaryConfig.constructor(this, auxiliaryConfig.options);
    }
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
    typeof this.options.detailProvider === 'function' && this.drawDetail();
  }
  private listenEvents() {
    const { canvas } = this;
    this.detailElement = document.createElement('div');
    this.detailElement.style.backgroundColor = this.theme.detailBackground;
    this.detailElement.style.color = this.theme.detailColor;
    // this.detailElement.className = 'chart-detail';
    this.detailElement.classList.add(classes.detail);
    this.rootElement.appendChild(this.detailElement);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    // will be 'hybrid' on android system
    if (detectIt.deviceType === 'mouseOnly') {
      canvas.addEventListener('mouseenter', this.onMouseEnter);
      canvas.addEventListener('mousemove', this.onMouseMove);
      canvas.addEventListener('mouseleave', this.onMouseLeave);
      canvas.addEventListener('mousedown', this.onMouseDown);
      canvas.addEventListener('mouseup', this.onMouseUp);
      canvas.addEventListener('wheel', this.onWheel);
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
    if (e.touches.length === 2) {
      this.onPinch(e);
    } else {
      this.touchTimeoutId = window.setTimeout(() => {
        this.showDetail(
          clientX - rect.left,
          clientY - rect.top,
        );
        this.touchTimeoutId = null;
      }, 200);
    }
  }
  private onPinch(e: TouchEvent) {
    if (this.mainDrawer.canScale) {
      e.preventDefault();
      const { resolution } = this.options;
      const point1 = e.touches[0];
      const point2 = e.touches[1];
      this.clearTouchTimeout();
      const distance = Math.sqrt(
        (point2.clientX - point1.clientX) ** 2 + (point2.clientY - point1.clientY) ** 2,
      ) * resolution;
      if (this.lastPinchDistance !== 0) {
        this.hasScale += (distance - this.lastPinchDistance) * -1;
        const width = this.neighborDistance;
        let count = this.hasScale / width;
        count = count > 0 ? Math.floor(count) : Math.ceil(count);
        if (count !== 0) {
          const centerX =
          (Math.min(point1.clientX, point2.clientX) +
          Math.abs(point2.clientX - point1.clientX) / 2) * resolution;
          this.onScale(centerX, count);
        }
      }
      this.lastPinchDistance = distance;
    }
  }
  private onScale(anchorX: number, count: number) {
    const width = this.neighborDistance;
    const centerIndex = Math.round(this.xScale.invert(anchorX));
    this.recenterVisibleArea(centerIndex, this.movableRange.visibleLength + count);
    this.resetXScale();
    this.isDirty = true;
    this.hasScale %= width;
  }
  private onTouchMove(e: TouchEvent) {
    const { clientX, clientY } = e.touches[0];
    if (e.touches.length === 2) {
      this.onPinch(e);
    } else if (this.interactive & InteractiveState.ShowDetail) {
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

    this.hasMoved = 0;
    this.hasScale = 0;
    this.lastPinchDistance = 0;
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
  private onContextMenu(e: MouseEvent) {
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
  private onMouseLeave() {
    this.hideDetail();
    this.interactive &= ~InteractiveState.Dragging;
  }
  @shouldRedraw()
  private onWheel(e: WheelEvent) {
    if (this.mainDrawer.canScale) {
      // disable bouncing animation on osx when trigger by touchpad
      e.preventDefault();
      const { resolution } = this.options;
      this.hasScale += e.deltaY * resolution;
      const width = this.neighborDistance;
      let count = this.hasScale / width;
      count = count > 0 ? Math.floor(count) : Math.ceil(count);
      if (count !== 0) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const clientX = e.clientX;
        const anchorX = (clientX - rect.left) * resolution;
        this.onScale(anchorX, count);
      }
    }
  }
  @shouldRedraw()
  private showDetail(x: number, y: number) {
    if (typeof this.options.detailProvider !== 'function') { return; }
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
    $title.classList.add(classes.title);
    $title.textContent = title;
    fragment.appendChild($title);
    tables.forEach((row) => {
      const $row = document.createElement('div');
      const $name = document.createElement('span');
      const $value = document.createElement('span');
      $row.classList.add(classes.row);
      $name.textContent = row.name;
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
  private _draw() {
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
  }
  private _resizeMainDrawer() {
    this.mainDrawer && this.mainDrawer.resize({
      x: 0,
      y: this.mainChartY,
      width: this.width,
      height: this.mainChartHeight,
    });
  }
  private _resizeAuxiliaryDrawer() {
    this.auxiliaryDrawer && this.auxiliaryDrawer.resize({
      x: 0,
      y: this.auxiliaryChartY,
      width: this.width,
      height: this.auxiliaryChartHeight,
    });
  }
  private drag(distance: number) {
    const dist = distance * this.options.resolution;
    this.hasMoved += dist;
    const width = this.neighborDistance;
    let count = this.hasMoved / width;
    count = count > 0 ? Math.floor(count) : Math.ceil(count);
    this.hasMoved %= width;
    if (count !== 0) {
      // reverse direction
      this.move(-count);
    }
  }
  private getMoreData(step: number) {
    const promise = this.options.onMoreData.call(this, step);
    this.isFetchingMoreData = true;
    if (promise && typeof promise.then === 'function') {
      promise.then((data: any[]) => {
        this.isFetchingMoreData = false;
        if (data && data.length > 0) {
          this.setData(
            step < 0 ? data.concat(this.movableRange.data) : this.movableRange.data.concat(data),
          );
        } else {
          this.noMoreData = true;
        }
      });
    } else {
      this.noMoreData = true;
    }
  }
}
