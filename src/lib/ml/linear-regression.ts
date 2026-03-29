/**
 * lib/ml/linear-regression.ts
 * Zero-dependency Simple Linear Regression (OLS).
 * Drop-in replacement for ml-regression's SimpleLinearRegression.
 */

export class SimpleLinearRegression {
  /** [intercept, slope] */
  readonly coefficients: [number, number];

  constructor(x: number[], y: number[]) {
    const n = x.length;
    if (n < 2) {
      this.coefficients = [y[0] ?? 0, 0];
      return;
    }

    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      numerator += dx * (y[i] - meanY);
      denominator += dx * dx;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = meanY - slope * meanX;

    this.coefficients = [intercept, slope];
  }

  predict(x: number): number {
    return this.coefficients[0] + this.coefficients[1] * x;
  }

  score(x: number[], y: number[]): { r2: number } {
    const mean = y.reduce((s, v) => s + v, 0) / y.length;
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < y.length; i++) {
      ssTot += (y[i] - mean) ** 2;
      ssRes += (y[i] - this.predict(x[i])) ** 2;
    }
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    return { r2 };
  }
}
