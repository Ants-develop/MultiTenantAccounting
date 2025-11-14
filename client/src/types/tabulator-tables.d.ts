declare module 'tabulator-tables' {
  export class Tabulator {
    constructor(selector: string | HTMLElement, options?: any);
    setData(data: any[]): void;
    destroy(): void;
    [key: string]: any;
  }
  export default Tabulator;
}

