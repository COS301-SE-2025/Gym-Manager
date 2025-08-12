import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const chartComponents = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
}

type ChartType = keyof typeof chartComponents;


export default function CustomChart(props : { type : ChartType, labels: string[], datasets: any[], options?:object }) { 
  const ChartComponent = chartComponents[type];
  if (!ChartComponent) 
    ChartComponent = Pie;

  const data = { labels, datasets };
  return (
    <ChartComponent data={data} options={options} />;
    );
}
