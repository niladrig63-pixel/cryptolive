export interface NormalizationParams {
  min: number;
  max: number;
}

export function normalize(value: number, params: NormalizationParams): number {
  const range = params.max - params.min;
  if (range === 0) return 0.5;
  return (value - params.min) / range;
}

export function denormalize(value: number, params: NormalizationParams): number {
  return value * (params.max - params.min) + params.min;
}

export function computeNormParams(values: number[]): NormalizationParams {
  if (values.length === 0) return { min: 0, max: 1 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
