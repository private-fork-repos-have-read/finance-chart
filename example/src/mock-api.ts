import clamp from 'lodash.clamp';
import MOCK_KLINE from './mock-kline';

export function fetchKline(skip = 0, count = 60): Promise<any[]> {
  console.log('request');
  const end = MOCK_KLINE.length - skip;
  const start = clamp(end - count, 0, end);
  const response = MOCK_KLINE.slice(start, end);
  const delay = Math.random() * 100 + 10;
  console.group(`response more data in ${delay.toFixed(2)} ms: `);
  console.log(response);
  console.groupEnd();
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(response);
    }, delay);
  });
}
