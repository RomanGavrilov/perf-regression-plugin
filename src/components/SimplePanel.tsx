import React, { useState } from 'react';
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
            overflow: hidden;  // Ensure tooltips don't overflow outside the component
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
        tooltip: css`
            position: absolute;
            background-color: black;
            color: white;
            padding: 5px;
            border-radius: 5px;
            visibility: hidden;
            z-index: 100;
        `,
    };
};

// Assuming hardcoded metrics for demonstration
const hardcodedMetrics = [
    { timestamp: 1609459200000, value: 10, replicator: 'Replicator A' }, // 1 Jan 2021
    { timestamp: 1609545600000, value: 20, replicator: 'Replicator B' }, // 2 Jan 2021
    { timestamp: 1609632000000, value: 15, replicator: 'Replicator C' }, // 3 Jan 2021
    { timestamp: 1609718400000, value: 30, replicator: 'Replicator D' }, // 4 Jan 2021
    { timestamp: 1609804800000, value: 25, replicator: 'Replicator E' }, // 5 Jan 2021
];

const SimplePanel: React.FC<Props> = ({ options, width, height }) => {
    const theme = useTheme2();
    const styles = useStyles2(getStyles);
    const [tooltip, setTooltip] = useState({ x: 0, y: 0, content: '', visible: false });

    const scaleX = (timestamp: number) => (timestamp - hardcodedMetrics[0].timestamp) / (hardcodedMetrics[hardcodedMetrics.length - 1].timestamp - hardcodedMetrics[0].timestamp) * width;
    const scaleY = (value: number) => height - (value / Math.max(...hardcodedMetrics.map(m => m.value)) * height);

    const handleMouseOver = (metric: { timestamp?: number; value?: number; replicator: any; }, event: React.MouseEvent<SVGElement, MouseEvent>) => {
        const target = event.target as SVGElement;  // Correct type assertion
        const rect = target.getBoundingClientRect();
        setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            content: metric.replicator,
            visible: true,
        });
    };

    const handleMouseOut = () => {
        setTooltip({ ...tooltip, visible: false });
    };

    return (
        <div className={cx(styles.wrapper)} style={{ width, height }}>
            <svg
                className={styles.svg}
                width={width}
                height={height}
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d={hardcodedMetrics.map((m, i) => `${i === 0 ? 'M' : 'L'}${scaleX(m.timestamp)},${scaleY(m.value)}`).join(' ')}
                    fill="none"
                    stroke={theme.colors.primary.main}
                    strokeWidth="2"
                />
                {hardcodedMetrics.map(metric => (
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
            </svg>
            {tooltip.visible && (
                <div
                    className={styles.tooltip}
                    style={{ top: tooltip.y + 20, left: tooltip.x, visibility: 'visible' }}
                >
                    {tooltip.content}
                </div>
            )}
            <div className={styles.textBox}>
                <div>Number of series: {hardcodedMetrics.length}</div>
                <div>Replicators: {options.text}</div>
            </div>
        </div>
    );
};

export default SimplePanel;
