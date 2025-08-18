'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
);

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

interface Dataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

interface CustomChartProps {
  type: ChartType;
  labels: string[];
  datasets: Dataset[];
  options?: ChartOptions;
}

export function CustomChart({ type, labels, datasets, options }: CustomChartProps) {
  const defaultColors = [
    'rgba(216, 255, 62, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
  ];

  const processedDatasets = datasets.map((dataset) => {
    if (type === 'pie' || type === 'doughnut') {
      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || defaultColors,
        borderColor: dataset.borderColor || '#2e2e2e',
        borderWidth: dataset.borderWidth || 1,
      };
    }
    return {
      ...dataset,
      borderWidth: dataset.borderWidth || 1,
    };
  });

  const chartData = {
    labels,
    datasets: processedDatasets,
  };

  const chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    ...options,
  };

  return <Chart type={type} data={chartData} options={chartOptions} />;
}
