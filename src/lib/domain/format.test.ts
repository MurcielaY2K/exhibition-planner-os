import { describe, expect, it } from "vitest";
import {
  cmToMm,
  formatArtworkSize,
  formatDimension,
  formatMeters,
  formatMillimeters,
  mmToCm,
  mmToM,
} from "./format";

describe("mmToCm", () => {
  it("converts whole millimeters", () => {
    expect(mmToCm(100)).toBe(10);
    expect(mmToCm(500)).toBe(50);
    expect(mmToCm(3000)).toBe(300);
  });

  it("returns one decimal place of precision", () => {
    expect(mmToCm(105)).toBe(10.5);
    expect(mmToCm(1005)).toBe(100.5);
  });

  it("handles zero", () => {
    expect(mmToCm(0)).toBe(0);
  });

  it("handles single millimeter", () => {
    expect(mmToCm(1)).toBe(0.1);
  });

  it("drops trailing zeros after the decimal", () => {
    // toFixed(1) then Number() strips trailing zero
    expect(mmToCm(200)).toBe(20);
  });
});

describe("mmToM", () => {
  it("converts whole meters", () => {
    expect(mmToM(1000)).toBe(1);
    expect(mmToM(2000)).toBe(2);
  });

  it("returns three decimal places of precision", () => {
    expect(mmToM(1500)).toBe(1.5);
    expect(mmToM(1001)).toBe(1.001);
  });

  it("handles zero", () => {
    expect(mmToM(0)).toBe(0);
  });

  it("handles sub-millimeter input", () => {
    expect(mmToM(1)).toBe(0.001);
  });
});

describe("cmToMm", () => {
  it("converts whole centimeters", () => {
    expect(cmToMm(10)).toBe(100);
    expect(cmToMm(100)).toBe(1000);
  });

  it("rounds fractional centimeters", () => {
    expect(cmToMm(10.5)).toBe(105);
    expect(cmToMm(10.05)).toBe(101); // Math.round(100.5)
  });

  it("handles zero", () => {
    expect(cmToMm(0)).toBe(0);
  });
});

describe("mmToCm / cmToMm round-trip", () => {
  it("round-trips whole millimeter values", () => {
    expect(cmToMm(mmToCm(500))).toBe(500);
    expect(cmToMm(mmToCm(2500))).toBe(2500);
  });
});

describe("formatDimension", () => {
  it("formats millimeters as centimeters with cm unit", () => {
    expect(formatDimension(1000)).toBe("100 cm");
    expect(formatDimension(500)).toBe("50 cm");
  });

  it("shows one decimal place for non-round values", () => {
    expect(formatDimension(1005)).toBe("100.5 cm");
    expect(formatDimension(505)).toBe("50.5 cm");
  });

  it("omits the decimal for whole centimeter values", () => {
    expect(formatDimension(2000)).toBe("200 cm");
    expect(formatDimension(10)).toBe("1 cm");
  });
});

describe("formatMeters", () => {
  it("formats millimeters as meters with m unit", () => {
    expect(formatMeters(1000)).toBe("1 m");
    expect(formatMeters(2000)).toBe("2 m");
  });

  it("shows decimals when the value is not a whole meter", () => {
    expect(formatMeters(1500)).toBe("1.5 m");
    expect(formatMeters(9600)).toBe("9.6 m");
  });

  it("handles sub-millimeter values", () => {
    expect(formatMeters(1)).toBe("0.001 m");
  });
});

describe("formatMillimeters", () => {
  it("formats a value with mm unit", () => {
    expect(formatMillimeters(500)).toBe("500 mm");
  });

  it("rounds fractional millimeters", () => {
    expect(formatMillimeters(500.4)).toBe("500 mm");
    expect(formatMillimeters(500.6)).toBe("501 mm");
  });

  it("uses thousands separator for large values", () => {
    expect(formatMillimeters(3000)).toBe("3,000 mm");
    expect(formatMillimeters(9600)).toBe("9,600 mm");
  });

  it("handles zero", () => {
    expect(formatMillimeters(0)).toBe("0 mm");
  });
});

describe("formatArtworkSize", () => {
  it("combines width and height with × separator", () => {
    expect(formatArtworkSize(1000, 500)).toBe("100 cm x 50 cm");
    expect(formatArtworkSize(400, 600)).toBe("40 cm x 60 cm");
  });

  it("reflects decimal centimeter values", () => {
    expect(formatArtworkSize(1005, 505)).toBe("100.5 cm x 50.5 cm");
  });
});
