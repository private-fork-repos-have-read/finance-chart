declare module 'lodash.uniq' {
  export default function uniq<T>(array: T[]): T[];
}
declare module 'lodash.clamp' {
  export default function clamp(number: number, lower: number, upper: number): number;
}

declare module 'jss-preset-default' {
  import { JSSOptions } from 'jss';

  export default function(options?: object): Partial<JSSOptions>;
}