'use client';
import CustomChart from "@/components/Chart/CustomChart";
export default function ReportsPage() {
  return (
    <div style={{ width: 600, margin: 'auto' }}>
      <select
        value={chartType}
        onChange={(e) => setChartType(e.target.value)}
        style={{ marginBottom: 20 }}
      >
        <option value="bar">Bar</option>
        <option value="line">Line</option>
        <option value="pie">Pie</option>
        <option value="doughnut">Doughnut</option>
        <option value="radar">Radar</option>
      </select>

      <CustomChart type={chartType} labels={labels} datasets={datasets} options={options} />
    </div>
  );
}
