import { ScaleLinear, scaleLinear } from 'd3-scale';
import detectIt from 'detect-it';
import clamp from 'lodash.clamp';
import { MovableRange } from '../algorithm/range';
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
import sheets from '../css';
import { Drawer } from './drawer';

import { autoResetStyle, shouldRedraw } from '../helper/class-decorator';
import { chartBlackTheme } from '../theme/black';

import { IPoint, IRect } from '../types/drawer';
import { IChartOptions, IYAxisDetail } from '../types/chart';
import { IChartTheme } from '../types/chart-theme';

const { classes } = sheets;

/**
 * CreateOptins
 *
 */
function createOptions(options: IChartOptions) {
  if (options.mainDrawer) {
    if (!options.auxiliaryDrawers || options.auxiliaryDrawers.length === 0) {
      options.mainRatio = 1;
    }
  }

  return Object.assign({}, {
    lastPrice: 0.01,
    data: [],
    tradeTimes: [],
    theme: chartBlackTheme,
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

export class Chart {
  /**
   * @property 当前主题配置
   */
  public theme: IChartTheme;
  /**
   * @property 当前图表配置
   */
  public options: IChartOptions;
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
  private detailPoint: IPoint;
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

  constructor(options: IChartOptions) {
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
    this.resize = this.resize.bind(this);

    this.options = createOptions(options);
    this.selectedAuxiliaryDrawer = this.options.selectedAuxiliaryDrawer;
    this.theme = this.options.theme;
    this.lastPrice = this.options.lastPrice;
    this.movableRange = new MovableRange(this.options.data, 0);
    this.create();
    this.setData(this.options.data);
    this._draw();
  }

  /**
   * ListenEvents
   *
   */
  private listenEvents() {
    const { canvas } = this;
    this.detailElement = document.createElement('div');
    this.detailElement.style.backgroundColor = this.theme.detailBackground;
    this.detailElement.style.color = this.theme.detailColor;
    // this.detailElement.className = 'chart-detail';
    this.detailElement.classList.add(classes.detail);
    this.rootElement.appendChild(this.detailElement);

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

    canvas.addEventListener('contextmenu', this.onContextMenu)
  }

  /**
   * Create
   *
   */
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

  /**
   * CreateDrawers
   *
   */
  private createDrawers() {
    const { options } = this;
    const auxiliaryConfig = this.options.auxiliaryDrawers[this.selectedAuxiliaryDrawer];

    // createMainDrawer
    if (options.mainDrawer) {
      this.mainDrawer = new options.mainDrawer.constructor(this, options.mainDrawer.options);
    }

    // createAuxiliaryDrawer
    if (auxiliaryConfig) {
      this.auxiliaryDrawer = new auxiliaryConfig.constructor(this, auxiliaryConfig.options);
    }

    this.movableRange.setVisibleLength(this.mainDrawer.count() || this.options.count);
    this.resize(false);
  }

  /**
   * DestroyDrawer
   *
   */
  private destroyDrawer() {
    // clear referecne to Chart instance
    this.mainDrawer.chart = null;
    this.auxiliaryDrawer = null;
    this.mainDrawer = null;
  }

  /**
   * Resize
   *
   */
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

  /**
   * RecenterVisibleArea
   *
   * @param centerIndex
   * @param length
   */
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

  /**
   * Count
   *
   */
  public count() {
    return this.mainDrawer.count();
  }

  /**
   * ResetXScale
   *
   */
  public resetXScale() {
    const { resolution } = this.options;
    this.xScale = scaleLinear()
      .domain([0, this.count() - 1])
      .range([PADDING_LEFT * resolution, this.width - PADDING_RIGHT * resolution]);
  }

  /**
   * DrawAtEndOfFrame
   *
   */
  public drawAtEndOfFrame() {
    if (!this.requestAnimationFrameId) {
      this.requestAnimationFrameId = requestAnimationFrame(() => {
        this._draw();
      });
    }
  }

  /**
   * Destroy
   * 销毁图表实例
   *
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
   * NextMainExclusivePlugin
   * 切换下一个互斥插件
   *
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
    let yAxisDetail: IYAxisDetail;
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
      const rect: IRect = {
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
      const rect: IRect = {
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

  /**
   * OnPinch
   *
   */
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

  /**
   * OnScale
   *
   */
  private onScale(anchorX: number, count: number) {
    const width = this.neighborDistance;
    const centerIndex = Math.round(this.xScale.invert(anchorX));
    this.recenterVisibleArea(centerIndex, this.movableRange.visibleLength + count);
    this.resetXScale();
    this.isDirty = true;
    this.hasScale %= width;
  }

  /**
   * OnTouchMove
   *
   */
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

  /**
   * OnDrag
   *
   */
  private onDrag(clientX: number) {
    const distance = clientX - this.lastMouseX;
    this.lastMouseX = clientX;
    this.drag(distance);
  }

  /**
   * OnTouchEnd
   *
   */
  private onTouchEnd(e: TouchEvent) {
    this.clearTouchTimeout();
    this.hideDetail();

    this.interactive = InteractiveState.None;

    this.hasMoved = 0;
    this.hasScale = 0;
    this.lastPinchDistance = 0;
  }

  /**
   * ClearTouchTimeout
   *
   */
  private clearTouchTimeout() {
    if (this.touchTimeoutId) {
      clearTimeout(this.touchTimeoutId);
    }
    this.touchTimeoutId = null;
  }

  /**
   * OnMouseDown
   *
   */
  private onMouseDown(e: MouseEvent) {
    this.interactive |= InteractiveState.Dragging;
    this.lastMouseX = e.clientX;
  }

  /**
   * OnMouseUp
   *
   */
  private onMouseUp(e: MouseEvent) {
    this.interactive &= ~InteractiveState.Dragging;
  }

  /**
   * OnContextMenu
   *
   */
  private onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  /**
   * OnMouseEnter
   *
   */
  private onMouseEnter(e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    this.showDetail(
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }

  /**
   * OnMouseMove
   *
   */
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

  /**
   * OnMouseLeave
   *
   */
  private onMouseLeave() {
    this.hideDetail();
    this.interactive &= ~InteractiveState.Dragging;
  }

  /**
   * OnWheel
   *
   */
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

  /**
   * ShowDetail
   *
   */
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

  /**
   * DetailAt
   *
   */
  private detailAt(i: number) {
    this.forEachVisibleDrawer((drawer) => drawer.select(i));
  }

  /**
   * ForEachVisibleDrawer
   *
   */
  private forEachVisibleDrawer(action: (drawer: Drawer) => void) {
    this.mainDrawer && action(this.mainDrawer);
    this.auxiliaryDrawer && action(this.auxiliaryDrawer);
  }

  /**
   * ClampSelectedIndex
   *
   */
  private clampSelectedIndex() {
    return clamp(
      Math.round(this.xScale.invert(this.detailPoint.x)),
      0,
      this.data.length - 1,
    );
  }

  /**
   * DrawDetail
   *
   */
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

  /**
   * HideDetail
   *
   */
  @shouldRedraw()
  private hideDetail() {
    this.interactive &= ~InteractiveState.ShowDetail;
    this.detailElement.style.display = 'none';
    this.detailAt(null);
  }

  /**
   * _draw
   *
   */
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

  /**
   * _resizeMainDrawer
   *
   */
  private _resizeMainDrawer() {
    this.mainDrawer && this.mainDrawer.resize({
      x: 0,
      y: this.mainChartY,
      width: this.width,
      height: this.mainChartHeight,
    });
  }

  /**
   * _resizeAuxiliaryDrawer
   *
   */
  private _resizeAuxiliaryDrawer() {
    this.auxiliaryDrawer && this.auxiliaryDrawer.resize({
      x: 0,
      y: this.auxiliaryChartY,
      width: this.width,
      height: this.auxiliaryChartHeight,
    });
  }

  /**
   * Drag
   *
   */
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

  /**
   * GetMoreData
   *
   */
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
