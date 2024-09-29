import React, { useState, useEffect, useRef } from 'react';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import * as d3 from 'd3'; // D3 for axis tick generation and formatting

interface Props extends PanelProps<SimpleOptions> { }

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css`
      font-family: Open Sans;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    `,
    svgContainer: css`
      flex-grow: 1;
      position: relative;
    `,
    svg: css`
      cursor: crosshair;
      width: 100%;
      height: 100%;
    `,
    selection: css`
      fill: rgba(0, 123, 255, 0.3);
      stroke: rgba(0, 123, 255, 0.7);
    `,
    textBox: css`
      padding: 10px;
    `,
    tooltip: css`
      position: absolute;
      background-color: black;
      color: white;
      padding: 5px;
      border-radius: 5px;
      visibility: hidden;
      z-index: 100;
    `,
    axis: css`
      font-size: 10px;
      fill: wgite;

      & path.domain {
        stroke: white;
        stroke-width: 1px;
      }
      & g.tick line {
        stroke: white;
        stroke-width: 1px;
      }
      & g.tick text {
        fill: white;
      }
    `,
  };
};

const generateMetrics = () => {
  const metrics = [];
  const now = Date.now(); // Current time in milliseconds
  const tenHoursInMilliseconds = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
  const interval = tenHoursInMilliseconds / 19; // We divide by 19 to get 20 intervals

  for (let i = 0; i < 20; i++) {
    const timestamp = now - tenHoursInMilliseconds + i * interval;
    const value = Math.floor(Math.random() * 100); // Random value between 0 and 100
    const replicator = `Replicator ${String.fromCharCode(65 + (i % 26))}`; // Cycles through A-Z

    metrics.push({ timestamp, value, replicator });
  }

  return metrics;
};

const SimplePanel: React.FC<Props> = ({
  options,
  width,
  height,
  timeRange,
  onChangeTimeRange,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(() => getStyles(theme));
  const margin = { top: 20, right: 20, bottom: 40, left: 40 }; // Add space for axes

  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (svgRef.current) {
      const { clientWidth, clientHeight } = svgRef.current;
      setSvgSize({ width: clientWidth, height: clientHeight });
    }
  }, [width, height]);

  const innerWidth = svgSize.width - margin.left - margin.right;
  const innerHeight = svgSize.height - margin.top - margin.bottom;

  const [tooltip, setTooltip] = useState({
    x: 0,
    y: 0,
    content: '',
    visible: false,
  });
  const [visibleMetrics, setVisibleMetrics] = useState(generateMetrics());
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);

  useEffect(() => {
    setVisibleMetrics(
      generateMetrics().filter(
        (m) =>
          m.timestamp >= timeRange.from.valueOf() &&
          m.timestamp <= timeRange.to.valueOf()
      )
    );
  }, [timeRange]);

  const scaleX = d3
    .scaleTime()
    .domain([timeRange.from.valueOf(), timeRange.to.valueOf()])
    .range([0, innerWidth]);

  const scaleY = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(visibleMetrics, (d: { value: any }) => d.value) || 100,
    ]) // Max value for Y-axis
    .range([innerHeight, 0]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setDragging(true);
      setStartX(x);
      setCurrentX(x);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (dragging && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setCurrentX(x);
    }
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    setDragging(false);
    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const endX = x;
    const startTime = scaleX
      .invert(Math.min(startX - margin.left, endX - margin.left))
      .getTime();
    const endTime = scaleX
      .invert(Math.max(startX - margin.left, endX - margin.left))
      .getTime();

    // Update the global time range
    onChangeTimeRange({
      from: startTime,
      to: endTime,
    });

    // Reset selection
    setCurrentX(0);
    setStartX(0);
  };

  const handleMouseOver = (
    metric: { timestamp?: number; value?: number; replicator: any },
    event: React.MouseEvent<SVGElement, MouseEvent>
  ) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setTooltip({
        x: x,
        y: y,
        content: metric.replicator,
        visible: true,
      });
    }
  };

  const handleMouseOut = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  const selectionWidth = Math.abs(currentX - startX);
  const selectionX = Math.min(startX, currentX);

  const xAxis = d3
    .axisBottom(scaleX)
    .ticks(5)
    .tickFormat((d) =>
      d instanceof Date ? d3.timeFormat('%H:%M')(d) : d.toString()
    );
  const yAxis = d3.axisLeft(scaleY).ticks(5);

  // Create refs for the axes
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (xAxisRef.current) {
      d3.select(xAxisRef.current).call(xAxis);
    }
    if (yAxisRef.current) {
      d3.select(yAxisRef.current).call(yAxis);
    }
  }, [scaleX, scaleY, xAxis, yAxis]);

  return (
    <div
      className={cx(styles.wrapper)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setDragging(false)}
    >
      <div className={styles.svgContainer}>
        <svg
          className={styles.svg}
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Line Path */}
            <path
              d={visibleMetrics
                .map(
                  (m, i) =>
                    `${i === 0 ? 'M' : 'L'}${scaleX(m.timestamp)},${scaleY(
                      m.value
                    )}`
                )
                .join(' ')}
              fill="none"
              stroke={theme.colors.primary.main}
              strokeWidth="2"
            />

            {/* Data Points */}
            {visibleMetrics.map((metric) => (
              <circle
                key={metric.timestamp}
                cx={scaleX(metric.timestamp)}
                cy={scaleY(metric.value)}
                r="5"
                fill={theme.colors.primary.main}
                onMouseOver={(e) => handleMouseOver(metric, e)}
                onMouseOut={handleMouseOut}
              />
            ))}

            {/* Selection Rectangle */}
            {dragging && (
              <rect
                className={styles.selection}
                x={selectionX - margin.left}
                y={0}
                width={selectionWidth}
                height={innerHeight}
              />
            )}

            {/* X Axis */}
            <g
              className={styles.axis}
              ref={xAxisRef}
              transform={`translate(0, ${innerHeight})`}
            />

            {/* Y Axis */}
            <g className={styles.axis} ref={yAxisRef} />
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className={styles.tooltip}
            style={{
              top: tooltip.y + 20,
              left: tooltip.x,
              visibility: 'visible',
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Information Text */}
      <div className={styles.textBox}>
        <div>Number of series: {visibleMetrics.length}</div>
        <div>Replicators: {options.text}</div>
      </div>
    </div>
  );
};

export default SimplePanel;
