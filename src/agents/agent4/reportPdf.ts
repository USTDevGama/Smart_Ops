// The PDF for mock mode only (VITE_USE_MOCKS=true). The real PDF is built by the server
// (POST /v1/reports/pdf). This file draws the same sections as the results page, with jsPDF, so the
// download still works offline. Every value comes from the summary.

import { jsPDF } from 'jspdf';

import type { Summary } from './api';
import {
  exerciseTile,
  groupScoreRows,
  notAssessedNote,
  outcomeLine,
  percentOfScale,
  recommendationCards,
  scoreStatus,
  STATUS_PILL_TEXT,
  STATUS_TEXT,
} from './reportView';

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - MARGIN;

// Colours from the UST palette used on the page, as RGB.
type Rgb = [number, number, number];
const INK: Rgb = [26, 26, 26];
const MUTED: Rgb = [90, 90, 90];
const HAIRLINE: Rgb = [219, 219, 217];
const TRACK: Rgb = [236, 236, 234];
const ACCENT: Rgb = [0, 119, 139];
const ACCENT_DEEP: Rgb = [0, 60, 81];
const ACCENT_SOFT: Rgb = [227, 239, 239];
const GAP: Rgb = [140, 45, 33];
const GAP_SOFT: Rgb = [251, 233, 231];
const NOTICE: Rgb = [253, 246, 227];
const WHITE: Rgb = [255, 255, 255];

class Writer {
  readonly doc = new jsPDF({ unit: 'pt', format: 'a4' });
  y = MARGIN;

  // Start a new page when the next block does not fit.
  room(height: number): void {
    if (this.y + height > BOTTOM) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  font(bold: boolean, size: number, colour: Rgb): void {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...colour);
  }

  text(value: string, x: number, y: number, align: 'left' | 'right' | 'center' = 'left'): void {
    this.doc.text(value, x, y, { align });
  }

  paragraph(value: string, size: number, colour: Rgb = INK, x = MARGIN, width = CONTENT_W): void {
    this.font(false, size, colour);
    const lines = this.doc.splitTextToSize(value, width) as string[];
    const lineHeight = size * 1.45;
    this.room(lines.length * lineHeight);
    for (const line of lines) {
      this.doc.text(line, x, this.y);
      this.y += lineHeight;
    }
  }

  rect(x: number, y: number, w: number, h: number, fill: Rgb, stroke?: Rgb): void {
    this.doc.setFillColor(...fill);
    if (stroke) {
      this.doc.setDrawColor(...stroke);
      this.doc.setLineWidth(0.6);
      this.doc.rect(x, y, w, h, 'FD');
    } else {
      this.doc.rect(x, y, w, h, 'F');
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, colour: Rgb, width = 0.6): void {
    this.doc.setDrawColor(...colour);
    this.doc.setLineWidth(width);
    this.doc.line(x1, y1, x2, y2);
  }

  heading(value: string): void {
    this.room(36);
    this.font(true, 13, INK);
    this.text(value, MARGIN, this.y);
    this.y += 7;
    this.line(MARGIN, this.y, MARGIN + CONTENT_W, this.y, INK, 1.2);
    this.y += 14;
  }
}

function pillWidth(label: string): number {
  return label.length * 5 + 14;
}

export function buildReportPdf(summary: Summary): Blob {
  const w = new Writer();
  const threshold = summary.gap_threshold;

  // Header
  w.font(true, 8, MUTED);
  w.text('SKILL ASSESSMENT REPORT', MARGIN, w.y);
  w.y += 22;
  w.font(true, 20, INK);
  w.text(`Trainee ${summary.trainee_id}`, MARGIN, w.y);
  const status = STATUS_TEXT[summary.status];
  const sw = pillWidth(status);
  w.rect(PAGE_W - MARGIN - sw, w.y - 12, sw, 16, ACCENT_SOFT, ACCENT_DEEP);
  w.font(true, 8.5, ACCENT_DEEP);
  w.text(status, PAGE_W - MARGIN - sw / 2, w.y, 'center');
  w.y += 26;

  // Tiles: four boxes in one row.
  const tiles: [string, string, boolean][] = [
    ['GOALS ASSESSED', `${summary.assessed_count} of ${summary.goal_count}`, false],
    ['SKILL GAPS', String(summary.gaps.length), summary.gaps.length > 0],
    ['EXERCISES', exerciseTile(summary.gaps), false],
    ['STRONG AREAS', String(summary.strong.length), false],
  ];
  const gap = 10;
  const tileW = (CONTENT_W - gap * 3) / 4;
  w.room(54);
  tiles.forEach(([label, value, alert], index) => {
    const x = MARGIN + index * (tileW + gap);
    w.rect(x, w.y, tileW, 50, ACCENT_SOFT, HAIRLINE);
    w.font(true, 7, MUTED);
    w.text(label, x + 8, w.y + 14);
    w.font(true, 14, alert ? GAP : INK);
    w.text(value, x + 8, w.y + 37);
  });
  w.y += 68;

  // Overview: plain text from the agent.
  w.heading('Overview');
  w.paragraph(summary.overview, 10.5);
  w.y += 14;

  // Scores by goal, in the three groups.
  w.heading('Scores by goal');
  for (const group of groupScoreRows(summary.scores, threshold)) {
    w.room(30);
    w.font(true, 7.5, MUTED);
    w.text(group.title.toUpperCase(), MARGIN, w.y);
    w.y += 14;
    for (const row of group.rows) {
      w.room(24);
      const state = scoreStatus(row.score, threshold);
      w.font(false, 9.5, INK);
      w.text(`${row.goal}  ${row.label}`, MARGIN, w.y);
      const barX = MARGIN + 260;
      const barW = 120;
      if (row.score === null) {
        w.doc.setDrawColor(...HAIRLINE);
        w.doc.setLineDashPattern([2, 2], 0);
        w.doc.rect(barX, w.y - 7, barW, 8, 'S');
        w.doc.setLineDashPattern([], 0);
        w.font(false, 9.5, MUTED);
        w.text('—', MARGIN + CONTENT_W - 100, w.y, 'right');
      } else {
        const pct = Number(percentOfScale(row.score).replace('%', '')) / 100;
        const tickPct = Number(percentOfScale(threshold).replace('%', '')) / 100;
        w.rect(barX, w.y - 7, barW, 8, TRACK);
        w.rect(barX, w.y - 7, barW * pct, 8, state === 'gap' ? GAP : ACCENT);
        w.line(barX + barW * tickPct, w.y - 10, barX + barW * tickPct, w.y + 3, INK, 1.2);
        w.font(false, 9.5, INK);
        w.text(String(row.score), MARGIN + CONTENT_W - 100, w.y, 'right');
      }
      const label = STATUS_PILL_TEXT[state];
      const pw = pillWidth(label);
      const colour = state === 'gap' ? GAP : state === 'met' ? ACCENT_DEEP : MUTED;
      w.rect(MARGIN + CONTENT_W - pw, w.y - 10, pw, 14, state === 'gap' ? GAP_SOFT : WHITE, colour);
      w.font(true, 7.5, colour);
      w.text(label, MARGIN + CONTENT_W - pw / 2, w.y, 'center');
      w.y += 20;
    }
    w.y += 4;
  }
  w.y += 10;

  // Recommended exercises: one card per exercise.
  w.heading('Recommended exercises');
  const cards = recommendationCards(summary.gaps);
  if (cards.length === 0) {
    w.paragraph('No goal is a skill gap, so no exercise is needed.', 10);
  }
  for (const card of cards) {
    const outcomeLines = card.outcomes.length
      ? card.outcomes.map((o) => outcomeLine(o))
      : ['No outcome mapped yet (mapping not agreed)'];
    const whyLines = w.doc.splitTextToSize(card.why, CONTENT_W - 28) as string[];
    const height = 42 + whyLines.length * 12 + outcomeLines.length * 12 + 10;
    w.room(Math.min(height, 200));
    const top = w.y;
    w.rect(MARGIN, top - 12, CONTENT_W, height, WHITE, HAIRLINE);
    w.rect(MARGIN, top - 12, 3, height, GAP);
    w.font(true, 10.5, INK);
    w.text(card.title, MARGIN + 14, top);
    if (card.minutes !== null) {
      const chip = `${card.minutes} min`;
      const cw = pillWidth(chip);
      w.rect(PAGE_W - MARGIN - 10 - cw, top - 10, cw, 14, GAP_SOFT);
      w.font(true, 8, GAP);
      w.text(chip, PAGE_W - MARGIN - 10 - cw / 2, top, 'center');
    }
    w.y = top + 14;
    w.font(false, 9, MUTED);
    w.text(`Linked goal: ${card.goal}`, MARGIN + 14, w.y);
    w.y += 13;
    w.font(false, 9.5, INK);
    whyLines.forEach((line) => {
      w.text(line, MARGIN + 14, w.y);
      w.y += 12;
    });
    w.font(true, 8.5, MUTED);
    w.text(card.outcomes.length === 1 ? 'Outcome' : 'Outcomes', MARGIN + 14, w.y);
    w.font(false, 9.5, INK);
    outcomeLines.forEach((line, i) => w.text(line, MARGIN + 80, w.y + i * 12));
    w.y += outcomeLines.length * 12 + 18;
  }
  w.y += 6;

  // Strong areas
  w.heading('Strong areas');
  if (summary.strong.length === 0) {
    w.paragraph('No goal scores 4 or above yet.', 10);
  } else {
    w.paragraph(
      summary.strong.map((row) => `${row.goal} ${row.label} · ${row.score}`).join('   ·   '),
      10,
      ACCENT_DEEP,
    );
  }
  w.y += 10;

  // Not assessed
  w.heading('Not assessed');
  if (summary.not_assessed.length === 0) {
    w.paragraph('Every goal was assessed.', 10);
  } else {
    const note = `${notAssessedNote(summary.not_assessed)} This is not a low score.`;
    const lines = w.doc.splitTextToSize(note, CONTENT_W - 16) as string[];
    w.room(lines.length * 14 + 14);
    w.rect(MARGIN, w.y - 12, CONTENT_W, lines.length * 14 + 10, NOTICE);
    w.paragraph(note, 10, INK, MARGIN + 8, CONTENT_W - 16);
    w.y += 6;
  }
  w.y += 14;

  w.paragraph(
    "Generated from the trainee's assessment results. Draft, not reviewed: a reviewer must approve it before it is shared.",
    8,
    MUTED,
  );

  return w.doc.output('blob');
}
