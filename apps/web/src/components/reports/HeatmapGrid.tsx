'use client';

import React from 'react';
import './HeatmapGrid.css';

interface HeatmapData {
  x_labels: string[];
  y_labels: string[];
  values: number[][];
}

interface HeatmapGridProps {
  data: HeatmapData;
  title?: string;
  colorScale?: {
    min: number;
    max: number;
    color: string;
  };
}

export default function HeatmapGrid({ 
  data, 
  title = "Utilization Heatmap",
  colorScale = { min: 0, max: 100, color: '#d8ff3e' }
}: HeatmapGridProps) {
  const { x_labels, y_labels, values } = data;

  //color intensity for each cell
  const getCellColor = (value: number) => {
    const normalizedValue = (value - colorScale.min) / (colorScale.max - colorScale.min);
    const alpha = Math.max(0.1, Math.min(1, normalizedValue));
    return `${colorScale.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  };

  const cellWidth = 60; // Smaller for better fit with more columns
  const cellHeight = 50;
  const gridWidth = x_labels.length * cellWidth;
  const gridHeight = y_labels.length * cellHeight;

  return (
    <div className="heatmap-container">
      <div className="heatmap-title">{title}</div>
      
      <div className="heatmap-wrapper">
        {/* Y-axis labels */}
        <div className="y-axis-labels">
          {y_labels.map((label, index) => (
            <div 
              key={label} 
              className="y-axis-label"
              style={{ 
                height: cellHeight,
                lineHeight: `${cellHeight}px`
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="heatmap-grid-container">
          {/* Scrollable content wrapper */}
          <div className="heatmap-scroll-wrapper">
            {/* X-axis labels */}
            <div className="x-axis-labels" style={{ width: gridWidth }}>
              {x_labels.map((label, index) => (
                <div 
                  key={label} 
                  className="x-axis-label"
                  style={{ 
                    width: cellWidth,
                    left: index * cellWidth + cellWidth / 2
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div 
              className="heatmap-grid" 
              style={{ 
                width: gridWidth, 
                height: gridHeight,
                gridTemplateColumns: `repeat(${x_labels.length}, ${cellWidth}px)`,
                gridTemplateRows: `repeat(${y_labels.length}, ${cellHeight}px)`
              }}
            >
              {values.map((row, rowIndex) =>
                row.map((value, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="heatmap-cell"
                    style={{
                      backgroundColor: getCellColor(value),
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                    title={`${y_labels[rowIndex]} ${x_labels[colIndex]}: ${value}% utilization\n(Class capacity booking rate)`}
                  >
                    <span className="cell-value">{value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="color-legend">
        <div className="legend-label">Utilization %</div>
        <div className="legend-scale">
          <div className="legend-min">{colorScale.min}</div>
          <div className="legend-gradient" style={{
            background: `linear-gradient(to right, ${colorScale.color}10, ${colorScale.color}ff)`
          }}></div>
          <div className="legend-max">{colorScale.max}</div>
        </div>
      </div>
    </div>
  );
}
