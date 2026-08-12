import React, { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';

// This component builds the data object based on chartData (if available)
// or falls back to a single-slice view.
const ChartComponent = ({ chartType, count, colors, chartData }) => {
  const data = useMemo(() => {
    if (chartData) {
      return {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.series,
            backgroundColor: chartData.colors,
          },
        ],
      };
    } else {
      return {
        labels: ['Count'],
        datasets: [
          {
            data: [count],
            backgroundColor: colors,
          },
        ],
      };
    }
  }, [chartData, count, colors]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  }), []);

  return (
    // Here we use a container similar to your old CSS.
    <div className="relative w-full h-[300px] max-w-full mx-auto">
      <Pie data={data} options={options} />
    </div>
  );
};

export default ChartComponent;
