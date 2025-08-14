import React, { useState, useEffect } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import './App.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const fadeInVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

function App() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-03-31');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch the list of companies on component mount
  useEffect(() => {
    // NEW CORRECT CODE
      const apiUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

      // Make sure your fetch call uses this new apiUrl variable
      fetch(`${apiUrl}/api/companies`)
        .then(response => response.json())
        // ... the rest of your code
      .then(response => response.json())
      .then(data => {
        setCompanies(data);
        if (data.length > 0) {
          setSelectedCompany(data[0]);
        }
      })
      .catch(err => setError('Failed to fetch companies.'));
  }, []);

  // 2. Fetch all dashboard data when company or date range changes
  useEffect(() => {
    if (selectedCompany && startDate && endDate) {
      setLoading(true);
      fetch(`http://127.0.0.1:5000/api/dashboard/${selectedCompany}?start_date=${startDate}&end_date=${endDate}`)
        .then(response => {
          if (!response.ok) throw new Error('No data for this company and date range');
          return response.json();
        })
        .then(data => {
          setDashboardData(data);
          setError('');
        })
        .catch(err => {
          setDashboardData(null);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedCompany, startDate, endDate]);

  // --- Helper functions to format data for charts ---
  const createDailyChartData = (data) => ({
    labels: data.map(d => d.date),
    datasets: [{
      label: 'Daily Sales',
      data: data.map(d => d.sales),
      borderColor: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.2)',
      tension: 0.4
    }]
  });

  const createBarChartData = (data, label) => ({
    labels: Object.keys(data),
    datasets: [{
      label: label,
      data: Object.values(data),
      backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e', '#ecf0f1']
    }]
  });

  const createPieChartData = (data, label) => ({
    labels: Object.keys(data),
    datasets: [{
      label: label,
      data: Object.values(data),
      backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6']
    }]
  });

  const LoadingSkeleton = () => (
    <div className="charts-container">
      <div className="skeleton full-width" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sales Analysis Dashboard</h1>
      </header>

      <div className="dashboard-controls">
        <div className="control-group">
          <label htmlFor="company-select">Company</label>
          <select id="company-select" onChange={(e) => setSelectedCompany(e.target.value)} value={selectedCompany}>
            {companies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="start-date-input">Start Date</label>
          <input type="date" id="start-date-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="control-group">
          <label htmlFor="end-date-input">End Date</label>
          <input type="date" id="end-date-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {loading && <LoadingSkeleton />}
      
      {dashboardData && (
        <motion.div 
          className="dashboard-content"
          initial="initial"
          animate="animate"
          variants={fadeInVariants}
          transition={{ duration: 0.5 }}
        >
          <div className="kpi-container">
            <motion.div className="kpi-card" variants={fadeInVariants} transition={{ delay: 0.1 }}>
              <h3>Total Sales</h3>
              <p>${dashboardData.total_sales.toLocaleString()}</p>
            </motion.div>
            <motion.div className="kpi-card" variants={fadeInVariants} transition={{ delay: 0.2 }}>
              <h3>Avg. Sale per Trans.</h3>
              <p>${dashboardData.avg_sales_per_transaction}</p>
            </motion.div>
            <motion.div className="kpi-card" variants={fadeInVariants} transition={{ delay: 0.3 }}>
              <h3>Top Product</h3>
              <p>{dashboardData.top_product}</p>
            </motion.div>
          </div>
          
          <div className="charts-container">
            <motion.div className="chart-item full-width" variants={fadeInVariants} transition={{ delay: 0.4 }}>
              <h3>Daily Sales Trend</h3>
              {dashboardData.daily_sales_trend && <Line data={createDailyChartData(dashboardData.daily_sales_trend)} />}
            </motion.div>
            <motion.div className="chart-item" variants={fadeInVariants} transition={{ delay: 0.5 }}>
              <h3>Sales by Product</h3>
              {dashboardData.category_sales && <Bar data={createBarChartData(dashboardData.category_sales, 'Sales by Product')} />}
            </motion.div>
            <motion.div className="chart-item" variants={fadeInVariants} transition={{ delay: 0.6 }}>
              <h3>Sales by Day of the Week</h3>
              {dashboardData.day_sales && <Bar data={createBarChartData(dashboardData.day_sales, 'Sales by Day of the Week')} />}
            </motion.div>
            <motion.div className="chart-item" variants={fadeInVariants} transition={{ delay: 0.7 }}>
              <h3>Sales by Region</h3>
              {dashboardData.region_sales && <Pie data={createPieChartData(dashboardData.region_sales, 'Sales by Region')} />}
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default App;