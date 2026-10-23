'use client';

import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { PlayerQuestionHistory } from '../lib/engine';

interface ScoreTrendProps {
  history: PlayerQuestionHistory[];
  totalQuestions?: number;
  currentStreak?: number;
}

export function ScoreTrend({ history, totalQuestions, currentStreak }: ScoreTrendProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Statistics derived from history
  const totalPlayed = history.length;
  const correctCount = history.filter((h) => h.correct).length;
  const accuracy = totalPlayed > 0 ? Math.round((correctCount / totalPlayed) * 100) : 0;
  const maxStreak = history.reduce((max, h) => Math.max(max, h.streak), 0);
  const latest = history[history.length - 1];
  const activeStreak = currentStreak ?? latest?.streak ?? 0;

  // Selected item defaults to hovered, or latest question
  const activeItem = hoveredIdx !== null ? history[hoveredIdx] : latest;

  // Chart dimensions & layout
  const width = 500;
  const height = 210;
  const margin = { top: 32, right: 28, bottom: 32, left: 46 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Augmented data including starting origin (0 pts at Start)
  const chartPoints = useMemo(() => {
    if (!history.length) return [];
    return [
      {
        qi: -1,
        qNum: 0,
        points: 0,
        cumScore: 0,
        correct: false,
        streak: 0,
        reactionMs: undefined,
        isOrigin: true,
      },
      ...history.map((h) => ({ ...h, isOrigin: false })),
    ];
  }, [history]);

  // D3 Scales
  const { xScale, yScale, maxScoreVal, xTicks, yTicks, linePath, areaPath } = useMemo(() => {
    const maxQ = Math.max(totalQuestions || 2, history.length, 2);
    const maxScore = Math.max(d3.max(history, (d) => d.cumScore) || 500, 200);
    const maxScoreCeil = Math.ceil(maxScore * 1.12);

    const x = d3
      .scaleLinear()
      .domain([0, maxQ])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, maxScoreCeil])
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line<{ qNum: number; cumScore: number }>()
      .x((d) => x(d.qNum))
      .y((d) => y(d.cumScore))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<{ qNum: number; cumScore: number }>()
      .x((d) => x(d.qNum))
      .y0(height - margin.bottom)
      .y1((d) => y(d.cumScore))
      .curve(d3.curveMonotoneX);

    // X Ticks: Q0 (Start) and each question up to maxQ
    const xT: number[] = [];
    for (let i = 0; i <= maxQ; i++) {
      if (maxQ > 10 && i % 2 !== 0 && i !== maxQ && i !== 0) continue;
      xT.push(i);
    }

    // Y Ticks: 3 to 4 clean intervals
    const yT = y.ticks(4);

    return {
      xScale: x,
      yScale: y,
      maxScoreVal: maxScoreCeil,
      xTicks: xT,
      yTicks: yT,
      linePath: line(chartPoints) || '',
      areaPath: area(chartPoints) || '',
    };
  }, [chartPoints, history, totalQuestions, margin.left, margin.right, margin.top, margin.bottom, height, width]);

  if (!history.length) return null;

  return (
    <div className="card score-trend-card stack" style={{ animation: 'pop 0.4s both' }}>
      {/* Header with Title and Streak KPI Badges */}
      <div className="score-trend-header">
        <div className="score-trend-title">
          <span className="trend-icon">📈</span>
          <span>Score & Streak Trend</span>
        </div>

        <div className="score-trend-pills">
          <span className={`kpi-pill ${activeStreak >= 2 ? 'hot' : ''}`}>
            {activeStreak >= 2 ? `🔥 ${activeStreak} Streak!` : `Streak: ${activeStreak}`}
          </span>
          <span className="kpi-pill best">⚡ Peak: {maxStreak}</span>
          <span className="kpi-pill">🎯 {accuracy}%</span>
        </div>
      </div>

      {/* D3 SVG Visualization */}
      <div className="score-trend-svg-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="score-trend-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Score Trend and Streak Chart"
        >
          <defs>
            {/* Area Fill Gradient */}
            <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ac1)" stopOpacity="0.45" />
              <stop offset="50%" stopColor="var(--ac2)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--bg-deep)" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing Line Gradient */}
            <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--ac2)" />
              <stop offset="100%" stopColor="var(--ac1)" />
            </linearGradient>

            {/* Neon Drop Shadow for Line and Active Dot */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--ac1)" floodOpacity="0.6" />
            </filter>
            <filter id="flameGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines */}
          <g className="grid-y">
            {yTicks.map((val) => (
              <g key={val} transform={`translate(0, ${yScale(val)})`}>
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 8}
                  y={4}
                  fill="rgba(253, 246, 227, 0.55)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="system-ui, sans-serif"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                </text>
              </g>
            ))}
          </g>

          {/* X Axis Ticks and Labels */}
          <g className="axis-x">
            {xTicks.map((qN) => {
              const xPos = xScale(qN);
              const isPlayed = qN <= history.length;
              return (
                <g key={qN} transform={`translate(${xPos}, ${height - margin.bottom})`}>
                  <line y1="0" y2="6" stroke="rgba(255, 255, 255, 0.2)" />
                  <text
                    y="18"
                    fill={isPlayed ? 'var(--ink)' : 'rgba(253, 246, 227, 0.4)'}
                    fontSize="11"
                    fontWeight={qN === history.length ? 'bold' : 'normal'}
                    textAnchor="middle"
                    fontFamily="system-ui, sans-serif"
                  >
                    {qN === 0 ? 'Start' : `Q${qN}`}
                  </text>
                </g>
              );
            })}
          </g>

          {/* D3 Area Path (Under Curve) */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#scoreAreaGradient)"
              style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }}
            />
          )}

          {/* D3 Glowing Line Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#scoreLineGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />
          )}

          {/* Origin start marker at Q0 */}
          <circle
            cx={xScale(0)}
            cy={yScale(0)}
            r="3.5"
            fill="var(--ac2)"
            stroke="var(--bg-deep)"
            strokeWidth="1.5"
          />

          {/* Active Hover Guide Line */}
          {activeItem && (
            <line
              x1={xScale(activeItem.qNum)}
              x2={xScale(activeItem.qNum)}
              y1={margin.top}
              y2={height - margin.bottom}
              stroke="var(--ac1)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.75"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Data Nodes & Streak Indicators for each Question */}
          {history.map((d, i) => {
            const cx = xScale(d.qNum);
            const cy = yScale(d.cumScore);
            const isHovered = hoveredIdx === i || (hoveredIdx === null && i === history.length - 1);
            const isCorrect = d.correct;
            const hasStreak = d.streak >= 2;

            return (
              <g
                key={d.qi}
                className="chart-node"
                transform={`translate(${cx}, ${cy})`}
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={() => setHoveredIdx(i)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulsing ring for latest question */}
                {i === history.length - 1 && (
                  <circle
                    r="12"
                    fill="none"
                    stroke={isCorrect ? 'var(--ac1)' : '#ef4444'}
                    strokeWidth="1.5"
                    opacity="0.6"
                    className="pulse-ring"
                  />
                )}

                {/* Outer hover highlight */}
                {isHovered && (
                  <circle
                    r="10"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}

                {/* Node Body */}
                <circle
                  r={isHovered ? 6.5 : 5}
                  fill={isCorrect ? '#10b981' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? '2.5' : '1.5'}
                  filter={hasStreak ? 'url(#flameGlow)' : undefined}
                />

                {/* Streak Badge directly above node if streak >= 2 */}
                {hasStreak && (
                  <g transform="translate(0, -18)" className="streak-chart-badge">
                    <rect
                      x="-18"
                      y="-11"
                      width="36"
                      height="16"
                      rx="8"
                      fill="#d97706"
                      stroke="#fef3c7"
                      strokeWidth="1"
                      filter="url(#flameGlow)"
                    />
                    <text
                      y="1"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                    >
                      🔥{d.streak}
                    </text>
                  </g>
                )}

                {/* Streak broken snap indicator */}
                {!isCorrect && i > 0 && history[i - 1]?.streak >= 2 && (
                  <g transform="translate(0, -14)">
                    <text
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                    >
                      💥0
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Detail Box for Focused Question */}
      {activeItem && (
        <div className="trend-focus-card">
          <div className="trend-focus-row">
            <span className="trend-focus-q">
              Question {activeItem.qNum}
              <span className={`trend-status-tag ${activeItem.correct ? 'win' : 'lose'}`}>
                {activeItem.correct ? '✓ Spot On' : '✗ Missed'}
              </span>
            </span>

            <span className="trend-focus-pts">
              {activeItem.correct ? `+${activeItem.points.toLocaleString()} pts` : '+0 pts'}
            </span>
          </div>

          <div className="trend-focus-sub">
            <span>
              Cumulative: <b>{activeItem.cumScore.toLocaleString()} pts</b>
            </span>

            {activeItem.reactionMs !== undefined && (
              <span>⚡ {(activeItem.reactionMs / 1000).toFixed(2)}s</span>
            )}

            <span>
              {activeItem.streak >= 2 ? (
                <b className="flame-text">🔥 {activeItem.streak} In a Row</b>
              ) : activeItem.correct ? (
                'Streak: 1'
              ) : (
                'Streak: 0'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Compact Interactive Timeline Strip */}
      <div className="trend-timeline-strip">
        {history.map((h, i) => {
          const isSelected = hoveredIdx === i || (hoveredIdx === null && i === history.length - 1);
          return (
            <button
              key={h.qi}
              type="button"
              className={`trend-chip ${h.correct ? 'win' : 'lose'} ${isSelected ? 'active' : ''}`}
              onClick={() => setHoveredIdx(i)}
              aria-label={`Question ${h.qNum}: ${h.correct ? 'Correct' : 'Incorrect'}`}
            >
              <span className="chip-q">Q{h.qNum}</span>
              <span className="chip-mark">{h.correct ? '✓' : '✗'}</span>
              {h.streak >= 2 && <span className="chip-streak">🔥{h.streak}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
