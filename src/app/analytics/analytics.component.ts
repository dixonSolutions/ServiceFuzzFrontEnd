import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { ButtonModule } from 'primeng/button';
import { 
  Chart, 
  ChartConfiguration, 
  ChartType,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  RadialLinearScale,
  LineController,
  BarController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController
} from 'chart.js';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-analytics',
  standalone: false,
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChartCanvas') barChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('horizontalBarCanvas') horizontalBarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChartCanvas') pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChartCanvas') doughnutChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('radarChartCanvas') radarChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('polarAreaChartCanvas') polarAreaChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('heatmapCanvas') heatmapCanvas!: ElementRef<HTMLCanvasElement>;

  lineChart: Chart | null = null;
  barChart: Chart | null = null;
  horizontalBarChart: Chart | null = null;
  pieChart: Chart | null = null;
  doughnutChart: Chart | null = null;
  radarChart: Chart | null = null;
  polarAreaChart: Chart | null = null;
  heatmapChart: Chart | null = null;
  items: MenuItem[] = [
    {
      label: 'Save',
      icon: 'pi pi-save'
    },
    
  ];

  ngOnInit() {
    // Register all required Chart.js components including controllers
    Chart.register(
      CategoryScale,
      LinearScale,
      RadialLinearScale,
      PointElement,
      LineElement,
      BarElement,
      ArcElement,
      Title,
      Tooltip,
      Legend,
      LineController,
      BarController,
      PieController,
      DoughnutController,
      RadarController,
      PolarAreaController
    );
  }

  ngAfterViewInit() {
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
      this.createLineChart();
      this.createBarChart();
      this.createHorizontalBarChart();
      this.createPieChart();
      this.createDoughnutChart();
      this.createRadarChart();
      this.createPolarAreaChart();
      this.createHeatmapChart();
    }, 100);
  }

  createLineChart() {
    const ctx = this.lineChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Revenue',
              data: [3200, 4100, 3800, 5200, 4800, 6100, 5500],
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  createBarChart() {
    const ctx = this.barChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Appointments',
              data: [12, 19, 15, 25, 22, 30, 28],
              backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)',
                'rgba(199, 199, 199, 0.8)'
              ]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  createHorizontalBarChart() {
    const ctx = this.horizontalBarCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.horizontalBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Haircut', 'Styling', 'Color', 'Treatment', 'Consultation'],
          datasets: [
            {
              label: 'Bookings',
              data: [45, 32, 28, 18, 12],
              backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)'
              ]
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            },
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            y: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  createPieChart() {
    const ctx = this.pieChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['New Customers', 'Returning Customers'],
          datasets: [{
            data: [35, 65],
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            }
          }
        }
      });
    }
  }

  createDoughnutChart() {
    const ctx = this.doughnutChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['18-25', '26-35', '36-45', '46-55', '55+'],
          datasets: [{
            data: [25, 35, 20, 15, 5],
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            }
          }
        }
      });
    }
  }

  createRadarChart() {
    const ctx = this.radarChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ['Productivity', 'Customer Rating', 'Revenue', 'Efficiency', 'Attendance'],
          datasets: [
            {
              label: 'Sarah Johnson',
              data: [85, 92, 78, 88, 95],
              fill: true,
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgb(255, 99, 132)',
              pointBackgroundColor: 'rgb(255, 99, 132)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgb(255, 99, 132)'
            },
            {
              label: 'Mike Chen',
              data: [78, 88, 85, 82, 90],
              fill: true,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgb(54, 162, 235)',
              pointBackgroundColor: 'rgb(54, 162, 235)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgb(54, 162, 235)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }
  }

  createPolarAreaChart() {
    const ctx = this.polarAreaChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.polarAreaChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
          labels: ['Credit Card', 'Cash', 'Digital Wallet', 'Bank Transfer'],
          datasets: [{
            label: 'Payment Methods',
            data: [45, 25, 20, 10],
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(54, 162, 235, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            }
          }
        }
      });
    }
  }

  createHeatmapChart() {
    const ctx = this.heatmapCanvas.nativeElement.getContext('2d');
    if (ctx) {
      // Create a simple bar chart as a heatmap representation
      this.heatmapChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'],
          datasets: [
            {
              label: 'Utilization',
              data: [30, 45, 60, 80, 70, 85, 90, 75, 50],
              backgroundColor: [
                'rgba(255, 99, 132, 0.3)',
                'rgba(255, 99, 132, 0.4)',
                'rgba(255, 99, 132, 0.6)',
                'rgba(255, 99, 132, 0.8)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 99, 132, 0.85)',
                'rgba(255, 99, 132, 0.9)',
                'rgba(255, 99, 132, 0.75)',
                'rgba(255, 99, 132, 0.5)'
              ]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  refreshCharts() {
    // Destroy existing charts
    this.lineChart?.destroy();
    this.barChart?.destroy();
    this.horizontalBarChart?.destroy();
    this.pieChart?.destroy();
    this.doughnutChart?.destroy();
    this.radarChart?.destroy();
    this.polarAreaChart?.destroy();
    this.heatmapChart?.destroy();

    // Recreate charts with fresh data
    setTimeout(() => {
      this.createLineChart();
      this.createBarChart();
      this.createHorizontalBarChart();
      this.createPieChart();
      this.createDoughnutChart();
      this.createRadarChart();
      this.createPolarAreaChart();
      this.createHeatmapChart();
    }, 100);
  }

  exportData() {
    // Implementation for exporting chart data
    console.log('Exporting chart data...');
    // This would typically involve converting chart data to CSV/Excel format
    alert('Chart data export functionality would be implemented here');
  }

  printCharts() {
    // Implementation for printing charts
    console.log('Printing charts...');
    // This would typically involve opening a print dialog
    window.print();
  }
} 