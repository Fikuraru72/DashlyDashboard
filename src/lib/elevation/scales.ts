import { ChartDataPoint } from '@/types/elevation';

export interface ScaleLinear {
  (value: number): number;
  invert(pixel: number): number;
  domain(): [number, number];
  range(): [number, number];
}

/** Lightweight linear scale implementation (avoids pulling entire d3-scale if not installed) */
export function createLinearScale(
  domain: [number, number],
  range: [number, number],
): ScaleLinear {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const dSpan = d1 - d0 || 1;
  const rSpan = r1 - r0;

  const scale = (val: number) => r0 + ((val - d0) / dSpan) * rSpan;
  scale.invert = (pixel: number) => d0 + ((pixel - r0) / rSpan) * dSpan;
  scale.domain = () => [d0, d1] as [number, number];
  scale.range = () => [r0, r1] as [number, number];

  return scale;
}

/** Generate SVG path string for elevation area fill */
export function generateAreaPath(
  data: ChartDataPoint[],
  xScale: ScaleLinear,
  yScale: ScaleLinear,
  baselineY: number,
): string {
  if (!data || data.length === 0) return '';

  let d = `M ${xScale(data[0].distance)} ${baselineY}`;
  d += ` L ${xScale(data[0].distance)} ${yScale(data[0].elevation)}`;

  for (let i = 1; i < data.length; i++) {
    d += ` L ${xScale(data[i].distance)} ${yScale(data[i].elevation)}`;
  }

  d += ` L ${xScale(data[data.length - 1].distance)} ${baselineY} Z`;
  return d;
}

/** Generate SVG path string for elevation stroke line */
export function generateLinePath(
  data: ChartDataPoint[],
  xScale: ScaleLinear,
  yScale: ScaleLinear,
): string {
  if (!data || data.length === 0) return '';

  let d = `M ${xScale(data[0].distance)} ${yScale(data[0].elevation)}`;
  for (let i = 1; i < data.length; i++) {
    d += ` L ${xScale(data[i].distance)} ${yScale(data[i].elevation)}`;
  }

  return d;
}
