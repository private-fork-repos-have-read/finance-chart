import clamp from 'lodash.clamp';

export class MovableRange<T> {
  public endPosition: number;
  public visibleLength: number;
  constructor(
    public data: T[],
    length: number,
  ) {
    this.endPosition = this.data.length;
    this.visibleLength = length;
  }
  public setData(data: T[]) {
    const minPosition = this.visibleLength > data.length ? data.length : this.visibleLength;
    this.endPosition = clamp(
      data.length - (this.data.length - this.endPosition),
      minPosition,
      data.length,
    );
    this.data = data;
  }
  public setVisibleLength(length: number) {
    this.visibleLength = length;
    const minPosition = length > this.data.length ? this.data.length : length;
    this.endPosition = clamp(this.endPosition, minPosition, this.data.length);
  }
  public visible() {
    return this.data.slice(
      this.visibleStartIndex(),
      this.endPosition,
    );
  }
  public visibleStartIndex() {
    return clamp(this.endPosition - this.visibleLength, 0, this.data.length);
  }
  /**
   * move visible range
   * @param step move step
   * @returns return true when visibleRange moved
   */
  public move(step: number): boolean {
    const minPosition = this.visibleLength > this.data.length ?
      this.data.length : this.visibleLength;
    const pos = clamp(this.endPosition + step, minPosition, this.data.length);
    const moved = this.endPosition !== pos;
    this.endPosition = pos;
    return moved;
  }
  public recenter(visibleIndex: number, length: number) {
    const i = clamp(this.visibleStartIndex() + visibleIndex, 0, this.data.length);
    // console.log(i, `index: ${visibleIndex} length: ${this.visibleLength}}`);
    this.endPosition = i + Math.floor(length / 2) + 1;
    this.setVisibleLength(length);
  }
}
