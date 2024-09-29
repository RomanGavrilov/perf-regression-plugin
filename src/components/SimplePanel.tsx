import React, { useState, useEffect } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';

interface Props extends PanelProps<SimpleOptions> {}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox: css`
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 10px;
    `,
  };
};

// Generate metrics with dynamic timestamps
const generateMetrics = () => {
  const now = Date.now();
  const tenHoursAgo = now - 10 * 3600 * 1000; // 10 hours in milliseconds

  return [
    { timestamp: tenHoursAgo, value: 10 },
    { timestamp: tenHoursAgo + 2 * 3600 * 1000, value: 20 },
    { timestamp: tenHoursAgo + 4 * 3600 * 1000, value: 15 },
    { timestamp: tenHoursAgo + 6 * 3600 * 1000, value: 30 },
    { timestamp: tenHoursAgo + 8 * 3600 * 1000, value: 25 },
  ];
};

export const SimplePanel: React.FC<Props> = ({ options, width, height, timeRange }) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const [metrics, setMetrics] = useState(generateMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(generateMetrics());
    }, 60 * 1000); // Update metrics every minute to keep them within the last 10 hours

    return () => clearInterval(interval);
  }, []);

  const scaleX = (timestamp: number) => {
    const range = timeRange.to.valueOf() - timeRange.from.valueOf();
    const offset = timestamp - timeRange.from.valueOf();
    return (offset / range) * width;
  };

  const scaleY = (value: number) => height - (value / Math.max(...metrics.map(m => m.value)) * height);

  const pathD = metrics.reduce((acc, metric, index) => {
    const x = scaleX(metric.timestamp);
    const y = scaleY(metric.value);
    return acc + `${index === 0 ? 'M' : 'L'}${x},${y} `;
  }, '');

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <svg
        className={styles.svg}
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
      >
        <path d={pathD} fill="none" stroke={theme.colors.primary.main} strokeWidth="2" />
        {metrics.map(metric => {
          const x = scaleX(metric.timestamp);
          const y = scaleY(metric.value);
          return (
            <circle cx={x} cy={y} r="5" fill={theme.colors.primary.main} />
          );
        })}
      </svg>

      <div className={styles.textBox}>
        {options.showSeriesCount && (
          <div>Number of series: {metrics.length}</div>
        )}
        <div>Replicators: {options.text}</div>
      </div>
    </div>
  );
};
