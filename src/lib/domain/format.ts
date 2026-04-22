export function mmToCm(mm: number) {
  return Number((mm / 10).toFixed(1));
}

export function mmToM(mm: number) {
  return Number((mm / 1000).toFixed(3));
}

export function cmToMm(cm: number) {
  return Math.round(cm * 10);
}

export function formatDimension(mm: number) {
  return `${mmToCm(mm).toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} cm`;
}

export function formatMeters(mm: number) {
  return `${mmToM(mm).toLocaleString("en-US", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  })} m`;
}

export function formatMillimeters(mm: number) {
  return `${Math.round(mm).toLocaleString("en-US")} mm`;
}

export function formatArtworkSize(widthMm: number, heightMm: number) {
  return `${formatDimension(widthMm)} x ${formatDimension(heightMm)}`;
}
