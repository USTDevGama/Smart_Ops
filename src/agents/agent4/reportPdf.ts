// The report as a PDF, built in the browser with jsPDF. The layout follows the reference PDF
// (ex 1.pdf): one column, a header with four tiles in two rows, the overview, scores by goal as a
// plain list, then recommended exercises, strong areas, not assessed and the footer. The signal tags
// (interview, peer feedback, roleplay) are added under each goal, as on the screen. Every value comes
// from the summary. The screen does not call the server for the PDF.

import { jsPDF } from 'jspdf';

import type { Summary } from './api';
import {
  exerciseTotals,
  formatMinutes,
  groupScoreRows,
  notAssessedNote,
  outcomeLine,
  recommendationCards,
  scoreStatus,
  SIGNAL_LABEL,
  signalsFor,
  STATUS_PILL_TEXT,
  STATUS_TEXT,
  type RecommendationCard,
  type ScoreStatus,
  type Signal,
} from './reportView';

const PAGE_W = 595.28; // A4, in points
const PAGE_H = 841.89;
const MARGIN = 48;
const W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - MARGIN - 14;

type Rgb = [number, number, number];
const INK: Rgb = [26, 26, 26];
const INK_SOFT: Rgb = [90, 90, 90];
const HAIRLINE: Rgb = [219, 219, 217];
const TILE_BG: Rgb = [242, 248, 248];
const ACCENT: Rgb = [0, 119, 139];
const ACCENT_DEEP: Rgb = [0, 60, 81];
const ACCENT_SOFT: Rgb = [226, 239, 239];
const GAP: Rgb = [140, 45, 33];
const GAP_SOFT: Rgb = [251, 233, 231];
const NOTICE_BG: Rgb = [253, 246, 227];
const NOTICE_LINE: Rgb = [181, 137, 0];
const WHITE: Rgb = [255, 255, 255];

// Signal tags, from the design: interview, peer feedback, roleplay.
const SIGNAL_STYLE: Record<Signal['code'], { fg: Rgb; line: Rgb; bg: Rgb }> = {
  A: { fg: [0, 103, 122], line: [0, 103, 122], bg: [227, 241, 244] },
  B: { fg: [122, 90, 0], line: [181, 137, 0], bg: [253, 246, 227] },
  C: { fg: [91, 58, 122], line: [125, 91, 166], bg: [241, 235, 248] },
};

const SANS = 'helvetica';
const MONO = 'courier';

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

  textWidth(text: string, family: string, style: 'normal' | 'bold', size: number): number {
    this.pdf.setFont(family, style);
    this.pdf.setFontSize(size);
    return this.pdf.getTextWidth(text);
  }

  wrap(text: string, size: number, width: number, style: 'normal' | 'bold' = 'normal'): string[] {
    this.pdf.setFont(SANS, style);
    this.pdf.setFontSize(size);
    return this.pdf.splitTextToSize(text, width) as string[];
  }

  // Wrapped paragraph at (x, top). Returns the height used.
  paragraph(
    text: string,
    x: number,
    top: number,
    width: number,
    size: number,
    colour: Rgb = INK,
  ): number {
    const lines = this.wrap(text, size, width);
    const step = size * 1.42;
    this.setFont(SANS, 'normal', size, colour);
    lines.forEach((line, i) => this.pdf.text(line, x, top + size + i * step));
    return lines.length * step;
  }

  // A bold label followed by its value on the same line; the rest of the value wraps under it.
  // Returns the height used. With draw false it only measures.
  labelled(
    label: string,
    value: string,
    x: number,
    top: number,
    width: number,
    size: number,
    draw: boolean,
  ): number {
    const step = size * 1.42;
    const labelW = this.textWidth(`${label} `, SANS, 'bold', size);
    const wrapped = this.wrap(value, size, width - labelW);
    const firstLine = wrapped[0] ?? '';
    const rest = wrapped.length > 1 ? this.wrap(wrapped.slice(1).join(' '), size, width) : [];
    if (draw) {
      this.setFont(SANS, 'bold', size, INK);
      this.pdf.text(label, x, top + size);
      this.setFont(SANS, 'normal', size, INK_SOFT);
      this.pdf.text(firstLine, x + labelW, top + size);
      rest.forEach((line, i) => this.pdf.text(line, x, top + size + (i + 1) * step));
    }
    return (1 + rest.length) * step;
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

  // A boxed pill whose right edge sits at `right`. Returns its width.
  pill(
    text: string,
    right: number,
    top: number,
    fg: Rgb,
    bg: Rgb,
    border: Rgb,
    height = 15,
  ): number {
    const w = this.textWidth(text, SANS, 'bold', 7.5) + 14;
    this.rect(right - w, top, w, height, bg, border);
    this.setFont(SANS, 'bold', 7.5, fg);
    this.pdf.text(text, right - w / 2, top + height / 2 + 2.6, { align: 'center' });
    return w;
  }

  // Section heading: bold, with a heavy rule under it (as in the reference).
  heading(text: string): void {
    this.newPageIfNeeded(44);
    this.setFont(SANS, 'bold', 12.5, INK);
    this.pdf.text(text, MARGIN, this.y + 11);
    this.line(MARGIN, MARGIN + W, this.y + 18, INK, 1.4);
    this.y += 30;
  }

  // Small signal tag. Returns its width.
  signalTag(signal: Signal, x: number, top: number): number {
    const style = SIGNAL_STYLE[signal.code];
    const w = this.textWidth(signal.label, SANS, 'bold', 6.5) + 10;
    this.rect(x, top, w, 11, style.bg, style.line);
    this.setFont(SANS, 'bold', 6.5, style.fg);
    this.pdf.text(signal.label, x + 5, top + 8);
    return w;
  }
}

// ---- Header and tiles ----

function header(doc: Doc, summary: Summary): void {
  const { pdf } = doc;
  doc.setFont(SANS, 'bold', 7, INK_SOFT);
  pdf.setCharSpace(0.7);
  pdf.text('SKILL ASSESSMENT REPORT', MARGIN, doc.y + 8);
  pdf.setCharSpace(0);
  doc.setFont(SANS, 'bold', 22, INK);
  pdf.text(`Trainee ${summary.trainee_id}`, MARGIN, doc.y + 38);
  doc.pill(STATUS_TEXT[summary.status], MARGIN + W, doc.y, ACCENT_DEEP, WHITE, ACCENT_DEEP);
  doc.setFont(SANS, 'normal', 7, INK_SOFT);
  pdf.text(`Report saved · run ${summary.run_id.slice(0, 8)}`, MARGIN + W, doc.y + 30, {
    align: 'right',
  });
  doc.y += 56;
}

function tiles(doc: Doc, summary: Summary): void {
  const exercises = exerciseTotals(summary.gaps);
  const items: [string, string, boolean][] = [
    ['GOALS ASSESSED', `${summary.assessed_count} of ${summary.goal_count}`, false],
    ['SKILL GAPS', String(summary.gaps.length), summary.gaps.length > 0],
    ['EXERCISES', String(exercises.count), false],
    ['STRONG AREAS', String(summary.strong.length), false],
  ];
  const gap = 10;
  const tileW = (W - gap) / 2;
  const tileH = 42;
  doc.newPageIfNeeded(2 * tileH + gap);
  items.forEach(([label, value, alert], i) => {
    const x = MARGIN + (i % 2) * (tileW + gap);
    const y = doc.y + Math.floor(i / 2) * (tileH + gap);
    doc.rect(x, y, tileW, tileH, TILE_BG, HAIRLINE);
    doc.setFont(SANS, 'bold', 6.5, INK_SOFT);
    doc.pdf.text(label, x + 10, y + 14);
    doc.setFont(MONO, 'bold', 13, alert ? GAP : INK);
    doc.pdf.text(value, x + 10, y + 33);
    if (i === 2) {
      // The time beside the count, small, with a clock.
      const cx = x + 10 + doc.textWidth(value, MONO, 'bold', 13) + 16;
      const cy = y + 29;
      doc.pdf.setDrawColor(...INK_SOFT);
      doc.pdf.setLineWidth(0.8);
      doc.pdf.circle(cx, cy, 4, 'S');
      doc.pdf.line(cx, cy, cx, cy - 2.4);
      doc.pdf.line(cx, cy, cx + 1.8, cy + 1);
      doc.setFont(SANS, 'normal', 8, INK_SOFT);
      doc.pdf.text(exercises.time, cx + 7, y + 32);
    }
  });
  doc.y += 2 * tileH + gap + 18;
}

// ---- Overview ----

function overview(doc: Doc, summary: Summary): void {
  doc.heading('Overview');
  doc.y += doc.paragraph(summary.overview, MARGIN, doc.y, W, 10, INK) + 16;
}

// ---- Scores by goal ----

// The name takes what the number, the status box and the gaps around them leave.
const NAME_W = W - 150;

function scores(doc: Doc, summary: Summary): void {
  const threshold = summary.gap_threshold;
  doc.heading('Scores by goal');

  // Legend: the three signals, above the list.
  doc.newPageIfNeeded(20);
  let lx = MARGIN;
  for (const code of ['A', 'B', 'C'] as const) {
    lx += doc.signalTag({ code, label: SIGNAL_LABEL[code] }, lx, doc.y) + 6;
  }
  doc.y += 20;

  for (const group of groupScoreRows(summary.scores, threshold)) {
    doc.newPageIfNeeded(40);
    doc.setFont(SANS, 'bold', 6.5, INK_SOFT);
    doc.pdf.text(group.title.toUpperCase(), MARGIN, doc.y + 8);
    doc.y += 16;

    for (const row of group.rows) {
      const state: ScoreStatus = scoreStatus(row.score, threshold);
      const isGap = state === 'gap';
      const lines = doc.wrap(`${row.goal} ${row.label}`, 9, NAME_W, isGap ? 'bold' : 'normal');
      const signals = signalsFor(row.sources);
      const h = lines.length * 12 + (signals.length ? 15 : 0) + 12;
      doc.newPageIfNeeded(h);

      if (isGap) doc.rect(MARGIN - 10, doc.y + 2, 3, h - 4, GAP);
      doc.setFont(SANS, isGap ? 'bold' : 'normal', 9, isGap ? GAP : INK);
      lines.forEach((line, i) => doc.pdf.text(line, MARGIN, doc.y + 11 + i * 12));

      let sx = MARGIN;
      const sy = doc.y + 11 + lines.length * 12 + 2;
      for (const signal of signals) sx += doc.signalTag(signal, sx, sy) + 4;

      const numRight = MARGIN + W - 72;
      const numY = doc.y + h / 2 + 3;
      if (row.score === null) {
        doc.setFont(SANS, 'normal', 9, INK_SOFT);
        doc.pdf.text('-', numRight, numY, { align: 'right' });
      } else {
        doc.setFont(MONO, 'bold', 10, INK);
        doc.pdf.text(String(row.score), numRight, numY, { align: 'right' });
      }

      const pillTop = doc.y + h / 2 - 7.5;
      const pillText = STATUS_PILL_TEXT[state];
      if (state === 'gap') {
        doc.pill(pillText, MARGIN + W, pillTop, GAP, GAP_SOFT, GAP);
      } else if (state === 'met') {
        doc.pill(pillText, MARGIN + W, pillTop, ACCENT_DEEP, WHITE, ACCENT_DEEP);
      } else {
        doc.pill(pillText, MARGIN + W, pillTop, INK_SOFT, WHITE, HAIRLINE);
      }

      doc.y += h;
      doc.line(MARGIN, MARGIN + W, doc.y, HAIRLINE);
    }
    doc.y += 8;
  }
  doc.y += 10;
}

// ---- Recommended exercises ----

const CARD_PAD = 12;
const CARD_TEXT_W = W - CARD_PAD * 2 - 6;

// One exercise card, full width. With draw false it only measures; the card's height is then the
// same height the drawn card uses, so the text always fits inside the box.
function card(doc: Doc, item: RecommendationCard, top: number, draw: boolean): number {
  if (draw) {
    // The box first, then the text on top of it.
    const height = card(doc, item, top, false);
    doc.rect(MARGIN, top, W, height, WHITE, HAIRLINE);
    doc.rect(MARGIN, top, 3, height, GAP);
  }
  const textX = MARGIN + CARD_PAD + 6;
  const titleLines = doc.wrap(item.title, 10, CARD_TEXT_W - 60, 'bold');

  let y = top + CARD_PAD;
  const titleH = titleLines.length * 13 + 4;
  if (draw) {
    doc.setFont(SANS, 'bold', 10, INK);
    titleLines.forEach((line, i) => doc.pdf.text(line, textX, y + 9 + i * 13));
    if (item.minutes !== null) {
      doc.setFont(SANS, 'normal', 9, GAP);
      doc.pdf.text(formatMinutes(item.minutes), MARGIN + W - CARD_PAD, y + 9, { align: 'right' });
    }
  }
  y += titleH;
  y += doc.labelled('Linked goal:', item.goal, textX, y, CARD_TEXT_W, 8.5, draw) + 4;
  y += doc.labelled('Why:', item.why, textX, y, CARD_TEXT_W, 8.5, draw) + 4;

  if (item.outcomes.length > 1) {
    if (draw) {
      doc.setFont(SANS, 'bold', 8.5, INK);
      doc.pdf.text('Outcomes:', textX, y + 8.5);
    }
    y += 12;
    for (const outcome of item.outcomes) {
      const lines = doc.wrap(`•  ${outcomeLine(outcome)}`, 8.5, CARD_TEXT_W - 6);
      if (draw) {
        doc.setFont(SANS, 'normal', 8.5, INK_SOFT);
        lines.forEach((line, i) => doc.pdf.text(line, textX + 6, y + 8.5 + i * 12));
      }
      y += lines.length * 12;
    }
  } else {
    const text =
      item.outcomes.length === 1
        ? outcomeLine(item.outcomes[0])
        : 'No outcome mapped yet (mapping not agreed)';
    y += doc.labelled('Outcome:', text, textX, y, CARD_TEXT_W, 8.5, draw);
  }

  return y + CARD_PAD - top;
}

function recommendations(doc: Doc, summary: Summary): void {
  doc.heading('Recommended exercises');
  const cards = recommendationCards(summary.gaps);
  if (cards.length === 0) {
    doc.y +=
      doc.paragraph(
        'No goal is a skill gap, so no exercise is needed.',
        MARGIN,
        doc.y,
        W,
        9.5,
        INK_SOFT,
      ) + 10;
    return;
  }
  for (const item of cards) {
    // Measure first, so a card is never split from its page.
    const height = card(doc, item, 0, false);
    doc.newPageIfNeeded(height + 12);
    card(doc, item, doc.y, true);
    doc.y += height + 12;
  }
  doc.y += 8;
}

// ---- Strong areas, not assessed, footer ----

function strong(doc: Doc, summary: Summary): void {
  doc.heading('Strong areas');
  if (summary.strong.length === 0) {
    doc.y += doc.paragraph('No goal scores 4 or above yet.', MARGIN, doc.y, W, 9.5, INK_SOFT) + 10;
    return;
  }
  let x = MARGIN;
  let y = doc.y;
  for (const row of summary.strong) {
    const text = `${row.goal} ${row.label} · ${row.score}`;
    const chipW = doc.textWidth(text, SANS, 'normal', 9) + 16;
    if (x + chipW > MARGIN + W) {
      x = MARGIN;
      y += 22;
    }
    doc.rect(x, y, chipW, 17, ACCENT_SOFT, ACCENT);
    doc.setFont(SANS, 'normal', 9, ACCENT_DEEP);
    doc.pdf.text(text, x + 8, y + 12);
    x += chipW + 8;
  }
  doc.y = y + 30;
}

function notAssessed(doc: Doc, summary: Summary): void {
  doc.heading('Not assessed');
  if (summary.not_assessed.length === 0) {
    doc.y += doc.paragraph('Every goal was assessed.', MARGIN, doc.y, W, 9.5, INK_SOFT) + 10;
    return;
  }
  const note = `${notAssessedNote(summary.not_assessed)} This is not a low score.`;
  const lines = doc.wrap(note, 9.5, W - 28);
  const boxH = lines.length * 13 + 18;
  doc.newPageIfNeeded(boxH + 10);
  doc.rect(MARGIN, doc.y, W, boxH, NOTICE_BG);
  doc.rect(MARGIN, doc.y, 4, boxH, NOTICE_LINE);
  doc.paragraph(note, MARGIN + 14, doc.y + 9, W - 28, 9.5, INK);
  doc.y += boxH + 16;
}

function footer(doc: Doc): void {
  const text =
    "Generated from the trainee's assessment results. Draft, not reviewed: a reviewer must approve it before it is shared.";
  doc.newPageIfNeeded(40);
  doc.line(MARGIN, MARGIN + W, doc.y, HAIRLINE);
  doc.paragraph(text, MARGIN, doc.y + 6, W, 7.5, INK_SOFT);
}

export function buildReportPdf(summary: Summary): Blob {
  const doc = new Doc();
  header(doc, summary);
  tiles(doc, summary);
  overview(doc, summary);
  scores(doc, summary);
  recommendations(doc, summary);
  strong(doc, summary);
  notAssessed(doc, summary);
  footer(doc);
  return doc.pdf.output('blob');
}
