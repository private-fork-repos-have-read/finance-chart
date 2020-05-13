import { ICandleStickData } from '../types/data-structure';
import { MovableRange } from './range';

export function determineCandleColor(
  current: ICandleStickData,
  currentIndex: number,
  range: MovableRange<ICandleStickData>,
) {
  if (current.close > current.open) {
    return 1;
  } else if (current.close < current.open) {
    return -1;
  } else {
    const yesterday = range.data[range.visibleStartIndex() + currentIndex - 1];
    if (yesterday) {
      return current.close >= yesterday.close ? 1 : -1;
    } else {
      return 1;
    }
  }
}
