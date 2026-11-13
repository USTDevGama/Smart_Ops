// The report as a PDF, built in the browser with jsPDF. The layout follows the trainee report design
// (trainee-report 1.html), whose print view is the same page. Every value comes from the summary.
// The screen does not call the server for the PDF.

import { jsPDF } from 'jspdf';

import type { Summary } from './api';
import {
  exerciseTotals,
  formatMinutes,
  SIGNAL_LABEL,
  signalsFor,
  groupScoreRows,
  notAssessedNote,
  outcomeLine,
  recommendationCards,
  scoreStatus,
  STATUS_PILL_TEXT,
  STATUS_TEXT,
  type RecommendationCard,
  type ScoreStatus,
} from './reportView';

const PAGE_W = 595.28; // A4, in points
const PAGE_H = 841.89;
const MARGIN = 45; // about 16 mm, the design's print margin
const W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - MARGIN - 16; // room left above the footer rule

type Rgb = [number, number, number];
const INK: Rgb = [26, 26, 26];
const INK_SOFT: Rgb = [90, 90, 90];
const HAIRLINE: Rgb = [219, 219, 217];
const TRACK: Rgb = [236, 236, 234];
const TILE_BG: Rgb = [242, 248, 248];
const ACCENT: Rgb = [0, 119, 139];
const ACCENT_DEEP: Rgb = [0, 60, 81];
const ACCENT_SOFT: Rgb = [226, 239, 239];
const GAP: Rgb = [140, 45, 33];
const GAP_SOFT: Rgb = [251, 233, 231];
const NOTICE_BG: Rgb = [253, 246, 227];
const NOTICE_LINE: Rgb = [181, 137, 0];
const WHITE: Rgb = [255, 255, 255];
const SIGNAL_STYLE: Record<'A' | 'B' | 'C', { fg: Rgb; line: Rgb; bg: Rgb }> = {
  A: { fg: [0, 103, 122], line: [0, 103, 122], bg: [227, 241, 244] },
  B: { fg: [122, 90, 0], line: [181, 137, 0], bg: [253, 246, 227] },
  C: { fg: [91, 58, 122], line: [125, 91, 166], bg: [241, 235, 248] },
};

const SANS = 'helvetica';
const MONO = 'courier';

// Score list column widths. The name takes what is left of the column.
const TRACK_W = 56;
const NUM_W = 20;
const PILL_COL = 62;
const GAP_COL = 6;

// Exercise card text, inside the left border.
const CARD_PAD = 10;
const CARD_TEXT_INSET = 14;
const CHIP_W = 46;

class Doc {
  readonly pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  y = MARGIN;

  newPageIfNeeded(height: number): void {
    if (this.y + height > BOTTOM) {
      this.pdf.addPage();
      this.y = MARGIN;
    }
  }

  setFont(family: string, style: 'normal' | 'bold', size: number, colour: Rgb): void {
    this.pdf.setFont(family, style);
    this.pdf.setFontSize(size);
    this.pdf.setTextColor(...colour);
  }

  wrap(text: string, size: number, width: number, style: 'normal' | 'bold' = 'normal'): string[] {
    this.pdf.setFont(SANS, style);
    this.pdf.setFontSize(size);
    return this.pdf.splitTextToSize(text, width) as string[];
  }

  textWidth(text: string, family: string, style: 'normal' | 'bold', size: number): number {
    this.pdf.setFont(family, style);
    this.pdf.setFontSize(size);
    return this.pdf.getTextWidth(text);
  }

  // Wrapped paragraph; returns the height it used.
  paragraph(
    text: string,
    x: number,
    top: number,
    width: number,
    size: number,
    colour: Rgb = INK,
    style: 'normal' | 'bold' = 'normal',
  ): number {
    const lines = this.wrap(text, size, width, style);
    const step = size * 1.45;
    this.setFont(SANS, style, size, colour);
    lines.forEach((line, i) => this.pdf.text(line, x, top + size + i * step));
    return lines.length * step;
  }

  rect(x: number, y: number, w: number, h: number, fill: Rgb | null, stroke?: Rgb): void {
    if (fill) this.pdf.setFillColor(...fill);
    if (stroke) this.pdf.setDrawColor(...stroke);
    this.pdf.setLineWidth(0.6);
    this.pdf.rect(x, y, w, h, fill && stroke ? 'FD' : fill ? 'F' : 'S');
  }

  line(x1: number, x2: number, y: number, colour: Rgb, width = 0.5): void {
    this.pdf.setDrawColor(...colour);
    this.pdf.setLineWidth(width);
    this.pdf.line(x1, y, x2, y);
  }

  // A pill whose right edge sits at `right`. Returns its width.
  pill(text: string, right: number, top: number, fg: Rgb, bg: Rgb, border: Rgb): number {
    const w = this.textWidth(text, SANS, 'bold', 7.5) + 12;
    this.rect(right - w, top, w, 15, bg, border);
    this.setFont(SANS, 'bold', 7.5, fg);
    this.pdf.text(text, right - w / 2, top + 10.5, { align: 'center' });
    return w;
  }

  // Section heading: bold text with a 1.6pt rule under it, as in the design.
  heading(text: string, x = MARGIN, width = W): void {
    this.setFont(SANS, 'bold', 13, INK);
    this.pdf.text(text, x, this.y + 10);
    this.line(x, x + width, this.y + 17, INK, 1.6);
  }
}

// ---- Scores by goal (left column) ----

// A small bordered tag for one signal. Returns its width.
function drawSignalChip(doc: Doc, code: 'A' | 'B' | 'C', x: number, top: number): number {
  const style = SIGNAL_STYLE[code];
  const label = SIGNAL_LABEL[code];
  const w = doc.textWidth(label, SANS, 'bold', 6.5) + 10;
  doc.rect(x, top, w, 12, style.bg, style.line);
  doc.setFont(SANS, 'bold', 6.5, style.fg);
  doc.pdf.text(label, x + 5, top + 8.3);
  return w;
}

function scoreBlock(
  doc: Doc,
  x: number,
  top: number,
  width: number,
  summary: Summary,
  draw: boolean,
): number {
  const threshold = summary.gap_threshold;
  const nameW = width - TRACK_W - NUM_W - PILL_COL - GAP_COL * 3;
  const trackX = x + nameW + GAP_COL;
  const numRight = trackX + TRACK_W + GAP_COL + NUM_W;
  let y = top;

  // Legend: the three signals, above the list.
  if (draw) {
    let lx = x;
    for (const code of ['A', 'B', 'C'] as const) {
      lx += drawSignalChip(doc, code, lx, y) + 4;
    }
  }
  y += 22;

  for (const group of groupScoreRows(summary.scores, threshold)) {
    if (draw) {
      doc.setFont(SANS, 'bold', 7, INK_SOFT);
      doc.pdf.text(group.title.toUpperCase(), x, y + 7);
    }
    y += 14;

    for (const row of group.rows) {
      const state: ScoreStatus = scoreStatus(row.score, threshold);
      const isGap = state === 'gap';
      const lines = doc.wrap(`${row.goal} ${row.label}`, 8.5, nameW, isGap ? 'bold' : 'normal');
      const signals = signalsFor(row.sources);
      const signalH = signals.length ? 16 : 0;
      const h = Math.max(lines.length * 11, 16) + 8 + signalH;

      if (draw) {
        if (isGap) doc.rect(x - 9, y + 1, 3, h - 2, GAP, undefined);
        doc.setFont(SANS, isGap ? 'bold' : 'normal', 8.5, isGap ? GAP : INK);
        lines.forEach((line, i) => doc.pdf.text(line, x, y + 10 + i * 11));
        // Signal tags under the goal name: where the score came from.
        let sx = x;
        for (const signal of signals) {
          sx += drawSignalChip(doc, signal.code, sx, y + 10 + lines.length * 11 + 1) + 4;
        }

        const barY = y + h / 2 - 4;
        if (row.score === null) {
          doc.rect(trackX, barY, TRACK_W, 8, null, HAIRLINE);
          doc.setFont(SANS, 'normal', 8.5, INK_SOFT);
          doc.pdf.text('-', numRight, barY + 7, { align: 'right' });
        } else {
          doc.rect(trackX, barY, TRACK_W, 8, TRACK);
          doc.rect(trackX, barY, (TRACK_W * row.score) / 5, 8, isGap ? GAP : ACCENT);
          // Threshold tick: 2px wide, slightly taller than the bar, at threshold / 5 of the track.
          const tickX = trackX + (TRACK_W * threshold) / 5;
          doc.pdf.setDrawColor(...INK);
          doc.pdf.setLineWidth(1.4);
          doc.pdf.line(tickX, barY - 3, tickX, barY + 11);
          doc.setFont(MONO, 'bold', 9, INK);
          doc.pdf.text(String(row.score), numRight, barY + 7, { align: 'right' });
        }

        const pillFg = isGap ? GAP : state === 'met' ? ACCENT_DEEP : INK_SOFT;
        const pillBg = isGap ? GAP_SOFT : WHITE;
        const pillBorder = isGap ? GAP : state === 'met' ? ACCENT_DEEP : HAIRLINE;
        doc.pill(STATUS_PILL_TEXT[state], x + width, y + h / 2 - 7.5, pillFg, pillBg, pillBorder);
        doc.line(x, x + width, y + h, HAIRLINE);
      }
      y += h;
    }
    y += 6;
  }
  return y - top;
}

// ---- Recommended exercises (right column) ----

function cardBlock(
  doc: Doc,
  x: number,
  top: number,
  colW: number,
  card: RecommendationCard,
  draw: boolean,
): number {
  const textX = x + CARD_TEXT_INSET;
  const textW = colW - CARD_TEXT_INSET - CARD_PAD;
  const titleLines = doc.wrap(card.title, 9.5, textW - CHIP_W, 'bold');
  const linkedLines = doc.wrap(`Linked goal: ${card.goal}`, 8, textW);
  const whyLines = doc.wrap(`Why: ${card.why}`, 8, textW);
  // One outcome is plain text. Several are bulleted, as on the screen.
  const outcomeLines =
    card.outcomes.length === 0
      ? doc.wrap('No outcome mapped yet (mapping not agreed)', 8, textW)
      : card.outcomes.length === 1
        ? doc.wrap(outcomeLine(card.outcomes[0]), 8, textW)
        : card.outcomes.flatMap((outcome) => doc.wrap(`• ${outcomeLine(outcome)}`, 8, textW));

  const height =
    CARD_PAD +
    titleLines.length * 12 +
    6 +
    linkedLines.length * 10 +
    4 +
    whyLines.length * 10 +
    6 +
    9 +
    2 +
    outcomeLines.length * 10 +
    CARD_PAD;

  if (draw) {
    doc.rect(x, top, colW, height, WHITE, HAIRLINE);
    doc.rect(x, top, 3, height, GAP);

    let y = top + CARD_PAD;
    doc.setFont(SANS, 'bold', 9.5, INK);
    titleLines.forEach((line, i) => doc.pdf.text(line, textX, y + 9 + i * 12));
    if (card.minutes !== null) {
      doc.pill(formatMinutes(card.minutes), x + colW - CARD_PAD, y - 2, GAP, GAP_SOFT, GAP);
    }
    y += titleLines.length * 12 + 6;

    doc.setFont(SANS, 'normal', 8, INK_SOFT);
    linkedLines.forEach((line, i) => doc.pdf.text(line, textX, y + 8 + i * 10));
    y += linkedLines.length * 10 + 4;

    doc.setFont(SANS, 'normal', 8, INK_SOFT);
    whyLines.forEach((line, i) => doc.pdf.text(line, textX, y + 8 + i * 10));
    y += whyLines.length * 10 + 6;

    doc.setFont(SANS, 'bold', 6.5, INK_SOFT);
    doc.pdf.text(card.outcomes.length === 1 ? 'OUTCOME' : 'OUTCOMES', textX, y + 7);
    y += 9 + 2;

    doc.setFont(SANS, 'normal', 8, INK);
    outcomeLines.forEach((line, i) => doc.pdf.text(line, textX, y + 8 + i * 10));
  }
  return height;
}

// ---- The page ----

export function buildReportPdf(summary: Summary): Blob {
  const doc = new Doc();
  const { pdf } = doc;

  // Header: eyebrow and title on the left; status and saved line on the right.
  doc.setFont(SANS, 'bold', 7.5, INK_SOFT);
  pdf.text('SKILL ASSESSMENT REPORT', MARGIN, doc.y + 8);
  doc.setFont(SANS, 'bold', 22, INK);
  pdf.text(`Trainee ${summary.trainee_id}`, MARGIN, doc.y + 36);
  doc.pill(STATUS_TEXT[summary.status], MARGIN + W, doc.y, ACCENT_DEEP, ACCENT_SOFT, ACCENT_DEEP);
  doc.setFont(SANS, 'normal', 7.5, INK_SOFT);
  pdf.text(`Report saved · run ${summary.run_id.slice(0, 8)}`, MARGIN + W, doc.y + 32, {
    align: 'right',
  });
  doc.y += 50;

  // Four tiles. The skill gaps value is red when there are gaps.
  const tiles: [string, string, boolean][] = [
    ['GOALS ASSESSED', `${summary.assessed_count} of ${summary.goal_count}`, false],
    ['SKILL GAPS', String(summary.gaps.length), summary.gaps.length > 0],
    ['EXERCISES', String(exerciseTotals(summary.gaps).count), false],
    ['STRONG AREAS', String(summary.strong.length), false],
  ];
  const tileGap = 10;
  const tileW = (W - tileGap * 3) / 4;
  doc.newPageIfNeeded(60);
  tiles.forEach(([label, value, alert], i) => {
    const x = MARGIN + i * (tileW + tileGap);
    doc.rect(x, doc.y, tileW, 46, TILE_BG, HAIRLINE);
    doc.setFont(SANS, 'bold', 6.5, INK_SOFT);
    pdf.text(label, x + 9, doc.y + 14);
    doc.setFont(MONO, 'bold', 12, alert ? GAP : INK);
    pdf.text(value, x + 9, doc.y + 35);
    if (i === 2) {
      // The time, small, with a clock beside it: how long the exercises take.
      const cx = x + 9 + doc.textWidth(value, MONO, 'bold', 12) + 12;
      const cy = doc.y + 31;
      pdf.setDrawColor(...INK_SOFT);
      pdf.setLineWidth(0.8);
      pdf.circle(cx, cy, 4, 'S');
      pdf.line(cx, cy, cx, cy - 2.4);
      pdf.line(cx, cy, cx + 1.8, cy + 1);
      doc.setFont(SANS, 'normal', 8, INK_SOFT);
      pdf.text(exerciseTotals(summary.gaps).time, cx + 7, doc.y + 34);
    }
  });
  doc.y += 62;

  // Overview: plain text from the agent.
  doc.newPageIfNeeded(60);
  doc.heading('Overview');
  doc.y += 28;
  doc.y += doc.paragraph(summary.overview, MARGIN, doc.y, W, 10.5, INK) + 18;

  // Two columns: scores (1.1 part) and exercises (1 part), as in the design.
  const gapX = 22;
  const leftW = ((W - gapX) * 1.1) / 2.1;
  const rightW = W - gapX - leftW;
  const rightX = MARGIN + leftW + gapX;
  const cards = recommendationCards(summary.gaps);

  const measureLeft = scoreBlock(doc, MARGIN, 0, leftW, summary, false);
  const measureRight =
    cards.length === 0
      ? 24
      : cards.reduce(
          (total, card) => total + cardBlock(doc, rightX, 0, rightW, card, false) + 10,
          0,
        );
  // Keep both columns on one page: start a new page when they would not fit.
  doc.newPageIfNeeded(28 + Math.max(measureLeft, measureRight));

  const headTop = doc.y;
  doc.setFont(SANS, 'bold', 13, INK);
  pdf.text('Scores by goal', MARGIN, headTop + 10);
  pdf.text('Recommended exercises', rightX, headTop + 10);
  doc.line(MARGIN, MARGIN + leftW, headTop + 17, INK, 1.6);
  doc.line(rightX, rightX + rightW, headTop + 17, INK, 1.6);
  const colTop = headTop + 28;

  scoreBlock(doc, MARGIN, colTop, leftW, summary, true);
  let rightY = colTop;
  if (cards.length === 0) {
    doc.paragraph(
      'No goal is a skill gap, so no exercise is needed.',
      rightX,
      rightY,
      rightW,
      8.5,
      INK_SOFT,
    );
    rightY += 24;
  } else {
    for (const card of cards) {
      rightY += cardBlock(doc, rightX, rightY, rightW, card, true) + 10;
    }
  }
  doc.y = Math.max(rightY, colTop + measureLeft) + 16;

  // Strong areas: chips that wrap onto the next line.
  doc.newPageIfNeeded(60);
  doc.heading('Strong areas');
  doc.y += 28;
  if (summary.strong.length === 0) {
    doc.y += doc.paragraph('No goal scores 4 or above yet.', MARGIN, doc.y, W, 9, INK_SOFT) + 8;
  } else {
    let x = MARGIN;
    let y = doc.y;
    for (const row of summary.strong) {
      const text = `${row.goal} ${row.label} · ${row.score}`;
      const chipW = doc.textWidth(text, SANS, 'normal', 8.5) + 16;
      if (x + chipW > MARGIN + W) {
        x = MARGIN;
        y += 22;
      }
      doc.rect(x, y, chipW, 16, ACCENT_SOFT, ACCENT);
      doc.setFont(SANS, 'normal', 8.5, ACCENT_DEEP);
      pdf.text(text, x + 8, y + 11);
      x += chipW + 8;
    }
    doc.y = y + 26;
  }

  // Not assessed: a note box, as in the design.
  doc.newPageIfNeeded(70);
  doc.heading('Not assessed');
  doc.y += 28;
  if (summary.not_assessed.length === 0) {
    doc.y += doc.paragraph('Every goal was assessed.', MARGIN, doc.y, W, 9, INK_SOFT) + 8;
  } else {
    const note = `${notAssessedNote(summary.not_assessed)} This is not a low score.`;
    const noteLines = doc.wrap(note, 9, W - 24);
    const boxH = noteLines.length * 13 + 16;
    doc.newPageIfNeeded(boxH + 10);
    doc.rect(MARGIN, doc.y, W, boxH, NOTICE_BG);
    doc.rect(MARGIN, doc.y, 4, boxH, NOTICE_LINE);
    doc.paragraph(note, MARGIN + 14, doc.y + 8, W - 24, 9, INK);
    doc.y += boxH + 14;
  }

  // Footer.
  const footer =
    "Generated from the trainee's assessment results. Draft, not reviewed: a reviewer must approve it before it is shared.";
  doc.newPageIfNeeded(30);
  doc.line(MARGIN, MARGIN + W, doc.y, HAIRLINE);
  doc.paragraph(footer, MARGIN, doc.y + 6, W, 7, INK_SOFT);

  return pdf.output('blob');
}
