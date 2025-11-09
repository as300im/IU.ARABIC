// Reports functionality for Room Booking System
class Reports {
    constructor(app) {
        this.app = app;
        this.currentChart = null;
    }

    initializeReports() {
        this.populateYearSelect();
        this.setupReportEventListeners();
        this.handleReportTypeChange(); // Initialize with default type
    }

    populateYearSelect() {
        const yearSelect = document.getElementById('report-year');
        if (!yearSelect) return;

        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        
        // Add years from 2020 to current year + 2
        for (let year = 2020; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}م`;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    setupReportEventListeners() {
        const reportType = document.getElementById('report-type');
        if (reportType) {
            reportType.addEventListener('change', () => {
                this.handleReportTypeChange();
            });
        }
    }

    handleReportTypeChange() {
        const reportType = document.getElementById('report-type');
        const monthContainer = document.getElementById('report-month-container');
        
        if (reportType && monthContainer) {
            if (reportType.value === 'monthly' || reportType.value === 'weekly') {
                monthContainer.style.display = 'block';
            } else {
                monthContainer.style.display = 'none';
            }
        }
    }

    async generateReport() {
        this.app.showLoading(true);
        
        try {
            const reportType = document.getElementById('report-type').value;
            const year = parseInt(document.getElementById('report-year').value);
            const month = document.getElementById('report-month').value;
            
            let reportData;
            
            switch (reportType) {
                case 'weekly':
                    reportData = await this.generateWeeklyReport(year, parseInt(month));
                    break;
                case 'monthly':
                    reportData = await this.generateMonthlyReport(year, parseInt(month));
                    break;
                case 'yearly':
                    reportData = await this.generateYearlyReport(year);
                    break;
                default:
                    throw new Error('نوع تقرير غير صالح');
            }
            
            this.displayReport(reportData, reportType);
            this.createChart(reportData, reportType);
            
        } catch (error) {
            console.error('Report generation error:', error);
            this.app.showAlert(error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async generateWeeklyReport(year, month) {
        // Get all bookings for the specified month
        const bookings = this.app.bookings.filter(booking => {
            const bookingDate = new Date(booking.date_gregorian);
            return bookingDate.getFullYear() === year && 
                   bookingDate.getMonth() === month - 1 &&
                   booking.status === 'confirmed';
        });

        const weeks = this.getWeeksInMonth(year, month);
        const departmentStats = {};
        
        // Initialize department stats
        this.app.departments.forEach(dept => {
            departmentStats[dept.id] = {
                name: dept.name,
                weeks: new Array(weeks.length).fill(0),
                total: 0
            };
        });

        // Count bookings by week and department
        bookings.forEach(booking => {
            const bookingDate = new Date(booking.date_gregorian);
            const weekIndex = this.getWeekIndex(bookingDate, weeks);
            
            if (weekIndex >= 0 && departmentStats[booking.department_id]) {
                departmentStats[booking.department_id].weeks[weekIndex]++;
                departmentStats[booking.department_id].total++;
            }
        });

        return {
            period: `${this.getMonthName(month)} ${year}م`,
            type: 'weekly',
            weeks: weeks,
            departments: departmentStats,
            totalBookings: bookings.length
        };
    }

    async generateMonthlyReport(year, targetMonth) {
        // Get all bookings for the specified year
        const bookings = this.app.bookings.filter(booking => {
            const bookingDate = new Date(booking.date_gregorian);
            return bookingDate.getFullYear() === year && 
                   booking.status === 'confirmed';
        });

        const departmentStats = {};
        const monthlyData = new Array(12).fill(0);
        
        // Initialize department stats
        this.app.departments.forEach(dept => {
            departmentStats[dept.id] = {
                name: dept.name,
                months: new Array(12).fill(0),
                total: 0
            };
        });

        // Count bookings by month and department
        bookings.forEach(booking => {
            const bookingDate = new Date(booking.date_gregorian);
            const monthIndex = bookingDate.getMonth();
            
            monthlyData[monthIndex]++;
            
            if (departmentStats[booking.department_id]) {
                departmentStats[booking.department_id].months[monthIndex]++;
                departmentStats[booking.department_id].total++;
            }
        });

        return {
            period: `${year}م`,
            type: 'monthly',
            months: monthlyData,
            departments: departmentStats,
            totalBookings: bookings.length
        };
    }

    async generateYearlyReport(year) {
        const startYear = year - 2;
        const endYear = year + 2;
        
        const bookings = this.app.bookings.filter(booking => {
            const bookingDate = new Date(booking.date_gregorian);
            const bookingYear = bookingDate.getFullYear();
            return bookingYear >= startYear && 
                   bookingYear <= endYear &&
                   booking.status === 'confirmed';
        });

        const departmentStats = {};
        const yearlyData = {};
        
        // Initialize department stats
        this.app.departments.forEach(dept => {
            departmentStats[dept.id] = {
                name: dept.name,
                years: {},
                total: 0
            };
            
            for (let y = startYear; y <= endYear; y++) {
                departmentStats[dept.id].years[y] = 0;
                if (!yearlyData[y]) yearlyData[y] = 0;
            }
        });

        // Count bookings by year and department
        bookings.forEach(booking => {
            const bookingDate = new Date(booking.date_gregorian);
            const bookingYear = bookingDate.getFullYear();
            
            yearlyData[bookingYear]++;
            
            if (departmentStats[booking.department_id]) {
                departmentStats[booking.department_id].years[bookingYear]++;
                departmentStats[booking.department_id].total++;
            }
        });

        return {
            period: `${startYear} - ${endYear}م`,
            type: 'yearly',
            years: yearlyData,
            departments: departmentStats,
            totalBookings: bookings.length
        };
    }

    displayReport(data, type) {
        const statsContainer = document.getElementById('stats-cards');
        if (!statsContainer) return;

        let statsHtml = '';

        // Total bookings card
        statsHtml += `
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon text-primary">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stats-number text-primary">${data.totalBookings}</div>
                    <div class="stats-label">إجمالي الحجوزات</div>
                </div>
            </div>
        `;

        // Most active department
        const departments = Object.values(data.departments);
        const mostActive = departments.reduce((max, dept) => 
            dept.total > max.total ? dept : max, { total: 0, name: 'لا يوجد' });

        statsHtml += `
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon text-success">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="stats-number text-success">${mostActive.total}</div>
                    <div class="stats-label">الأكثر حجزاً<br><small>${mostActive.name}</small></div>
                </div>
            </div>
        `;

        // Average bookings per period
        let periodCount = 0;
        let avgBookings = 0;
        
        if (type === 'weekly') {
            periodCount = data.weeks.length;
            avgBookings = periodCount > 0 ? Math.round(data.totalBookings / periodCount) : 0;
        } else if (type === 'monthly') {
            periodCount = 12;
            avgBookings = Math.round(data.totalBookings / 12);
        } else if (type === 'yearly') {
            periodCount = Object.keys(data.years).length;
            avgBookings = periodCount > 0 ? Math.round(data.totalBookings / periodCount) : 0;
        }

        const periodName = type === 'weekly' ? 'أسبوع' : type === 'monthly' ? 'شهر' : 'سنة';
        
        statsHtml += `
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon text-info">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stats-number text-info">${avgBookings}</div>
                    <div class="stats-label">متوسط الحجز لكل ${periodName}</div>
                </div>
            </div>
        `;

        // Room usage
        const roomUsage = this.calculateRoomUsage(data);
        const mostUsedRoom = roomUsage.mostUsed;
        
        statsHtml += `
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon text-warning">
                        <i class="fas fa-door-open"></i>
                    </div>
                    <div class="stats-number text-warning">${mostUsedRoom.count}</div>
                    <div class="stats-label">القاعة الأكثر استخداماً<br><small>${mostUsedRoom.name}</small></div>
                </div>
            </div>
        `;

        statsContainer.innerHTML = statsHtml;
    }

    calculateRoomUsage(data) {
        const roomUsage = {};
        
        // Initialize room usage
        this.app.rooms.forEach(room => {
            roomUsage[room.id] = {
                name: room.name,
                count: 0
            };
        });

        // Count room usage from bookings
        this.app.bookings.forEach(booking => {
            if (booking.status === 'confirmed' && roomUsage[booking.room_id]) {
                roomUsage[booking.room_id].count++;
            }
        });

        // Find most used room
        const rooms = Object.values(roomUsage);
        const mostUsed = rooms.reduce((max, room) => 
            room.count > max.count ? room : max, { count: 0, name: 'لا يوجد' });

        return {
            roomUsage,
            mostUsed
        };
    }

    createChart(data, type) {
        const canvas = document.getElementById('bookingChart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const ctx = canvas.getContext('2d');

        let chartData, chartOptions;

        if (type === 'weekly') {
            chartData = this.createWeeklyChartData(data);
            chartOptions = this.createChartOptions('حجوزات كل أسبوع', 'الأسبوع', 'عدد الحجوزات');
        } else if (type === 'monthly') {
            chartData = this.createMonthlyChartData(data);
            chartOptions = this.createChartOptions('حجوزات كل شهر', 'الشهر', 'عدد الحجوزات');
        } else if (type === 'yearly') {
            chartData = this.createYearlyChartData(data);
            chartOptions = this.createChartOptions('حجوزات كل سنة', 'السنة', 'عدد الحجوزات');
        }

        this.currentChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }

    createWeeklyChartData(data) {
        const labels = data.weeks.map((week, index) => `الأسبوع ${index + 1}`);
        const datasets = [];

        // Create dataset for each department
        const colors = ['#667eea', '#764ba2', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14'];
        let colorIndex = 0;

        Object.values(data.departments).forEach(dept => {
            if (dept.total > 0) {
                datasets.push({
                    label: dept.name,
                    data: dept.weeks,
                    backgroundColor: colors[colorIndex % colors.length],
                    borderColor: colors[colorIndex % colors.length],
                    borderWidth: 1
                });
                colorIndex++;
            }
        });

        return { labels, datasets };
    }

    createMonthlyChartData(data) {
        const monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const labels = monthNames;
        const datasets = [];

        // Create dataset for each department
        const colors = ['#667eea', '#764ba2', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14'];
        let colorIndex = 0;

        Object.values(data.departments).forEach(dept => {
            if (dept.total > 0) {
                datasets.push({
                    label: dept.name,
                    data: dept.months,
                    backgroundColor: colors[colorIndex % colors.length],
                    borderColor: colors[colorIndex % colors.length],
                    borderWidth: 1
                });
                colorIndex++;
            }
        });

        return { labels, datasets };
    }

    createYearlyChartData(data) {
        const years = Object.keys(data.years).sort();
        const labels = years.map(year => `${year}م`);
        const datasets = [];

        // Create dataset for each department
        const colors = ['#667eea', '#764ba2', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14'];
        let colorIndex = 0;

        Object.values(data.departments).forEach(dept => {
            if (dept.total > 0) {
                const yearData = years.map(year => dept.years[year] || 0);
                datasets.push({
                    label: dept.name,
                    data: yearData,
                    backgroundColor: colors[colorIndex % colors.length],
                    borderColor: colors[colorIndex % colors.length],
                    borderWidth: 1
                });
                colorIndex++;
            }
        });

        return { labels, datasets };
    }

    createChartOptions(title, xLabel, yLabel) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16,
                        family: 'Cairo'
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xLabel,
                        font: {
                            family: 'Cairo'
                        }
                    },
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yLabel,
                        font: {
                            family: 'Cairo'
                        }
                    },
                    ticks: {
                        font: {
                            family: 'Cairo'
                        },
                        beginAtZero: true
                    }
                }
            }
        };
    }

    // Utility methods
    getWeeksInMonth(year, month) {
        const weeks = [];
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        let currentWeekStart = new Date(firstDay);
        
        // Adjust to start of week (Saturday)
        currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 1) % 7));
        
        while (currentWeekStart <= lastDay) {
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            weeks.push({
                start: new Date(currentWeekStart),
                end: new Date(weekEnd)
            });
            
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }
        
        return weeks;
    }

    getWeekIndex(date, weeks) {
        for (let i = 0; i < weeks.length; i++) {
            if (date >= weeks[i].start && date <= weeks[i].end) {
                return i;
            }
        }
        return -1;
    }

    getMonthName(month) {
        const monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return monthNames[month - 1];
    }
}

// Extend the main app to include reports functionality
RoomBookingApp.prototype.initializeReports = function() {
    this.reports = new Reports(this);
    this.reports.initializeReports();
};

RoomBookingApp.prototype.generateReport = function() {
    if (this.reports) {
        this.reports.generateReport();
    }
};

RoomBookingApp.prototype.handleReportTypeChange = function() {
    if (this.reports) {
        this.reports.handleReportTypeChange();
    }
};