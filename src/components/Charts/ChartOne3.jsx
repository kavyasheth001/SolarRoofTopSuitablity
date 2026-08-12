import React from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartOne = ({ series, labels, title }) => {
  const options = {
    chart: {
      type: 'donut',
      height: "100%",
      toolbar: { show: false },
    },
    labels: labels,
    colors: ["#1E3A8A", "#3B82F6", "#60A5FA", "#93C5FD"], // Blue shades for consistency
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: 'bottom',
      labels: { colors: '#5F6368' },
    },
  };

  return (
    <div className="sm:px-7.5 h-full col-span-12 rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-5">
      <div className="mb-3 flex justify-between gap-4">
        <div>
          <h5 className="text-xl font-semibold text-black dark:text-white">{title}</h5>
        </div>
      </div>
      <div className="mb-2 flex justify-center">
        <ReactApexChart options={options} series={series} type="donut" height={350} />
      </div>
    </div>
  );
};

export default ChartOne;
