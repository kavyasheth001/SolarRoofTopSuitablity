import React from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartThree = ({ series, categories, title }) => {
  const options = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: true,
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
        text: 'Risk Level',
      },
    },
    colors: ['#1E3A8A', '#3B82F6', '#60A5FA'], // Blue shades for consistency
    legend: {
      position: 'top',
      horizontalAlign: 'left',
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
      <ReactApexChart options={options} series={series} type="bar" height={350} />
    </div>
  );
};

export default ChartThree;
