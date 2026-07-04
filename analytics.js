// analytics.js

let financialFlowChart = null;
let userMetricsChart = null;

// Initializes and renders Chart.js instances on dashboard panel
export function initializeAnalyticsCharts() {
  const financialCanvas = document.getElementById('financialFlowChart');
  const userCanvas = document.getElementById('userMetricsChart');

  if (financialCanvas) {
    const financialCtx = financialCanvas.getContext('2d');
    
    // Destroy previous reference if active to prevent canvas overlay leaks
    if (financialFlowChart) {
      financialFlowChart.destroy();
    }
    
    financialFlowChart = new Chart(financialCtx, {
      type: 'line',
      data: {
        labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
        datasets: [
          { 
            label: 'Deposits', 
            data: [12000, 19000, 24000, 31000, 29000, 45000], 
            borderColor: '#10b981', 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            fill: true, 
            tension: 0.4 
          },
          { 
            label: 'Withdraws', 
            data: [5000, 11000, 15000, 12000, 21000, 19000], 
            borderColor: '#f43f5e', 
            backgroundColor: 'rgba(244, 63, 94, 0.1)', 
            fill: true, 
            tension: 0.4 
          }
        ]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { 
          x: { display: false }, 
          y: { display: false } 
        }, 
        plugins: { 
          legend: { 
            labels: { color: '#9ca3af' } 
          } 
        } 
      }
    });
  }

  if (userCanvas) {
    const userCtx = userCanvas.getContext('2d');
    
    // Destroy previous reference if active
    if (userMetricsChart) {
      userMetricsChart.destroy();
    }
    
    userMetricsChart = new Chart(userCtx, {
      type: 'doughnut',
      data: { 
        labels: ['Active Users', 'Blocked Users', 'Admins'], 
        datasets: [{ 
          data: [85, 10, 5], 
          backgroundColor: ['#FFD700', '#f43f5e', '#b026ff'], 
          borderWidth: 0 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
          legend: { 
            position: 'bottom', 
            labels: { color: '#9ca3af' } 
          } 
        }, 
        cutout: '70%' 
      }
    });
  }
}