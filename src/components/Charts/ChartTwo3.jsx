import React from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartTwo = ({ series, categories, title }) => {
  const options = {
    chart: {
      type: 'line',
      height: 350,
      zoom: { enabled: false },
    },
    title: {
      text: title,
      align: 'center',
      style: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#4f4f4f',
      },
    },
    xaxis: {
      categories: categories,
    },
    yaxis: {
      title: {
        text: 'Number of Resources',
      },
    },
    colors: ["#1E3A8A"], // Blue color for consistency
    stroke: {
      curve: 'smooth',
      width: 4,
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 250 },
        },
      },
    ],
  };

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-4">
      <ReactApexChart options={options} series={series} type="line" height={350} />
    </div>
  );
};

export default ChartTwo;
