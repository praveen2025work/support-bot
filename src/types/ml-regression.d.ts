declare module 'ml-regression' {
  export class SimpleLinearRegression {
    constructor(x: number[], y: number[]);
    predict(x: number): number;
    coefficients: number[];
    score(x: number[], y: number[]): { r2: number };
  }
}
