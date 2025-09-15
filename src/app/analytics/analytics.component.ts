import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
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
import { BusinessAnalyticsService } from '../services/Business/Manage/Analytics/business-analytics.service';
import { BusinessAnalytics, AnalyticsLoadingState, BusinessSelectionOption, BusinessSelectionState } from '../models/business-analytics.model';

@Component({
  selector: 'app-analytics',
  standalone: false,
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChartCanvas') barChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('horizontalBarCanvas') horizontalBarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChartCanvas') pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChartCanvas') doughnutChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('radarChartCanvas') radarChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('polarAreaChartCanvas') polarAreaChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('heatmapCanvas') heatmapCanvas!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  lineChart: Chart | null = null;
  barChart: Chart | null = null;
  horizontalBarChart: Chart | null = null;
  pieChart: Chart | null = null;
  doughnutChart: Chart | null = null;
  radarChart: Chart | null = null;
  polarAreaChart: Chart | null = null;
  heatmapChart: Chart | null = null;

  // Component state
  analyticsData: BusinessAnalytics[] = [];
  loadingState: AnalyticsLoadingState = { isLoading: false, hasError: false };
  analyticsSummary = {
    totalBusinesses: 0,
    totalRevenue: 0,
    averageActivityScore: 0,
    totalOrders: 0
  };

  // Business selection state
  businessSelectionState: BusinessSelectionState = {
    allBusinesses: [],
    selectedBusinessIds: [],
    isAllSelected: true,
    selectionMode: 'all'
  };
  availableBusinesses: BusinessSelectionOption[] = [];

  // Destroy subject for subscription management
  private destroy$ = new Subject<void>();

  constructor(private analyticsService: BusinessAnalyticsService) {}

  ngOnInit() {
    // Register all required Chart.js components
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

    // Subscribe to analytics data and loading state
    this.setupDataSubscriptions();
    
    // Load initial data
    this.loadAnalyticsData();
  }

  ngAfterViewInit() {
    // Small delay to ensure DOM is ready, then create charts
    setTimeout(() => {
      if (this.analyticsData.length > 0) {
        this.createAllCharts();
      } else {
        this.createEmptyCharts();
      }
    }, 100);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Destroy chart instances
    this.destroyAllCharts();
  }
  printDashboard(): void {
    // Implementation for printing dashboard
    console.log('Printing dashboard...');
    window.print();
    // Could implement printing functionality here
  }
  private setupDataSubscriptions(): void {
    // Subscribe to analytics data and summary (both use filtered data now)
    combineLatest([
      this.analyticsService.filteredAnalyticsData$,
      this.analyticsService.loadingState$,
      this.analyticsService.getAnalyticsSummary()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([data, loadingState, summary]) => {
      this.analyticsData = data;
      this.loadingState = loadingState;
      this.analyticsSummary = summary;
      
      // Update charts if they exist and we have data
      if (this.lineChart && data.length > 0) {
        this.updateAllCharts();
      } else if (this.lineChart && data.length === 0) {
        this.createEmptyCharts();
      }
    });

    // Subscribe to business selection state
    this.analyticsService.businessSelectionState$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(selectionState => {
      this.businessSelectionState = selectionState;
      this.availableBusinesses = selectionState.allBusinesses;
    });
  }

  private loadAnalyticsData(): void {
    // Load both analytics data and available businesses
    this.analyticsService.getMyBusinessAnalytics().subscribe({
      next: (data) => {
        console.log('Analytics data loaded:', data);
      },
      error: (error) => {
        console.error('Error loading analytics data:', error);
      }
    });

    // Load available businesses for selection
    this.analyticsService.loadAvailableBusinesses().subscribe({
      next: (businesses) => {
        console.log('Available businesses loaded:', businesses);
      },
      error: (error) => {
        console.error('Error loading businesses:', error);
      }
    });
  }

  refreshData(): void {
    this.analyticsService.refreshAnalytics().subscribe({
      next: (data) => {
        console.log('Analytics data refreshed:', data);
      },
      error: (error) => {
        console.error('Error refreshing analytics data:', error);
      }
    });
  }

  exportReport(): void {
    // Implementation for exporting report
    console.log('Exporting analytics report...');
    // Could generate PDF or Excel export here
  }

  // Business Selection Methods
  onBusinessSelectionChange(selectedBusinessIds: string[]): void {
    this.analyticsService.updateBusinessSelection(selectedBusinessIds);
  }

  onSelectAllBusinesses(): void {
    this.analyticsService.selectAllBusinesses();
  }

  onDeselectAllBusinesses(): void {
    this.analyticsService.deselectAllBusinesses();
  }

  onToggleBusinessSelection(businessId: string): void {
    this.analyticsService.toggleBusinessSelection(businessId);
  }

  refreshBusinessList(): void {
    this.analyticsService.refreshBusinessSelection().subscribe({
      next: (businesses) => {
        console.log('Business list refreshed:', businesses);
      },
      error: (error) => {
        console.error('Error refreshing business list:', error);
      }
    });
  }

  private createAllCharts(): void {
      this.createLineChart();
      this.createBarChart();
      this.createHorizontalBarChart();
      this.createPieChart();
      this.createDoughnutChart();
      this.createRadarChart();
      this.createPolarAreaChart();
      this.createHeatmapChart();
  }

  private createEmptyCharts(): void {
    // Create charts with placeholder data when no analytics data is available
    this.createLineChart(true);
    this.createBarChart(true);
    this.createHorizontalBarChart(true);
    this.createPieChart(true);
    this.createDoughnutChart(true);
    this.createRadarChart(true);
    this.createPolarAreaChart(true);
    this.createHeatmapChart(true);
  }

  private updateAllCharts(): void {
    // Update all charts with new data
    if (this.lineChart) this.updateLineChart();
    if (this.barChart) this.updateBarChart();
    if (this.horizontalBarChart) this.updateHorizontalBarChart();
    if (this.pieChart) this.updatePieChart();
    if (this.doughnutChart) this.updateDoughnutChart();
    if (this.radarChart) this.updateRadarChart();
    if (this.polarAreaChart) this.updatePolarAreaChart();
    if (this.heatmapChart) this.updateHeatmapChart();
  }

  private updateLineChart(): void {
    if (!this.lineChart || this.analyticsData.length === 0) return;
    
    // Create a monthly revenue trend based on active months and total revenue
    const businesses = this.analyticsData.slice(0, 5); // Top 5 businesses for clarity
    const labels = businesses.map(b => b.businessName.length > 12 ? b.businessName.substring(0, 12) + '...' : b.businessName);
    
    // Calculate monthly revenue rate for each business
    const monthlyRevenue = businesses.map(b => b.totalRevenue / Math.max(b.activeMonths, 1));
    const totalRevenue = businesses.map(b => b.totalRevenue);
    
    this.lineChart.data.labels = labels;
    this.lineChart.data.datasets = [
      {
        label: 'Monthly Revenue Rate ($)',
        data: monthlyRevenue,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: false
      },
      {
        label: 'Total Revenue ($)',
        data: totalRevenue,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1'
      }
    ];
    
    // Update chart options for dual axis
    this.lineChart.options = {
      ...this.lineChart.options,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Monthly Revenue Rate ($)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Total Revenue ($)'
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Businesses'
          }
        }
      }
    };
    
    this.lineChart.update();
  }

  private updateBarChart(): void {
    if (!this.barChart || this.analyticsData.length === 0) return;
    
    // Sort businesses by revenue and take top ones that fit the chart
    const maxBusinessesToShow = Math.min(this.analyticsData.length, 6);
    const businesses = [...this.analyticsData]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, maxBusinessesToShow);
    
    const labels = businesses.map(b => {
      const maxLength = 12;
      return b.businessName.length > maxLength ? 
        b.businessName.substring(0, maxLength) + '...' : b.businessName;
    });
    
    // Use actual success rate percentage from API (no manual calculation)
    const successRates = businesses.map(b => b.successRatePercentage || 0);
    const totalOrders = businesses.map(b => b.totalOrders);
    const averageOrderValues = businesses.map(b => b.averageOrderValue);
    
    this.barChart.data.labels = labels;
    this.barChart.data.datasets = [
      {
        label: 'Success Rate (%)',
        data: successRates,
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
        yAxisID: 'y'
      },
      {
        label: 'Total Orders',
        data: totalOrders,
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
        yAxisID: 'y1'
      },
      {
        label: 'Avg Order Value ($)',
        data: averageOrderValues,
        backgroundColor: 'rgba(255, 206, 86, 0.8)',
        borderColor: 'rgb(255, 206, 86)',
        borderWidth: 1,
        yAxisID: 'y2'
      }
    ];
    
    // Dynamic scale calculation based on actual data
    const maxSuccessRate = Math.max(...successRates);
    const maxOrders = Math.max(...totalOrders);
    const maxOrderValue = Math.max(...averageOrderValues);
    
    this.barChart.options = {
      ...this.barChart.options,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Success Rate (%)'
          },
          max: Math.max(100, maxSuccessRate * 1.1)
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Total Orders'
          },
          max: maxOrders * 1.2,
          grid: {
            drawOnChartArea: false,
          }
        },
        y2: {
          type: 'linear',
          display: false,
          max: maxOrderValue * 1.2
        },
        x: {
          title: {
            display: true,
            text: 'Businesses (Sorted by Revenue)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: any) {
              if (context.datasetIndex === 0) {
                return `Success Rate: ${context.parsed.y.toFixed(1)}%`;
              } else if (context.datasetIndex === 1) {
                return `Total Orders: ${context.parsed.y}`;
              } else {
                return `Avg Order Value: $${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        }
      }
    };
    
    this.barChart.update();
  }

  private updateHorizontalBarChart(): void {
    if (!this.horizontalBarChart || this.analyticsData.length === 0) return;
    
    // Create a business performance ranking chart
    const sortedData = [...this.analyticsData]
      .sort((a, b) => b.revenuePerformanceScore - a.revenuePerformanceScore)
      .slice(0, 6);
    
    const labels = sortedData.map(business => business.businessName.length > 20 ? 
      business.businessName.substring(0, 20) + '...' : business.businessName);
    
    // Create a comprehensive performance score
    const performanceScores = sortedData.map(business => business.revenuePerformanceScore);
    const revenueData = sortedData.map(business => business.totalRevenue / 1000); // Convert to thousands
    const customerData = sortedData.map(business => business.uniqueCustomers);
    
    // Create dynamic colors based on performance
    const backgroundColors = performanceScores.map(score => {
      if (score >= 80) return 'rgba(76, 175, 80, 0.8)'; // Green for high performance
      if (score >= 60) return 'rgba(255, 193, 7, 0.8)'; // Yellow for medium performance
      if (score >= 40) return 'rgba(255, 152, 0, 0.8)'; // Orange for low-medium performance
      return 'rgba(244, 67, 54, 0.8)'; // Red for low performance
    });
    
    this.horizontalBarChart.data.labels = labels;
    this.horizontalBarChart.data.datasets = [
      {
        label: 'Performance Score',
        data: performanceScores,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }
    ];
    
    // Update chart options
    this.horizontalBarChart.options = {
      ...this.horizontalBarChart.options,
      indexAxis: 'y',
      scales: {
        x: {
          title: {
            display: true,
            text: 'Revenue Performance Score'
          },
          max: 100
        },
        y: {
          title: {
            display: true,
            text: 'Businesses (Ranked by Performance)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (context: any) => {
              const index = context.dataIndex;
              const revenue = (sortedData[index].totalRevenue / 1000).toFixed(1);
              const customers = sortedData[index].uniqueCustomers;
              const orders = sortedData[index].totalOrders;
              return [
                `Revenue: $${revenue}k`,
                `Customers: ${customers}`,
                `Orders: ${orders}`
              ];
            }
          }
        },
        legend: {
          display: false
        }
      }
    };
    
    this.horizontalBarChart.update();
  }

  private updatePieChart(): void {
    if (!this.pieChart || this.analyticsData.length === 0) return;
    
    // Create a revenue distribution pie chart
    const sortedBusinesses = [...this.analyticsData]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
    
    // Group smaller businesses into "Others" if there are more than 5
    const revenues = sortedBusinesses.map(b => b.totalRevenue);
    const labels = sortedBusinesses.map(b => b.businessName.length > 15 ? 
      b.businessName.substring(0, 15) + '...' : b.businessName);
    
    // Add "Others" category if there are more businesses
    if (this.analyticsData.length > 5) {
      const othersRevenue = this.analyticsData
        .slice(5)
        .reduce((sum, b) => sum + b.totalRevenue, 0);
      if (othersRevenue > 0) {
        revenues.push(othersRevenue);
        labels.push(`Others (${this.analyticsData.length - 5})`);
      }
    }
    
    // Create dynamic colors
    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 205, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)'
    ];
    
    this.pieChart.data.labels = labels;
    this.pieChart.data.datasets = [
      {
        data: revenues,
        backgroundColor: colors.slice(0, revenues.length),
        borderColor: colors.slice(0, revenues.length).map(color => color.replace('0.8', '1')),
        borderWidth: 2,
        hoverOffset: 10
      }
    ];
    
    // Update chart options
    this.pieChart.options = {
      ...this.pieChart.options,
      plugins: {
        title: {
          display: true,
          text: 'Revenue Distribution by Business'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const total = revenues.reduce((sum, val) => sum + val, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              const value = (context.parsed / 1000).toFixed(1);
              return `${context.label}: $${value}k (${percentage}%)`;
            }
          }
        },
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            padding: 15,
            generateLabels: (chart: any) => {
              const data = chart.data;
              const total = revenues.reduce((sum, val) => sum + val, 0);
              return data.labels.map((label: string, index: number) => {
                const percentage = ((revenues[index] / total) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  strokeStyle: data.datasets[0].borderColor[index],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: index
                };
              });
            }
          }
        }
      }
    };
    
    this.pieChart.update();
  }

  private updateDoughnutChart(): void {
    if (!this.doughnutChart || this.analyticsData.length === 0) return;
    
    // Create order volume category distribution using real API data
    const volumeCategories = [...new Set(this.analyticsData.map(b => b.orderVolumeCategory))];
    const categoryData = volumeCategories.map(category => 
      this.analyticsData.filter(b => b.orderVolumeCategory === category).length
    );
    
    const total = categoryData.reduce((sum, val) => sum + val, 0);
    
    // Generate dynamic colors based on number of categories
    const generateColors = (count: number) => {
      const baseColors = [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 205, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)',
        'rgba(83, 102, 255, 0.8)'
      ];
      
      // If we need more colors than we have, generate them
      const colors = [];
      for (let i = 0; i < count; i++) {
        if (i < baseColors.length) {
          colors.push(baseColors[i]);
        } else {
          // Generate additional colors with hue rotation
          const hue = (i * 137.5) % 360; // Golden angle for better distribution
          colors.push(`hsla(${hue}, 70%, 50%, 0.8)`);
        }
      }
      return colors;
    };
    
    const colors = generateColors(volumeCategories.length);
    
    this.doughnutChart.data.labels = volumeCategories;
    this.doughnutChart.data.datasets = [
      {
        data: categoryData,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.8', '1')),
        borderWidth: 2,
        hoverOffset: 8
      }
    ];
    
    // Update chart options
    this.doughnutChart.options = {
      ...this.doughnutChart.options,
      plugins: {
        title: {
          display: true,
          text: 'Business Volume Categories'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
              const businessCount = context.parsed;
              return `${context.label}: ${businessCount} business${businessCount !== 1 ? 'es' : ''} (${percentage}%)`;
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            generateLabels: (chart: any) => {
              const data = chart.data;
              return data.labels.map((label: string, index: number) => {
                const value = data.datasets[0].data[index];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  strokeStyle: data.datasets[0].borderColor[index],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: index
                };
              });
            }
          }
        }
      }
    };
    
    this.doughnutChart.update();
  }

  private updateRadarChart(): void {
    if (!this.radarChart || this.analyticsData.length === 0) return;
    
    // Select top businesses by revenue for comparison (max 3 for readability)
    const maxBusinessesToCompare = Math.min(3, this.analyticsData.length);
    const topBusinesses = [...this.analyticsData]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, maxBusinessesToCompare);
    
    // Use actual API metrics - all already normalized/scored appropriately
    const labels = [
      'Revenue Performance',
      'Activity Score', 
      'Success Rate %',
      'Customer Lifetime (Days)',
      'Service Variety',
      'Revenue per Customer ($)'
    ];
    
    // Calculate dynamic maximums for normalization
    const maxCustomerLifetime = Math.max(...this.analyticsData.map(b => b.customerLifetimeDays));
    const maxServices = Math.max(...this.analyticsData.map(b => b.uniqueServicesOffered));
    const maxRevenuePerCustomer = Math.max(...this.analyticsData.map(b => b.revenuePerCustomer));
    
    const datasets = topBusinesses.map((business, index) => {
      // Normalize some metrics to 0-100 scale, others are already scored
      const data = [
        business.revenuePerformanceScore, // Already 0-100
        business.activityScore, // Already 0-100
        business.successRatePercentage, // Already percentage
        maxCustomerLifetime > 0 ? (business.customerLifetimeDays / maxCustomerLifetime) * 100 : 0,
        maxServices > 0 ? (business.uniqueServicesOffered / maxServices) * 100 : 0,
        maxRevenuePerCustomer > 0 ? (business.revenuePerCustomer / maxRevenuePerCustomer) * 100 : 0
      ];
      
      // Generate colors dynamically
      const generateBusinessColor = (index: number) => {
        const hue = (index * 120) % 360; // Spread colors across spectrum
        return {
          background: `hsla(${hue}, 70%, 50%, 0.3)`,
          border: `hsla(${hue}, 70%, 50%, 1)`
        };
      };
      
      const colors = generateBusinessColor(index);
      
      return {
        label: business.businessName.length > 15 ? 
          business.businessName.substring(0, 15) + '...' : business.businessName,
        data: data,
        fill: true,
        backgroundColor: colors.background,
        borderColor: colors.border,
        pointBackgroundColor: colors.border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colors.border,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      };
    });
    
    this.radarChart.data.labels = labels;
    this.radarChart.data.datasets = datasets;
    
    // Dynamic scale maximum based on actual data
    const allDataPoints = datasets.flatMap(d => d.data);
    const maxDataValue = Math.max(...allDataPoints, 100);
    
    this.radarChart.options = {
      ...this.radarChart.options,
      scales: {
        r: {
          beginAtZero: true,
          max: Math.ceil(maxDataValue / 10) * 10, // Round up to nearest 10
          ticks: {
            stepSize: Math.ceil(maxDataValue / 50) * 10 // Dynamic step size
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          pointLabels: {
            font: {
              size: 11
            },
            padding: 10
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: `Top ${topBusinesses.length} Business Performance Comparison`
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.r.toFixed(1);
              const metric = context.label;
              let unit = '';
              
              // Add appropriate units based on metric
              if (metric.includes('Score') || metric.includes('Rate')) {
                unit = '%';
              } else if (metric.includes('Days')) {
                unit = ' days (normalized)';
              } else if (metric.includes('Customer')) {
                unit = ' (normalized)';
              }
              
              return `${context.dataset.label} - ${metric}: ${value}${unit}`;
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true
          }
        }
      }
    };
    
    this.radarChart.update();
  }

  private updatePolarAreaChart(): void {
    if (!this.polarAreaChart || this.analyticsData.length === 0) return;
    
    // Create customer distribution analysis using actual customer lifetime data
    const lifetimeRanges = [
      { label: '0-30 days', min: 0, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '91+ days', min: 91, max: Infinity }
    ];
    
    const customerData = lifetimeRanges.map(range => {
      return this.analyticsData.filter(b => 
        b.customerLifetimeDays >= range.min && b.customerLifetimeDays <= range.max
      ).reduce((sum, b) => sum + b.uniqueCustomers, 0);
    });
    
    const labels = lifetimeRanges.map(range => range.label);
    const total = customerData.reduce((sum, val) => sum + val, 0);
    
    // Generate colors based on lifetime value (longer = better = greener)
    const colors = [
      'rgba(255, 99, 132, 0.8)',  // Red for short term
      'rgba(255, 206, 86, 0.8)',  // Yellow for medium-short
      'rgba(54, 162, 235, 0.8)',  // Blue for medium-long  
      'rgba(75, 192, 192, 0.8)'   // Green for long term
    ];
    
    this.polarAreaChart.data.labels = labels;
    this.polarAreaChart.data.datasets = [
      {
        data: customerData,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.8', '1')),
        borderWidth: 2
      }
    ];
    
    // Update chart options
    this.polarAreaChart.options = {
      ...this.polarAreaChart.options,
      plugins: {
        title: {
          display: true,
          text: 'Customer Lifetime Distribution'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
              const customers = context.parsed;
              return `${context.label}: ${customers} customers (${percentage}%)`;
            }
          }
        },
        legend: {
          position: 'right',
          labels: {
            padding: 15,
            generateLabels: (chart: any) => {
              const data = chart.data;
              return data.labels.map((label: string, index: number) => {
                const value = data.datasets[0].data[index];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  strokeStyle: data.datasets[0].borderColor[index],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: index
                };
              });
            }
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: Math.max(...customerData) * 1.1
        }
      }
    };
    
    this.polarAreaChart.update();
  }

  private updateHeatmapChart(): void {
    if (!this.heatmapChart || this.analyticsData.length === 0) return;
    
    // Create revenue efficiency heatmap using real business data
    const businesses = this.analyticsData.slice(0, 8); // Take up to 8 businesses for heatmap
    const labels = businesses.map((b, index) => `${b.businessName.substring(0, 8)}...`);
    
    // Calculate efficiency metric: Revenue per order
    const efficiencyData = businesses.map(b => {
      return b.totalOrders > 0 ? b.totalRevenue / b.totalOrders : 0;
    });
    
    // Create color gradient based on efficiency values
    const maxEfficiency = Math.max(...efficiencyData);
    const minEfficiency = Math.min(...efficiencyData);
    const range = maxEfficiency - minEfficiency;
    
    const backgroundColors = efficiencyData.map(value => {
      if (range === 0) return 'rgba(75, 192, 192, 0.6)';
      
      const intensity = range > 0 ? (value - minEfficiency) / range : 0;
      const red = Math.round(255 * (1 - intensity));
      const green = Math.round(255 * intensity);
      return `rgba(${red}, ${green}, 100, 0.8)`;
    });
    
    this.heatmapChart.data.labels = labels;
    this.heatmapChart.data.datasets = [
      {
        label: 'Revenue per Order ($)',
        data: efficiencyData,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }
    ];
    
    // Update chart options
    this.heatmapChart.options = {
      ...this.heatmapChart.options,
      scales: {
        y: {
          title: {
            display: true,
            text: 'Revenue per Order ($)'
          },
          beginAtZero: true,
          max: maxEfficiency * 1.1
        },
        x: {
          title: {
            display: true,
            text: 'Businesses (by Revenue Efficiency)'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Revenue Efficiency by Business'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const businessIndex = context.dataIndex;
              const business = businesses[businessIndex];
              const efficiency = context.parsed.y.toFixed(2);
              return [
                `${business.businessName}`,
                `Revenue per Order: $${efficiency}`,
                `Total Revenue: $${business.totalRevenue.toLocaleString()}`,
                `Total Orders: ${business.totalOrders}`
              ];
            }
          }
        },
        legend: {
          display: false
        }
      }
    };
    
    this.heatmapChart.update();
  }

  private destroyAllCharts(): void {
    [
      this.lineChart,
      this.barChart,
      this.horizontalBarChart,
      this.pieChart,
      this.doughnutChart,
      this.radarChart,
      this.polarAreaChart,
      this.heatmapChart
    ].forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
  }

  createLineChart(isPlaceholder: boolean = false) {
    const ctx = this.lineChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Revenue',
              data: isPlaceholder ? [3200, 4100, 3800, 5200, 4800, 6100, 5500] : [3200, 4100, 3800, 5200, 4800, 6100, 5500],
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

  createBarChart(isPlaceholder: boolean = false) {
    const ctx = this.barChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Appointments',
              data: isPlaceholder ? [12, 19, 15, 25, 22, 30, 28] : [12, 19, 15, 25, 22, 30, 28],
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

  createHorizontalBarChart(isPlaceholder: boolean = false) {
    const ctx = this.horizontalBarCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.horizontalBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Haircut', 'Styling', 'Color', 'Treatment', 'Consultation'],
          datasets: [
            {
              label: 'Bookings',
              data: isPlaceholder ? [45, 32, 28, 18, 12] : [45, 32, 28, 18, 12],
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

  createPieChart(isPlaceholder: boolean = false) {
    const ctx = this.pieChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['New Customers', 'Returning Customers'],
          datasets: [{
            data: isPlaceholder ? [35, 65] : [35, 65],
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

  createDoughnutChart(isPlaceholder: boolean = false) {
    const ctx = this.doughnutChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['18-25', '26-35', '36-45', '46-55', '55+'],
          datasets: [{
            data: isPlaceholder ? [25, 35, 20, 15, 5] : [25, 35, 20, 15, 5],
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

  createRadarChart(isPlaceholder: boolean = false) {
    const ctx = this.radarChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ['Productivity', 'Customer Rating', 'Revenue', 'Efficiency', 'Attendance'],
          datasets: [
            {
              label: 'Sarah Johnson',
              data: isPlaceholder ? [85, 92, 78, 88, 95] : [85, 92, 78, 88, 95],
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
              data: isPlaceholder ? [78, 88, 85, 82, 90] : [78, 88, 85, 82, 90],
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

  createPolarAreaChart(isPlaceholder: boolean = false) {
    const ctx = this.polarAreaChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.polarAreaChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
          labels: ['Credit Card', 'Cash', 'Digital Wallet', 'Bank Transfer'],
          datasets: [{
            label: 'Payment Methods',
            data: isPlaceholder ? [45, 25, 20, 10] : [45, 25, 20, 10],
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

  createHeatmapChart(isPlaceholder: boolean = false) {
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
              data: isPlaceholder ? [30, 45, 60, 80, 70, 85, 90, 75, 50] : [30, 45, 60, 80, 70, 85, 90, 75, 50],
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