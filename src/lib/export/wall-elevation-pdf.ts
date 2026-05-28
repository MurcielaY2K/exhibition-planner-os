import { mmToCm } from "@/lib/domain/format";
import {
  DRILL_EDGE_CLEARANCE_MM,
  DRILL_MIN_HEIGHT_MM,
  DRILL_OPENING_CLEARANCE_MM,
  DRILL_POINT_CLEARANCE_MM,
  DRILL_TOP_CLEARANCE_MM,
  getHighestSeverity,
  getOpeningBoundingBox,
  getPlacementBoundingBox,
  getPlacementCenterlineMm,
  getPlacementDrillPointWarnings,
  getPlacementHangingPoints,
  STANDARD_CENTERLINE_MM,
} from "@/lib/domain/placement";
import type {
  Artwork,
  DrillPointWarning,
  HangingPoint,
  Opening,
  Placement,
  Project,
  Wall,
} from "@/lib/domain/types";

const PAGE_WIDTH_PT = 1190.55;
const PAGE_HEIGHT_PT = 841.89;
const PAGE_MARGIN_PT = 42;
const HEADER_HEIGHT_PT = 78;
const TABLE_WIDTH_PT = 300;
const CONTENT_GUTTER_PT = 22;

const DRAWING_OUTER_LEFT_PT = 42;
const DRAWING_OUTER_RIGHT_PT = 20;
const DRAWING_OUTER_TOP_PT = 46;
const DRAWING_OUTER_BOTTOM_PT = 82;

const TECH_BLACK: [number, number, number] = [0.08, 0.08, 0.08];
const TECH_DARK: [number, number, number] = [0.2, 0.2, 0.2];
const TECH_MID: [number, number, number] = [0.42, 0.42, 0.42];
const TECH_LIGHT: [number, number, number] = [0.82, 0.82, 0.82];
const TECH_VERY_LIGHT: [number, number, number] = [0.9, 0.9, 0.9];
const TECH_CAUTION: [number, number, number] = [0.69, 0.475, 0.122];
const TECH_WARNING: [number, number, number] = [0.561, 0.224, 0.192];
const WHITE: [number, number, number] = [1, 1, 1];
const DRILL_POINT_MARK_HALF_PT = 3.4;
const DRILL_POINT_RADIUS_PT = 1.8;

interface PdfExportInput {
  project: Project;
  wall: Wall;
  artworks: Artwork[];
  placements: Placement[];
  openings: Opening[];
  installerMode?: boolean;
}

interface PdfExhibitionExportInput {
  project: Project;
  walls: Wall[];
  artworks: Artwork[];
  placements: Placement[];
  openings: Opening[];
  includeCoverPage?: boolean;
  installerMode?: boolean;
  exportedAt?: Date;
}

interface ArtworkExportRow {
  code: string;
  artist: string;
  title: string;
  widthMm: number;
  heightMm: number;
  xMm: number;
  bottomMm: number;
  centerlineMm: number;
  installId: string;
  installNotes: string;
  priorityOrder: number;
  mountType: Placement["mountType"];
  isLocked: boolean;
  requiresTeamLift: boolean;
  specialHandling: Placement["specialHandling"];
  hangingPoints: HangingPoint[];
  drillWarnings: DrillPointWarning[];
  placement: Placement;
}

interface OpeningExportRow {
  code: string;
  label: string;
  type: Opening["type"];
  widthMm: number;
  heightMm: number;
  xMm: number;
  yMm: number;
  opening: Opening;
}

interface WallPageData {
  wall: Wall;
  artworkRows: ArtworkExportRow[];
  openingRows: OpeningExportRow[];
  layout: DrawingLayout;
  scaleRatio: number;
  installerMode: boolean;
}

interface DrawingLayout {
  drawingLeftPt: number;
  drawingBottomPt: number;
  drawingWidthPt: number;
  drawingHeightPt: number;
  scalePtPerMm: number;
  wallTopPt: number;
  wallRightPt: number;
  leftRegionWidthPt: number;
}

class PdfWriter {
  private pages: string[][] = [[]];
  private currentPageIndex = 0;

  addPage() {
    this.pages.push([]);
    this.currentPageIndex = this.pages.length - 1;
    return this.currentPageIndex;
  }

  setPage(index: number) {
    this.currentPageIndex = index;
  }

  add(command: string) {
    this.pages[this.currentPageIndex]?.push(command);
  }

  addText(
    text: string,
    xPt: number,
    yPt: number,
    options: {
      size?: number;
      font?: "F1" | "F2";
      color?: [number, number, number];
      align?: "left" | "center" | "right";
    } = {},
  ) {
    const font = options.font ?? "F1";
    const size = options.size ?? 12;
    const color = options.color ?? TECH_BLACK;
    const align = options.align ?? "left";
    const safeText = escapePdfText(text);
    let drawXPt = xPt;

    if (align !== "left") {
      const widthEstimate = estimateTextWidth(text, size, font === "F2");
      drawXPt = align === "center" ? xPt - widthEstimate / 2 : xPt - widthEstimate;
    }

    this.add("BT");
    this.add(`/${font} ${size.toFixed(2)} Tf`);
    this.add(`${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg`);
    this.add(`${drawXPt.toFixed(2)} ${yPt.toFixed(2)} Td`);
    this.add(`(${safeText}) Tj`);
    this.add("ET");
  }

  addLine(
    x1Pt: number,
    y1Pt: number,
    x2Pt: number,
    y2Pt: number,
    options: {
      width?: number;
      stroke?: [number, number, number];
      dash?: number[];
    } = {},
  ) {
    const width = options.width ?? 1;
    const stroke = options.stroke ?? TECH_BLACK;

    this.add(`${width.toFixed(2)} w`);
    this.add(`${stroke[0].toFixed(3)} ${stroke[1].toFixed(3)} ${stroke[2].toFixed(3)} RG`);
    this.add(options.dash ? `[${options.dash.join(" ")}] 0 d` : "[] 0 d");
    this.add(`${x1Pt.toFixed(2)} ${y1Pt.toFixed(2)} m`);
    this.add(`${x2Pt.toFixed(2)} ${y2Pt.toFixed(2)} l`);
    this.add("S");
  }

  addCircle(
    centerXPt: number,
    centerYPt: number,
    radiusPt: number,
    options: {
      stroke?: [number, number, number];
      fill?: [number, number, number];
      lineWidth?: number;
      mode?: "stroke" | "fill" | "fill-stroke";
    } = {},
  ) {
    const stroke = options.stroke ?? TECH_BLACK;
    const fill = options.fill ?? WHITE;
    const lineWidth = options.lineWidth ?? 1;
    const mode = options.mode ?? "fill-stroke";
    const control = radiusPt * 0.5522847498;

    this.add(`${lineWidth.toFixed(2)} w`);
    this.add(`${stroke[0].toFixed(3)} ${stroke[1].toFixed(3)} ${stroke[2].toFixed(3)} RG`);
    this.add(`${fill[0].toFixed(3)} ${fill[1].toFixed(3)} ${fill[2].toFixed(3)} rg`);
    this.add("[] 0 d");
    this.add(`${(centerXPt + radiusPt).toFixed(2)} ${centerYPt.toFixed(2)} m`);
    this.add(
      `${(centerXPt + radiusPt).toFixed(2)} ${(centerYPt + control).toFixed(2)} ${(centerXPt + control).toFixed(2)} ${(centerYPt + radiusPt).toFixed(2)} ${centerXPt.toFixed(2)} ${(centerYPt + radiusPt).toFixed(2)} c`,
    );
    this.add(
      `${(centerXPt - control).toFixed(2)} ${(centerYPt + radiusPt).toFixed(2)} ${(centerXPt - radiusPt).toFixed(2)} ${(centerYPt + control).toFixed(2)} ${(centerXPt - radiusPt).toFixed(2)} ${centerYPt.toFixed(2)} c`,
    );
    this.add(
      `${(centerXPt - radiusPt).toFixed(2)} ${(centerYPt - control).toFixed(2)} ${(centerXPt - control).toFixed(2)} ${(centerYPt - radiusPt).toFixed(2)} ${centerXPt.toFixed(2)} ${(centerYPt - radiusPt).toFixed(2)} c`,
    );
    this.add(
      `${(centerXPt + control).toFixed(2)} ${(centerYPt - radiusPt).toFixed(2)} ${(centerXPt + radiusPt).toFixed(2)} ${(centerYPt - control).toFixed(2)} ${(centerXPt + radiusPt).toFixed(2)} ${centerYPt.toFixed(2)} c`,
    );
    this.add(mode === "fill" ? "f" : mode === "stroke" ? "S" : "B");
  }

  addRect(
    xPt: number,
    yPt: number,
    widthPt: number,
    heightPt: number,
    options: {
      stroke?: [number, number, number];
      fill?: [number, number, number];
      lineWidth?: number;
      mode?: "stroke" | "fill" | "fill-stroke";
      dash?: number[];
    } = {},
  ) {
    const stroke = options.stroke ?? TECH_BLACK;
    const fill = options.fill ?? WHITE;
    const lineWidth = options.lineWidth ?? 1;
    const mode = options.mode ?? "fill-stroke";

    this.add(`${lineWidth.toFixed(2)} w`);
    this.add(`${stroke[0].toFixed(3)} ${stroke[1].toFixed(3)} ${stroke[2].toFixed(3)} RG`);
    this.add(`${fill[0].toFixed(3)} ${fill[1].toFixed(3)} ${fill[2].toFixed(3)} rg`);
    this.add(options.dash ? `[${options.dash.join(" ")}] 0 d` : "[] 0 d");
    this.add(`${xPt.toFixed(2)} ${yPt.toFixed(2)} ${widthPt.toFixed(2)} ${heightPt.toFixed(2)} re`);
    this.add(mode === "fill" ? "f" : mode === "stroke" ? "S" : "B");
  }

  build(pageWidthPt: number, pageHeightPt: number) {
    const pageCount = this.pages.length;
    const pageObjectStart = 3;
    const font1ObjectNumber = pageObjectStart + pageCount;
    const font2ObjectNumber = font1ObjectNumber + 1;
    const contentObjectStart = font2ObjectNumber + 1;
    const kids = Array.from({ length: pageCount }, (_, index) => `${pageObjectStart + index} 0 R`).join(" ");
    const objects: string[] = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`,
    ];

    this.pages.forEach((_, index) => {
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] /Resources << /Font << /F1 ${font1ObjectNumber} 0 R /F2 ${font2ObjectNumber} 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`,
      );
    });

    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    this.pages.forEach((commands) => {
      const content = commands.join("\n");
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });

    const parts = ["%PDF-1.4\n"];
    const offsets: number[] = [0];
    let currentOffset = parts[0].length;

    objects.forEach((object, index) => {
      offsets.push(currentOffset);
      const serialized = `${index + 1} 0 obj\n${object}\nendobj\n`;
      parts.push(serialized);
      currentOffset += serialized.length;
    });

    const xrefStart = currentOffset;
    parts.push(`xref\n0 ${objects.length + 1}\n`);
    parts.push("0000000000 65535 f \n");
    offsets.slice(1).forEach((offset) => {
      parts.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
    });
    parts.push(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
    );

    return new TextEncoder().encode(parts.join(""));
  }
}

export function exportWallElevationPdf(input: PdfExportInput) {
  const writer = new PdfWriter();
  const pageData = createWallPageData({
    project: input.project,
    wall: input.wall,
    artworks: input.artworks,
    placements: input.placements,
    openings: input.openings,
    installerMode: input.installerMode,
  });

  renderWallPage(writer, pageData, input.project, 1, 1);

  return {
    bytes: writer.build(PAGE_WIDTH_PT, PAGE_HEIGHT_PT),
    fileName: buildWallPdfFileName(
      input.project.name,
      input.wall.name,
      input.installerMode,
    ),
  };
}

export function exportExhibitionPdf(input: PdfExhibitionExportInput) {
  const writer = new PdfWriter();
  const includeCoverPage = input.includeCoverPage ?? true;
  const wallPages = input.walls.map((wall) =>
    createWallPageData({
      project: input.project,
      wall,
      artworks: input.artworks,
      placements: input.placements.filter((placement) => placement.wallId === wall.id),
      openings: input.openings.filter((opening) => opening.wallId === wall.id),
      installerMode: input.installerMode,
    }),
  );
  const totalPages = wallPages.length + (includeCoverPage ? 1 : 0);
  let pageNumber = 1;

  if (includeCoverPage) {
    renderCoverPage(
      writer,
      {
        project: input.project,
        wallCount: wallPages.length,
        exportedAt: input.exportedAt ?? new Date(),
      },
      pageNumber,
      totalPages,
    );
    pageNumber += 1;
    if (wallPages.length > 0) {
      writer.addPage();
    }
  }

  wallPages.forEach((page, index) => {
    writer.setPage(includeCoverPage ? index + 1 : index);
    renderWallPage(writer, page, input.project, pageNumber, totalPages);
    pageNumber += 1;

    if (index < wallPages.length - 1) {
      writer.addPage();
    }
  });

  return {
    bytes: writer.build(PAGE_WIDTH_PT, PAGE_HEIGHT_PT),
    fileName: buildExhibitionPdfFileName(input.project.name, input.installerMode),
  };
}

function createWallPageData(input: PdfExportInput): WallPageData {
  const artworkRows = input.placements
    .map((placement) => {
      const artwork = input.artworks.find((entry) => entry.id === placement.artworkId);

      if (!artwork) {
        return null;
      }

      const otherPlacements = input.placements.filter((entry) => entry.id !== placement.id);

      return {
        artist: artwork.artist,
        title: artwork.title,
        widthMm: placement.widthMm,
        heightMm: placement.heightMm,
        xMm: placement.xMm,
        bottomMm: placement.yMm,
        centerlineMm: getPlacementCenterlineMm(placement),
        installId: placement.installId,
        installNotes: placement.installNotes,
        priorityOrder: placement.priorityOrder,
        mountType: placement.mountType,
        isLocked: placement.isLocked,
        requiresTeamLift: placement.requiresTeamLift,
        specialHandling: placement.specialHandling,
        hangingPoints: getPlacementHangingPoints(placement),
        drillWarnings: getPlacementDrillPointWarnings(
          placement,
          input.wall,
          otherPlacements,
          input.openings,
        ),
        placement,
      };
    })
    .filter((entry): entry is Omit<ArtworkExportRow, "code"> => entry !== null)
    .sort((left, right) => left.xMm - right.xMm)
    .map((entry, index) => ({
      ...entry,
      code: `A${index + 1}`,
    }));

  const openingRows = input.openings
    .slice()
    .sort((left, right) => left.xMm - right.xMm)
    .map((opening, index) => ({
      code: `O${index + 1}`,
      label: opening.label ?? (opening.type === "door" ? "Door" : "Window"),
      type: opening.type,
      widthMm: opening.widthMm,
      heightMm: opening.heightMm,
      xMm: opening.xMm,
      yMm: opening.yMm,
      opening,
    }));

  const leftRegionWidthPt =
    PAGE_WIDTH_PT - PAGE_MARGIN_PT * 2 - TABLE_WIDTH_PT - CONTENT_GUTTER_PT;
  const drawingAvailableWidthPt =
    leftRegionWidthPt - DRAWING_OUTER_LEFT_PT - DRAWING_OUTER_RIGHT_PT;
  const drawingAvailableHeightPt =
    PAGE_HEIGHT_PT -
    PAGE_MARGIN_PT * 2 -
    HEADER_HEIGHT_PT -
    DRAWING_OUTER_TOP_PT -
    DRAWING_OUTER_BOTTOM_PT;
  const scalePtPerMm = Math.min(
    drawingAvailableWidthPt / input.wall.lengthMm,
    drawingAvailableHeightPt / input.wall.heightMm,
  );
  const drawingWidthPt = input.wall.lengthMm * scalePtPerMm;
  const drawingHeightPt = input.wall.heightMm * scalePtPerMm;
  const drawingLeftPt =
    PAGE_MARGIN_PT +
    DRAWING_OUTER_LEFT_PT +
    (drawingAvailableWidthPt - drawingWidthPt) / 2;
  const drawingBottomPt =
    PAGE_MARGIN_PT +
    DRAWING_OUTER_BOTTOM_PT +
    (drawingAvailableHeightPt - drawingHeightPt) / 2;

  return {
    wall: input.wall,
    artworkRows,
    openingRows,
    layout: {
      drawingLeftPt,
      drawingBottomPt,
      drawingWidthPt,
      drawingHeightPt,
      scalePtPerMm,
      wallTopPt: drawingBottomPt + drawingHeightPt,
      wallRightPt: drawingLeftPt + drawingWidthPt,
      leftRegionWidthPt,
    },
    scaleRatio: Math.max(
      1,
      Math.round((1 / ((scalePtPerMm / 72) * 25.4)) * 10) / 10,
    ),
    installerMode: input.installerMode ?? false,
  };
}

function renderCoverPage(
  writer: PdfWriter,
  input: {
    project: Project;
    wallCount: number;
    exportedAt: Date;
  },
  pageNumber: number,
  totalPages: number,
) {
  drawPageBackground(writer);
  writer.addLine(PAGE_MARGIN_PT, PAGE_HEIGHT_PT - 180, PAGE_WIDTH_PT - PAGE_MARGIN_PT, PAGE_HEIGHT_PT - 180, {
    width: 1.2,
    stroke: TECH_LIGHT,
  });
  writer.addLine(PAGE_MARGIN_PT, PAGE_MARGIN_PT + 140, PAGE_WIDTH_PT - PAGE_MARGIN_PT, PAGE_MARGIN_PT + 140, {
    width: 1.2,
    stroke: TECH_LIGHT,
  });
  writer.addText("EXHIBITION PLANNER OS", PAGE_MARGIN_PT, PAGE_HEIGHT_PT - 104, {
    font: "F2",
    size: 14,
    color: TECH_MID,
  });
  writer.addText(input.project.name, PAGE_MARGIN_PT, PAGE_HEIGHT_PT - 244, {
    font: "F2",
    size: 30,
    color: TECH_BLACK,
  });
  writer.addText(input.project.venueName, PAGE_MARGIN_PT, PAGE_HEIGHT_PT - 280, {
    size: 16,
    color: TECH_DARK,
  });
  writer.addText("Full Exhibition Wall Elevation Export", PAGE_MARGIN_PT, PAGE_HEIGHT_PT - 326, {
    font: "F2",
    size: 16,
    color: TECH_BLACK,
  });
  writer.addText(`Walls included: ${input.wallCount}`, PAGE_MARGIN_PT, PAGE_HEIGHT_PT - 360, {
    size: 12,
    color: TECH_DARK,
  });
  writer.addText(
    `Export date: ${input.exportedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    PAGE_MARGIN_PT,
    PAGE_HEIGHT_PT - 384,
    {
      size: 12,
      color: TECH_DARK,
    },
  );
  drawPageNumber(writer, pageNumber, totalPages);
}

function renderWallPage(
  writer: PdfWriter,
  page: WallPageData,
  project: Project,
  pageNumber: number,
  totalPages: number,
) {
  drawPageBackground(writer);
  drawHeader(writer, project, page.wall, page.scaleRatio, page.installerMode);
  drawScaleBar(writer, page.layout);
  drawWallElevation(writer, page, page.wall);
  drawWallOverallDimensions(writer, page.wall, page.layout);
  drawArtworkDimensions(writer, page.layout, page.artworkRows);
  drawOpeningDimensions(writer, page.layout, page.openingRows);
  drawAnnotationTables(
    writer,
    page.artworkRows,
    page.openingRows,
    page.layout,
    page.installerMode,
  );
  drawPageNumber(writer, pageNumber, totalPages);
}

function drawPageBackground(writer: PdfWriter) {
  writer.addRect(0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT, {
    fill: WHITE,
    stroke: WHITE,
    mode: "fill",
  });
}

function drawHeader(
  writer: PdfWriter,
  project: Project,
  wall: Wall,
  scaleRatio: number,
  installerMode: boolean,
) {
  const topY = PAGE_HEIGHT_PT - PAGE_MARGIN_PT;
  const lineY = topY - HEADER_HEIGHT_PT + 10;

  writer.addText(project.name, PAGE_MARGIN_PT, topY - 22, {
    font: "F2",
    size: 20,
    color: TECH_BLACK,
  });
  writer.addText(
    `${wall.name}  |  ${formatCentimeters(wall.lengthMm)} x ${formatCentimeters(wall.heightMm)}  |  Scale 1:${scaleRatio.toFixed(1)}`,
    PAGE_MARGIN_PT,
    topY - 42,
    {
      size: 10.5,
      color: TECH_DARK,
    },
  );
  writer.addText(
    `${sanitizeText(project.venueName)}  |  Technical wall elevation sheet${installerMode ? "  |  Installer mode" : ""}`,
    PAGE_MARGIN_PT,
    topY - 58,
    {
      size: 9,
      color: TECH_MID,
    },
  );
  writer.addLine(PAGE_MARGIN_PT, lineY, PAGE_WIDTH_PT - PAGE_MARGIN_PT, lineY, {
    width: 1.2,
    stroke: TECH_LIGHT,
  });
}

function drawPageNumber(writer: PdfWriter, pageNumber: number, totalPages: number) {
  writer.addText(`Page ${pageNumber} of ${totalPages}`, PAGE_WIDTH_PT - PAGE_MARGIN_PT, PAGE_MARGIN_PT - 4, {
    size: 8.5,
    color: TECH_MID,
    align: "right",
  });
}

function drawScaleBar(writer: PdfWriter, layout: DrawingLayout) {
  const scaleBarLengthPt = 1000 * layout.scalePtPerMm;
  const barLeftPt = PAGE_MARGIN_PT + 6;
  const barY = PAGE_MARGIN_PT + 26;

  writer.addText("Scale bar", barLeftPt, barY + 18, {
    font: "F2",
    size: 9,
    color: TECH_DARK,
  });
  writer.addLine(barLeftPt, barY, barLeftPt + scaleBarLengthPt, barY, {
    width: 1.2,
    stroke: TECH_BLACK,
  });
  writer.addLine(barLeftPt, barY - 4, barLeftPt, barY + 4, {
    width: 1,
    stroke: TECH_BLACK,
  });
  writer.addLine(barLeftPt + scaleBarLengthPt, barY - 4, barLeftPt + scaleBarLengthPt, barY + 4, {
    width: 1,
    stroke: TECH_BLACK,
  });
  writer.addText("0", barLeftPt - 2, barY - 14, {
    size: 8.5,
    color: TECH_DARK,
  });
  writer.addText("1 m", barLeftPt + scaleBarLengthPt, barY - 14, {
    size: 8.5,
    color: TECH_DARK,
    align: "right",
  });
}

function drawWallElevation(
  writer: PdfWriter,
  page: WallPageData,
  wall: Wall,
) {
  const { layout } = page;

  writer.addRect(
    layout.drawingLeftPt,
    layout.drawingBottomPt,
    layout.drawingWidthPt,
    layout.drawingHeightPt,
    {
      fill: WHITE,
      stroke: TECH_BLACK,
      lineWidth: 1.9,
      mode: "fill-stroke",
    },
  );

  if (STANDARD_CENTERLINE_MM <= wall.heightMm) {
    const centerlineYPt =
      layout.drawingBottomPt + STANDARD_CENTERLINE_MM * layout.scalePtPerMm;

    writer.addLine(
      layout.drawingLeftPt,
      centerlineYPt,
      layout.wallRightPt,
      centerlineYPt,
      {
        width: 0.55,
        stroke: TECH_MID,
        dash: [5, 4],
      },
    );
    writer.addText(
      `Centerline ${formatCentimetersCompact(STANDARD_CENTERLINE_MM)}`,
      layout.wallRightPt - 4,
      centerlineYPt + 6,
      {
        size: 8,
        color: TECH_MID,
        align: "right",
      },
    );
  }

  page.openingRows.forEach((row, index) => {
    const box = getOpeningBoundingBox(row.opening);
    const xPt = layout.drawingLeftPt + box.leftMm * layout.scalePtPerMm;
    const yPt = layout.drawingBottomPt + box.bottomMm * layout.scalePtPerMm;
    const widthPt = box.widthMm * layout.scalePtPerMm;
    const heightPt = box.heightMm * layout.scalePtPerMm;

    writer.addRect(xPt, yPt, widthPt, heightPt, {
      fill: WHITE,
      stroke: TECH_DARK,
      lineWidth: 0.8,
      mode: "stroke",
      dash: row.type === "window" ? [3, 3] : [6, 3],
    });

    if (row.type === "window") {
      writer.addLine(xPt, yPt + heightPt / 2, xPt + widthPt, yPt + heightPt / 2, {
        width: 0.7,
        stroke: TECH_MID,
        dash: [3, 2],
      });
      writer.addLine(xPt + widthPt / 2, yPt, xPt + widthPt / 2, yPt + heightPt, {
        width: 0.7,
        stroke: TECH_MID,
        dash: [3, 2],
      });
    }

    const labelXPt =
      xPt + widthPt + 14 + (index % 2) * 10 <= layout.wallRightPt - 26
        ? xPt + widthPt + 14 + (index % 2) * 10
        : xPt - 36 - (index % 2) * 10;
    const labelYPt = yPt + heightPt + 10 + (index % 2) * 10;

    drawIndexedLabel(writer, row.code, labelXPt, labelYPt, {
      anchorXPt: xPt + widthPt / 2,
      anchorYPt: yPt + heightPt,
    });
  });

  page.artworkRows.forEach((row, index) => {
    const box = getPlacementBoundingBox(row.placement);
    const xPt = layout.drawingLeftPt + box.leftMm * layout.scalePtPerMm;
    const yPt = layout.drawingBottomPt + box.bottomMm * layout.scalePtPerMm;
    const widthPt = box.widthMm * layout.scalePtPerMm;
    const heightPt = box.heightMm * layout.scalePtPerMm;
    const labelY = layout.wallTopPt + 18 + (index % 3) * 16;
    const labelX = Math.min(
      Math.max(xPt + widthPt / 2 - 11, layout.drawingLeftPt + 2),
      layout.wallRightPt - 24,
    );

    writer.addRect(xPt, yPt, widthPt, heightPt, {
      fill: WHITE,
      stroke: TECH_DARK,
      lineWidth: 0.75,
      mode: "fill-stroke",
    });
    if (page.installerMode) {
      row.hangingPoints.forEach((point) => {
        const pointXPt = layout.drawingLeftPt + point.xMm * layout.scalePtPerMm;
        const pointYPt = layout.drawingBottomPt + point.yMm * layout.scalePtPerMm;
        const pointWarnings = row.drillWarnings.filter(
          (warning) => warning.pointLabel === point.label,
        );
        const highestSeverity = getHighestSeverity(pointWarnings);
        const markerColor =
          highestSeverity === "error"
            ? TECH_WARNING
            : highestSeverity === "warning"
              ? TECH_CAUTION
              : TECH_BLACK;
        const labelColor =
          highestSeverity === "error"
            ? TECH_WARNING
            : highestSeverity === "warning"
              ? TECH_CAUTION
              : TECH_MID;

        writer.addLine(
          pointXPt - DRILL_POINT_MARK_HALF_PT,
          pointYPt,
          pointXPt + DRILL_POINT_MARK_HALF_PT,
          pointYPt,
          {
            width: 0.75,
            stroke: markerColor,
          },
        );
        writer.addLine(
          pointXPt,
          pointYPt - DRILL_POINT_MARK_HALF_PT,
          pointXPt,
          pointYPt + DRILL_POINT_MARK_HALF_PT,
          {
            width: 0.75,
            stroke: markerColor,
          },
        );
        writer.addCircle(pointXPt, pointYPt, DRILL_POINT_RADIUS_PT + 2.8, {
          fill: WHITE,
          lineWidth: 0.7,
          stroke: markerColor,
        });
        writer.addCircle(pointXPt, pointYPt, DRILL_POINT_RADIUS_PT, {
          fill: markerColor,
          lineWidth: 0.75,
          stroke: markerColor,
        });
        if (highestSeverity) {
          writer.addCircle(pointXPt + 7, pointYPt + 7, 4.4, {
            fill: WHITE,
            lineWidth: 0.7,
            stroke: markerColor,
          });
          writer.addText("!", pointXPt + 7, pointYPt + 4.4, {
            font: "F2",
            size: 6.8,
            color: markerColor,
            align: "center",
          });
        }
        writer.addText(
          `${point.label}  L ${formatCentimetersCompact(point.xMm)} / H ${formatCentimetersCompact(point.yMm)}`,
          pointXPt + 6,
          pointYPt + 5,
          {
            size: 7,
            color: labelColor,
          },
        );
      });
    }
    drawIndexedLabel(writer, row.code, labelX, labelY, {
      anchorXPt: xPt + widthPt / 2,
      anchorYPt: yPt + heightPt,
    });
    if (page.installerMode && row.drillWarnings.length > 0) {
      const rowSeverity = getHighestSeverity(row.drillWarnings);
      writer.addText(
        `${rowSeverity === "error" ? "Error" : "Warning"} ${row.drillWarnings.length}`,
        xPt + widthPt,
        yPt + heightPt + 8,
        {
          size: 7.2,
          color: rowSeverity === "error" ? TECH_WARNING : TECH_CAUTION,
          align: "right",
        },
      );
    }
  });
}

function drawWallOverallDimensions(
  writer: PdfWriter,
  wall: Wall,
  layout: DrawingLayout,
) {
  drawHorizontalDimension(
    writer,
    layout.drawingLeftPt,
    layout.wallRightPt,
    layout.drawingBottomPt - 56,
    layout.drawingBottomPt,
    formatCentimeters(wall.lengthMm),
  );
  drawVerticalDimension(
    writer,
    layout.drawingLeftPt - 40,
    layout.drawingBottomPt,
    layout.wallTopPt,
    layout.drawingLeftPt,
    formatCentimeters(wall.heightMm),
  );
}

function drawArtworkDimensions(
  writer: PdfWriter,
  layout: DrawingLayout,
  artworkRows: ArtworkExportRow[],
) {
  const seenLeftOffsets = new Set<string>();
  const seenWidths = new Set<string>();

  artworkRows.forEach((row, index) => {
    const box = getPlacementBoundingBox(row.placement);
    const leftPt = layout.drawingLeftPt + box.leftMm * layout.scalePtPerMm;
    const rightPt = layout.drawingLeftPt + box.rightMm * layout.scalePtPerMm;
    const topPt = layout.drawingBottomPt + box.topMm * layout.scalePtPerMm;
    const bottomPt = layout.drawingBottomPt + box.bottomMm * layout.scalePtPerMm;
    const leftKey = formatCentimetersCompact(box.leftMm);
    const widthKey = formatCentimetersCompact(box.widthMm);

    if (!seenLeftOffsets.has(leftKey)) {
      const leftOffsetY = layout.wallTopPt + 26 + seenLeftOffsets.size * 12;

      drawHorizontalDimension(
        writer,
        layout.drawingLeftPt,
        leftPt,
        leftOffsetY,
        layout.wallTopPt,
        leftKey,
        { textSize: 8, lineWidth: 0.5 },
      );
      seenLeftOffsets.add(leftKey);
    }

    if (!seenWidths.has(widthKey)) {
      const widthDimensionY =
        bottomPt - 16 - (index % 2) * 10 > layout.drawingBottomPt + 18
          ? bottomPt - 16 - (index % 2) * 10
          : topPt + 16 + (index % 2) * 10;

      drawHorizontalDimension(
        writer,
        leftPt,
        rightPt,
        widthDimensionY,
        widthDimensionY > topPt ? topPt : bottomPt,
        widthKey,
        { textSize: 8, lineWidth: 0.5 },
      );
      seenWidths.add(widthKey);
    }
  });
}

function drawOpeningDimensions(
  writer: PdfWriter,
  layout: DrawingLayout,
  openingRows: OpeningExportRow[],
) {
  openingRows.forEach((row, index) => {
    const box = getOpeningBoundingBox(row.opening);
    const noteX = layout.wallRightPt;
    const noteY = layout.drawingBottomPt - 74 - index * 11;

    writer.addText(
      `${row.code} ${formatCentimetersCompact(box.widthMm)} x ${formatCentimetersCompact(box.heightMm)} / L ${formatCentimetersCompact(box.leftMm)} / B ${formatCentimetersCompact(box.bottomMm)}`,
      noteX,
      noteY,
      {
        size: 7.6,
        color: TECH_MID,
        align: "right",
      },
    );
  });
}

function drawAnnotationTables(
  writer: PdfWriter,
  artworkRows: ArtworkExportRow[],
  openingRows: OpeningExportRow[],
  layout: DrawingLayout,
  installerMode: boolean,
) {
  const tableLeftPt = PAGE_MARGIN_PT + layout.leftRegionWidthPt + CONTENT_GUTTER_PT;
  const topPt = layout.wallTopPt + 8;
  const tableWidthPt = TABLE_WIDTH_PT;
  let cursorY = topPt;

  writer.addText("Artwork Schedule", tableLeftPt, cursorY, {
    font: "F2",
    size: 14,
    color: TECH_BLACK,
  });
  cursorY -= 16;
  cursorY = drawArtworkTable(writer, artworkRows, tableLeftPt, cursorY, tableWidthPt);
  if (installerMode) {
    cursorY -= 18;
    writer.addText("Installer Details", tableLeftPt, cursorY, {
      font: "F2",
      size: 13,
      color: TECH_BLACK,
    });
    cursorY -= 16;
    cursorY = drawInstallerTable(writer, artworkRows, tableLeftPt, cursorY, tableWidthPt);
    writer.addText(
      `Key checks: edge and opening clearance, drill spacing, and mount suitability. Error thresholds: edges < ${formatCentimetersCompact(DRILL_EDGE_CLEARANCE_MM)} cm, openings < ${formatCentimetersCompact(DRILL_OPENING_CLEARANCE_MM)} cm, drill spacing < ${formatCentimetersCompact(DRILL_POINT_CLEARANCE_MM)} cm, drill height < ${formatCentimetersCompact(DRILL_MIN_HEIGHT_MM)} cm, top clearance < ${formatCentimetersCompact(DRILL_TOP_CLEARANCE_MM)} cm.`,
      tableLeftPt,
      cursorY - 12,
      {
        size: 7.4,
        color: TECH_MID,
      },
    );
    cursorY -= 28;
    const riskRows = artworkRows.filter((row) => row.drillWarnings.length > 0);
    if (riskRows.length > 0) {
      writer.addText("Installation Alerts", tableLeftPt, cursorY, {
        font: "F2",
        size: 12,
        color: TECH_BLACK,
      });
      cursorY -= 14;
      riskRows
        .flatMap((row) =>
          row.drillWarnings.map((warning) => ({
            code: row.code,
            severity: warning.severity,
            issue: truncateText(warning.message, 56),
            action: truncateText(warning.fix?.label ?? warning.suggestion ?? "Review placement", 42),
          })),
        )
        .slice(0, 6)
        .forEach((entry) => {
          writer.addText(entry.code, tableLeftPt, cursorY, {
            font: "F2",
            size: 7.6,
            color: entry.severity === "error" ? TECH_WARNING : TECH_CAUTION,
          });
          writer.addText(
            `${entry.severity === "error" ? "Error" : "Warning"}: ${entry.issue}`,
            tableLeftPt + 26,
            cursorY,
            {
              size: 7.4,
              color: TECH_DARK,
            },
          );
          cursorY -= 10;
          writer.addText(`Action: ${entry.action}`, tableLeftPt + 26, cursorY, {
            size: 7.2,
            color: TECH_MID,
          });
          cursorY -= 13;
        });
      cursorY -= 8;
    }
  }
  cursorY -= 18;
  writer.addText("Openings", tableLeftPt, cursorY, {
    font: "F2",
    size: 13,
    color: TECH_BLACK,
  });
  cursorY -= 16;
  drawOpeningTable(writer, openingRows, tableLeftPt, cursorY, tableWidthPt);
}

function drawArtworkTable(
  writer: PdfWriter,
  rows: ArtworkExportRow[],
  leftPt: number,
  topPt: number,
  widthPt: number,
) {
  const rowHeight = 22;
  const headerHeight = 22;
  const totalHeight = headerHeight + rows.length * rowHeight;
  const columns = [30, 68, 90, 52, 44, 50];
  const headers = ["ID", "Artist", "Title", "Size", "Left", "C/L"];

  drawTableFrame(writer, leftPt, topPt - totalHeight, widthPt, totalHeight, columns);
  drawTableHeader(writer, leftPt, topPt, headers, columns);

  rows.forEach((row, index) => {
    const rowTop = topPt - headerHeight - index * rowHeight;
    writer.addLine(leftPt, rowTop, leftPt + widthPt, rowTop, {
      width: 0.35,
      stroke: TECH_LIGHT,
    });
    const baselineY = topPt - headerHeight - index * rowHeight - 13;
    const values = [
      row.code,
      truncateText(row.artist, 15),
      truncateText(row.title, 21),
      `${formatCentimetersCompact(row.widthMm)} x ${formatCentimetersCompact(row.heightMm)}`,
      formatCentimetersCompact(row.xMm),
      formatCentimetersCompact(row.centerlineMm),
    ];
    drawTableRow(writer, leftPt, baselineY, values, columns);
  });

  return topPt - totalHeight;
}

function drawOpeningTable(
  writer: PdfWriter,
  rows: OpeningExportRow[],
  leftPt: number,
  topPt: number,
  widthPt: number,
) {
  const rowHeight = 22;
  const headerHeight = 22;
  const totalHeight = headerHeight + rows.length * rowHeight;
  const columns = [30, 60, 58, 54, 50, 48];
  const headers = ["ID", "Type", "Label", "Size", "Left", "Bottom"];

  drawTableFrame(writer, leftPt, topPt - totalHeight, widthPt, totalHeight, columns);
  drawTableHeader(writer, leftPt, topPt, headers, columns);

  rows.forEach((row, index) => {
    const rowTop = topPt - headerHeight - index * rowHeight;
    writer.addLine(leftPt, rowTop, leftPt + widthPt, rowTop, {
      width: 0.35,
      stroke: TECH_LIGHT,
    });
    const baselineY = topPt - headerHeight - index * rowHeight - 13;
    const values = [
      row.code,
      row.type === "door" ? "Door" : "Window",
      truncateText(row.label, 11),
      `${formatCentimetersCompact(row.widthMm)} x ${formatCentimetersCompact(row.heightMm)}`,
      formatCentimetersCompact(row.xMm),
      formatCentimetersCompact(row.yMm),
    ];
    drawTableRow(writer, leftPt, baselineY, values, columns);
  });
}

function drawInstallerTable(
  writer: PdfWriter,
  rows: ArtworkExportRow[],
  leftPt: number,
  topPt: number,
  widthPt: number,
) {
  const rowHeight = 24;
  const headerHeight = 22;
  const totalHeight = headerHeight + rows.length * rowHeight;
  const columns = [28, 32, 30, 60, 150];
  const headers = ["ID", "Ord", "Lock", "Mount", "Drill / risk notes"];

  drawTableFrame(writer, leftPt, topPt - totalHeight, widthPt, totalHeight, columns);
  drawTableHeader(writer, leftPt, topPt, headers, columns);

  rows.forEach((row, index) => {
    const rowTop = topPt - headerHeight - index * rowHeight;
    writer.addLine(leftPt, rowTop, leftPt + widthPt, rowTop, {
      width: 0.35,
      stroke: TECH_LIGHT,
    });
    const baselineY = topPt - headerHeight - index * rowHeight - 14;
    const notes = compactInstallerNotes(row);
    const values = [
      row.code,
      row.priorityOrder.toString(),
      row.isLocked ? "Yes" : "No",
      formatMountType(row.mountType),
      truncateText(notes, 32),
    ];
    drawTableRow(writer, leftPt, baselineY, values, columns);
  });

  return topPt - totalHeight;
}

function drawTableFrame(
  writer: PdfWriter,
  leftPt: number,
  bottomPt: number,
  widthPt: number,
  heightPt: number,
  columns: number[],
) {
  writer.addRect(leftPt, bottomPt, widthPt, heightPt, {
    fill: WHITE,
    stroke: TECH_DARK,
    lineWidth: 0.8,
    mode: "stroke",
  });

  let x = leftPt;
  columns.slice(0, -1).forEach((columnWidth) => {
    x += columnWidth;
    writer.addLine(x, bottomPt, x, bottomPt + heightPt, {
      width: 0.3,
      stroke: TECH_VERY_LIGHT,
    });
  });
}

function drawTableHeader(
  writer: PdfWriter,
  leftPt: number,
  topPt: number,
  headers: string[],
  columns: number[],
) {
  const totalWidth = columns.reduce((sum, width) => sum + width, 0);

  writer.addRect(leftPt, topPt - 22, totalWidth, 22, {
    fill: [0.972, 0.972, 0.972],
    stroke: TECH_DARK,
    lineWidth: 0.55,
    mode: "fill-stroke",
  });
  writer.addLine(leftPt, topPt - 22, leftPt + totalWidth, topPt - 22, {
    width: 0.5,
    stroke: TECH_DARK,
  });

  let x = leftPt;
  headers.forEach((header, index) => {
    writer.addText(header, x + 4, topPt - 14, {
      font: "F2",
      size: 8.8,
      color: TECH_BLACK,
    });
    x += columns[index];
  });
}

function drawTableRow(
  writer: PdfWriter,
  leftPt: number,
  baselineY: number,
  values: string[],
  columns: number[],
) {
  let x = leftPt;

  values.forEach((value, index) => {
    const align = index >= values.length - 3 ? "right" : "left";

    writer.addText(
      value,
      align === "right" ? x + columns[index] - 4 : x + 4,
      baselineY,
      {
        size: 8.2,
        color: TECH_DARK,
        align,
      },
    );
    x += columns[index];
  });
}

function drawHorizontalDimension(
  writer: PdfWriter,
  startPt: number,
  endPt: number,
  dimensionY: number,
  extensionAnchorY: number,
  label: string,
  options: {
    textSize?: number;
    lineWidth?: number;
  } = {},
) {
  if (Math.abs(endPt - startPt) < 0.5) {
    return;
  }

  const lineWidth = options.lineWidth ?? 0.6;
  const textSize = options.textSize ?? 9;

  writer.addLine(startPt, extensionAnchorY, startPt, dimensionY, {
    width: lineWidth,
    stroke: TECH_MID,
  });
  writer.addLine(endPt, extensionAnchorY, endPt, dimensionY, {
    width: lineWidth,
    stroke: TECH_MID,
  });
  writer.addLine(startPt, dimensionY, endPt, dimensionY, {
    width: lineWidth,
    stroke: TECH_MID,
  });
  drawArrowhead(writer, startPt, dimensionY, startPt < endPt ? 1 : -1, "horizontal");
  drawArrowhead(writer, endPt, dimensionY, startPt < endPt ? -1 : 1, "horizontal");
  writer.addText(label, (startPt + endPt) / 2, dimensionY + 4, {
    size: textSize,
    color: TECH_BLACK,
    align: "center",
  });
}

function drawVerticalDimension(
  writer: PdfWriter,
  dimensionX: number,
  startPt: number,
  endPt: number,
  extensionAnchorX: number,
  label: string,
  options: {
    textSize?: number;
    lineWidth?: number;
  } = {},
) {
  if (Math.abs(endPt - startPt) < 0.5) {
    return;
  }

  const lineWidth = options.lineWidth ?? 0.6;
  const textSize = options.textSize ?? 9;

  writer.addLine(extensionAnchorX, startPt, dimensionX, startPt, {
    width: lineWidth,
    stroke: TECH_MID,
  });
  writer.addLine(extensionAnchorX, endPt, dimensionX, endPt, {
    width: lineWidth,
    stroke: TECH_MID,
  });
  writer.addLine(dimensionX, startPt, dimensionX, endPt, {
    width: lineWidth,
    stroke: TECH_MID,
  });
  drawArrowhead(writer, dimensionX, startPt, startPt < endPt ? 1 : -1, "vertical");
  drawArrowhead(writer, dimensionX, endPt, startPt < endPt ? -1 : 1, "vertical");
  writer.addText(label, dimensionX + 6, (startPt + endPt) / 2 - textSize / 2, {
    size: textSize,
    color: TECH_BLACK,
  });
}

function drawArrowhead(
  writer: PdfWriter,
  xPt: number,
  yPt: number,
  direction: 1 | -1,
  axis: "horizontal" | "vertical",
) {
  const length = 4;
  const spread = 2.2;

  if (axis === "horizontal") {
    writer.addLine(xPt, yPt, xPt + direction * length, yPt + spread, {
      width: 0.5,
      stroke: TECH_MID,
    });
    writer.addLine(xPt, yPt, xPt + direction * length, yPt - spread, {
      width: 0.5,
      stroke: TECH_MID,
    });
    return;
  }

  writer.addLine(xPt, yPt, xPt + spread, yPt + direction * length, {
    width: 0.5,
    stroke: TECH_MID,
  });
  writer.addLine(xPt, yPt, xPt - spread, yPt + direction * length, {
    width: 0.5,
    stroke: TECH_MID,
  });
}

function drawIndexedLabel(
  writer: PdfWriter,
  code: string,
  labelLeftPt: number,
  labelBaselineY: number,
  anchor: {
    anchorXPt: number;
    anchorYPt: number;
  },
) {
  const width = 22;
  const height = 13;

  writer.addLine(anchor.anchorXPt, anchor.anchorYPt, labelLeftPt, labelBaselineY - 4, {
    width: 0.5,
    stroke: TECH_MID,
  });
  writer.addRect(labelLeftPt, labelBaselineY - height + 3, width, height, {
    fill: WHITE,
    stroke: TECH_BLACK,
    lineWidth: 0.6,
    mode: "fill-stroke",
  });
  writer.addText(code, labelLeftPt + width / 2, labelBaselineY - 6.5, {
    font: "F2",
    size: 8,
    color: TECH_BLACK,
    align: "center",
  });
}

function formatCentimeters(mm: number) {
  return `${formatCentimetersCompact(mm)} cm`;
}

function formatCentimetersCompact(mm: number) {
  return mmToCm(mm).toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

function formatMountType(mountType: Placement["mountType"]) {
  if (mountType === "standard-hook") {
    return "Hook";
  }

  if (mountType === "direct-fix") {
    return "Direct";
  }

  return sanitizeText(mountType.replace(/-/g, " "));
}

function compactInstallerNotes(row: ArtworkExportRow) {
  const parts = [
    row.hangingPoints.length > 0
      ? row.hangingPoints
          .map(
            (point) =>
              `${point.label} L ${formatCentimetersCompact(point.xMm)} / H ${formatCentimetersCompact(point.yMm)}`,
          )
          .join(", ")
      : "No drill points",
    row.drillWarnings.length > 0
      ? `${getHighestSeverity(row.drillWarnings) === "error" ? "Error" : "Warning"}: ${truncateText(
          row.drillWarnings
            .map(
              (warning) =>
                `${warning.message}${warning.fix?.label ? ` Action ${warning.fix.label}.` : ""}`,
            )
            .join(" | "),
          84,
        )}`
      : "",
    row.installNotes.trim(),
    row.requiresTeamLift ? "Team lift" : "",
    row.specialHandling !== "none" ? row.specialHandling.replace(/-/g, " ") : "",
    row.installId ? `Ref ${row.installId}` : "",
  ].filter(Boolean);

  return parts.join(" / ") || "Standard handling";
}

function truncateText(value: string, maxLength: number) {
  const safeValue = sanitizeText(value);
  return safeValue.length > maxLength ? `${safeValue.slice(0, maxLength - 3)}...` : safeValue;
}

function buildWallPdfFileName(
  projectName: string,
  wallName: string,
  installerMode?: boolean,
) {
  return `${sanitizeFileName(projectName)}_${sanitizeFileName(wallName)}${installerMode ? "_installer" : ""}.pdf`;
}

function buildExhibitionPdfFileName(projectName: string, installerMode?: boolean) {
  return `${sanitizeFileName(projectName)}_full-exhibition${installerMode ? "_installer" : ""}.pdf`;
}

function sanitizeFileName(value: string) {
  return sanitizeText(value)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9\-_]/g, "");
}

function sanitizeText(value: string) {
  // Normalize unicode to decomposed form, strip combining diacritics, then
  // replace any remaining non-printable-ASCII characters with a safe fallback.
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string) {
  return sanitizeText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function estimateTextWidth(value: string, size: number, bold: boolean) {
  return sanitizeText(value).length * size * (bold ? 0.56 : 0.52);
}

export function downloadWallElevationPdf(input: PdfExportInput) {
  const { bytes, fileName } = exportWallElevationPdf(input);
  downloadPdfBytes(bytes, fileName);
}

export function downloadExhibitionPdf(input: PdfExhibitionExportInput) {
  const { bytes, fileName } = exportExhibitionPdf(input);
  downloadPdfBytes(bytes, fileName);
}

function downloadPdfBytes(bytes: Uint8Array, fileName: string) {
  const normalizedBytes = Uint8Array.from(bytes);
  const blob = new Blob([normalizedBytes.buffer], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Delay revoke so the browser has time to start the download
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}
