import { ITradeTimeSegment } from '../types/trade';

export class TradeTime {
  constructor(private tradeTimes: ITradeTimeSegment[]) {
  }
  public getMinute(fromIndex: number) {
    if (fromIndex < 0) {
      throw new Error('parameter fromIndex expect to be greater than 0');
    }
    let inSegment = -1;
    const tradeTimes = this.tradeTimes;
    for (let i = 0, len = tradeTimes.length; i < len; ++i) {
      const { open, close } = tradeTimes[i];
      if (open + fromIndex >= close) {
        fromIndex -= close - open;
      } else {
        inSegment = i;
        break;
      }
    }
    if (inSegment < 0 || inSegment >= tradeTimes.length) {
      throw new Error('data index not in trade time');
    }
    return tradeTimes[inSegment].open + fromIndex;
  }
  public isTrading(minuteOffset: number) {
    let trading = false;
    const tradetimes = this.tradeTimes;
    for (let i = 0, len = this.tradeTimes.length; i < len; ++i) {
      const { open, close } = this.tradeTimes[i];
      if (minuteOffset >= open && minuteOffset < close) {
        trading = true;
        break;
      }
    }
    return trading;
  }
  public totalMinutes() {
    return this.tradeTimes.reduce((prevResult, curTradeTime) => {
      return prevResult + (curTradeTime.close - curTradeTime.open);
    }, 0);
  }
}
