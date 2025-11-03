// Main Application JavaScript
class RoomBookingApp {
    constructor() {
        this.currentDate = new Date();
        this.isAdminMode = false;
        this.adminPassword = "091986"; // كلمة مرور المدير
        this.rooms = [];
        this.departments = [];
        this.bookings = [];
        this.currentBookingChart = null;
        
        this.init();
    }

    async init() {
        this.showLoading(true);
        try {
            await this.loadRooms();
            await this.loadDepartments();
            await this.loadBookings();
            this.setupEventListeners();
            this.populateSelects();
            this.initializeCalendar();
            this.updateRoomStatus();
            this.initializeReports();
            this.initializeBookingsLog(); // Initialize bookings log
        } catch (error) {
            console.error('Initialization error:', error);
            this.showAlert('حدث خطأ في تحميل البيانات', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        spinner.style.display = show ? 'block' : 'none';
    }

    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async loadRooms() {
        try {
            const response = await fetch('tables/rooms');
            const result = await response.json();
            this.rooms = result.data.filter(room => room.active);
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.rooms = [];
        }
    }

    async loadDepartments() {
        try {
            const response = await fetch('tables/departments');
            const result = await response.json();
            this.departments = result.data.filter(dept => dept.active);
        } catch (error) {
            console.error('Error loading departments:', error);
            this.departments = [];
        }
    }

    async loadBookings() {
        try {
            const response = await fetch('tables/bookings');
            const result = await response.json();
            this.bookings = result.data.filter(booking => booking.status !== 'cancelled');
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.bookings = [];
        }
    }

    populateSelects() {
        // Populate room icons
        this.populateRoomIcons();
        
        // Populate department icons
        this.populateDepartmentIcons();
        
        // Setup room filter
        this.setupRoomFilter();
        
        // Populate log filters
        this.populateLogFilters();
    }

    populateLogFilters() {
        // Populate room filter in log
        const logRoomFilter = document.getElementById('log-room-filter');
        if (logRoomFilter) {
            logRoomFilter.innerHTML = '<option value="">كل القاعات</option>';
            this.rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = room.name;
                logRoomFilter.appendChild(option);
            });
        }

        // Populate department filter in log
        const logDeptFilter = document.getElementById('log-dept-filter');
        if (logDeptFilter) {
            logDeptFilter.innerHTML = '<option value="">كل الأقسام</option>';
            this.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                logDeptFilter.appendChild(option);
            });
        }
    }

    populateRoomIcons() {
        if (this.rooms.length >= 2) {
            // Discussion room
            const discussionRoom = this.rooms.find(room => room.type === 'discussion');
            if (discussionRoom) {
                const discussionInput = document.getElementById('room-discussion');
                const discussionCard = discussionInput.closest('.room-card');
                if (discussionInput && discussionCard) {
                    discussionInput.value = discussionRoom.id;
                    discussionCard.dataset.roomId = discussionRoom.id;
                    discussionCard.dataset.roomType = discussionRoom.type;
                }
            }

            // Training room
            const trainingRoom = this.rooms.find(room => room.type === 'training');
            if (trainingRoom) {
                const trainingInput = document.getElementById('room-training');
                const trainingCard = trainingInput.closest('.room-card');
                if (trainingInput && trainingCard) {
                    trainingInput.value = trainingRoom.id;
                    trainingCard.dataset.roomId = trainingRoom.id;
                    trainingCard.dataset.roomType = trainingRoom.type;
                }
            }
        }
    }

    populateDepartmentIcons() {
        const departmentMappings = {
            'dept-linguistics': 'قسم اللغويات',
            'dept-literature': 'قسم الأدب والبلاغة',
            'dept-media': 'قسم الإعلام',
            'dept-education': 'قسم التربية',
            'dept-history': 'قسم التاريخ',
            'dept-translation': 'قسم اللغات والترجمة',
            'dept-external': 'حجز من خارج الكلية',
            'dept-other': 'أخرى'
        };

        Object.entries(departmentMappings).forEach(([elementId, deptName]) => {
            const dept = this.departments.find(d => d.name === deptName);
            if (dept) {
                const input = document.getElementById(elementId);
                if (input) {
                    input.value = dept.id;
                }
            }
        });
    }

    setupRoomFilter() {
        // Setup room filter for calendar
        const filterInputs = document.querySelectorAll('input[name="room-filter"]');
        filterInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.handleRoomFilterChange(input.value);
            });
        });
    }

    handleRoomFilterChange(filterValue) {
        // This will be used by calendar to filter rooms
        if (this.updateCalendar) {
            this.updateCalendar();
        }
    }

    getSelectedRoomFilter() {
        const checkedFilter = document.querySelector('input[name="room-filter"]:checked');
        return checkedFilter ? checkedFilter.value : '';
    }

    setupEventListeners() {
        // Date change for Hijri conversion
        const dateInput = document.getElementById('booking-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.updateHijriDate();
                this.checkDateAvailability();
            });
        }

        // Time validation
        const startTime = document.getElementById('start-time');
        const endTime = document.getElementById('end-time');
        if (startTime && endTime) {
            startTime.addEventListener('change', this.validateTimeRange.bind(this));
            endTime.addEventListener('change', this.validateTimeRange.bind(this));
        }

        // Booking form submission
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            bookingForm.addEventListener('submit', this.handleBookingSubmit.bind(this));
        }

        // Admin form submission
        const adminForm = document.getElementById('admin-form');
        if (adminForm) {
            adminForm.addEventListener('submit', this.handleAdminLogin.bind(this));
        }

        // Calendar navigation
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        const todayBtn = document.getElementById('todayBtn');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateMonth(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateMonth(1));
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());

        // Room filter
        const roomFilter = document.getElementById('roomFilter');
        if (roomFilter) {
            roomFilter.addEventListener('change', () => this.updateCalendar());
        }

        // Report type change
        const reportType = document.getElementById('report-type');
        if (reportType) {
            reportType.addEventListener('change', this.handleReportTypeChange.bind(this));
        }
    }

    updateHijriDate() {
        const dateInput = document.getElementById('booking-date');
        const hijriInput = document.getElementById('hijri-date');
        
        if (dateInput && hijriInput && dateInput.value) {
            try {
                const gregorianDate = moment(dateInput.value);
                const hijriDate = gregorianDate.format('iYYYY/iMM/iDD');
                const hijriMonthName = this.getHijriMonthName(gregorianDate.iMonth() + 1);
                hijriInput.value = `${gregorianDate.iDate()} ${hijriMonthName} ${gregorianDate.iYear()}هـ`;
            } catch (error) {
                console.error('Error converting to Hijri:', error);
                hijriInput.value = '';
            }
        }
    }

    getHijriMonthName(month) {
        const months = [
            'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
            'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
            'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
        ];
        return months[month - 1] || '';
    }

    validateTimeRange() {
        const startTime = document.getElementById('start-time');
        const endTime = document.getElementById('end-time');
        
        if (startTime.value && endTime.value) {
            const start = new Date(`2000-01-01 ${startTime.value}`);
            const end = new Date(`2000-01-01 ${endTime.value}`);
            
            if (start >= end) {
                endTime.setCustomValidity('وقت النهاية يجب أن يكون بعد وقت البداية');
                this.showAlert('وقت النهاية يجب أن يكون بعد وقت البداية', 'warning');
            } else {
                endTime.setCustomValidity('');
            }
        }
    }

    async checkDateAvailability() {
        const dateInput = document.getElementById('booking-date');
        const selectedRoom = document.querySelector('input[name="room-select"]:checked');
        const startTime = document.getElementById('start-time');
        const endTime = document.getElementById('end-time');

        // Only check if all necessary fields have values, otherwise skip silently
        if (!dateInput.value || !selectedRoom || !selectedRoom.value || !startTime.value || !endTime.value) {
            return; // Skip validation silently - no error messages for optional fields
        }

        const conflictingBookings = this.bookings.filter(booking => {
            if (booking.date_gregorian === dateInput.value && booking.room_id === selectedRoom.value) {
                const bookingStart = new Date(`2000-01-01 ${booking.start_time}`);
                const bookingEnd = new Date(`2000-01-01 ${booking.end_time}`);
                const newStart = new Date(`2000-01-01 ${startTime.value}`);
                const newEnd = new Date(`2000-01-01 ${endTime.value}`);

                return (newStart < bookingEnd && newEnd > bookingStart);
            }
            return false;
        });

        if (conflictingBookings.length > 0) {
            this.showAlert('يوجد تعارض مع حجز آخر في نفس الوقت', 'warning');
        }
    }

    async handleBookingSubmit(e) {
        e.preventDefault();
        
        this.showLoading(true);
        
        try {
            // Get selected room from radio buttons
            const selectedRoom = document.querySelector('input[name="room-select"]:checked');
            const selectedDepartment = document.querySelector('input[name="department-select"]:checked');
            
            const bookingData = {
                room_id: selectedRoom ? selectedRoom.value : '',
                department_id: selectedDepartment ? selectedDepartment.value : '',
                title: document.getElementById('booking-title').value,
                date_gregorian: document.getElementById('booking-date').value,
                date_hijri: document.getElementById('hijri-date').value,
                start_time: document.getElementById('start-time').value,
                end_time: document.getElementById('end-time').value,
                contact_person: document.getElementById('contact-person').value,
                contact_phone: document.getElementById('contact-phone').value,
                notes: document.getElementById('booking-notes').value,
                status: 'confirmed',
                booking_date: Date.now()
            };

            // Validate only essential fields (Room, Department, Date)
            if (!bookingData.room_id || !bookingData.department_id || !bookingData.date_gregorian) {
                throw new Error('يجب اختيار القاعة والقسم والتاريخ');
            }

            // Check for conflicts only if time is provided
            if (bookingData.start_time && bookingData.end_time) {
                
                await this.loadBookings();
                const conflicts = this.bookings.filter(booking => {
                    if (booking.date_gregorian === bookingData.date_gregorian && 
                        booking.room_id === bookingData.room_id &&
                        booking.status === 'confirmed') {
                        const bookingStart = new Date(`2000-01-01 ${booking.start_time}`);
                        const bookingEnd = new Date(`2000-01-01 ${booking.end_time}`);
                        const newStart = new Date(`2000-01-01 ${bookingData.start_time}`);
                        const newEnd = new Date(`2000-01-01 ${bookingData.end_time}`);

                        return (newStart < bookingEnd && newEnd > bookingStart);
                    }
                    return false;
                });

                if (conflicts.length > 0) {
                    throw new Error('يوجد تعارض مع حجز آخر في نفس الوقت');
                }
            }

            const response = await fetch('tables/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) {
                throw new Error('فشل في إنشاء الحجز');
            }

            const result = await response.json();
            
            this.showAlert('تم تأكيد الحجز بنجاح', 'success');
            
            // Reset form
            e.target.reset();
            document.getElementById('hijri-date').value = '';
            
            // Reload data and update displays
            await this.loadBookings();
            this.updateCalendar();
            this.updateRoomStatus();
            this.loadBookingsLog();
            
        } catch (error) {
            console.error('Booking error:', error);
            this.showAlert(error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    handleAdminLogin(e) {
        e.preventDefault();
        
        const password = document.getElementById('admin-password').value;
        
        if (password === this.adminPassword) {
            this.isAdminMode = true;
            this.showAlert('تم دخول وضع المدير بنجاح', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
            modal.hide();
            
            // Update UI for admin mode
            this.updateAdminUI();
        } else {
            this.showAlert('الرقم السري غير صحيح', 'danger');
        }
        
        // Clear password field
        document.getElementById('admin-password').value = '';
    }

    updateAdminUI() {
        // Add admin indicators and modify booking display
        this.updateCalendar();
    }

    async updateRoomStatus() {
        const today = moment().format('YYYY-MM-DD');
        const now = moment();
        
        // Check each room
        this.rooms.forEach(room => {
            const todayBookings = this.bookings.filter(booking => 
                booking.room_id === room.id && 
                booking.date_gregorian === today &&
                booking.status === 'confirmed'
            );
            
            let isCurrentlyBooked = false;
            
            todayBookings.forEach(booking => {
                const bookingStart = moment(`${booking.date_gregorian} ${booking.start_time}`);
                const bookingEnd = moment(`${booking.date_gregorian} ${booking.end_time}`);
                
                if (now.isBetween(bookingStart, bookingEnd)) {
                    isCurrentlyBooked = true;
                }
            });
            
            const statusElement = document.getElementById(
                room.type === 'discussion' ? 'discussion-status' : 'training-status'
            );
            
            if (statusElement) {
                if (isCurrentlyBooked) {
                    statusElement.textContent = 'مشغولة';
                    statusElement.className = 'badge bg-danger';
                } else {
                    statusElement.textContent = 'متاحة';
                    statusElement.className = 'badge bg-success';
                }
            }
        });
    }

    // Utility methods
    formatDate(date, format = 'YYYY-MM-DD') {
        return moment(date).format(format);
    }

    formatTime(time) {
        return moment(time, 'HH:mm').format('hh:mm A');
    }

    getRoomName(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        return room ? room.name : 'قاعة غير معروفة';
    }

    getDepartmentName(deptId) {
        const dept = this.departments.find(d => d.id === deptId);
        return dept ? dept.name : 'قسم غير معروف';
    }
}

// Global functions
function toggleAdminMode() {
    const modal = new bootstrap.Modal(document.getElementById('adminModal'));
    modal.show();
}

function generateReport() {
    if (window.app && window.app.generateReport) {
        window.app.generateReport();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new RoomBookingApp();
});

// Update room status every minute
setInterval(() => {
    if (window.app) {
        window.app.updateRoomStatus();
    }
}, 60000);

// Bookings Log Functions
RoomBookingApp.prototype.initializeBookingsLog = function() {
    this.currentLogPage = 1;
    this.logPageSize = 20;
    this.setupLogEventListeners();
    this.loadBookingsLog();
};

RoomBookingApp.prototype.setupLogEventListeners = function() {
    // Search input
    const searchInput = document.getElementById('log-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.loadBookingsLog();
            }, 500);
        });
    }

    // Filter radios
    const filterRadios = document.querySelectorAll('input[name="log-filter"]');
    filterRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            this.loadBookingsLog();
        });
    });

    // Room filter
    const roomFilter = document.getElementById('log-room-filter');
    if (roomFilter) {
        roomFilter.addEventListener('change', () => {
            this.loadBookingsLog();
        });
    }

    // Department filter
    const deptFilter = document.getElementById('log-dept-filter');
    if (deptFilter) {
        deptFilter.addEventListener('change', () => {
            this.loadBookingsLog();
        });
    }
};

RoomBookingApp.prototype.loadBookingsLog = function() {
    const tbody = document.getElementById('bookings-log-body');
    if (!tbody) return;

    const searchTerm = document.getElementById('log-search')?.value.toLowerCase() || '';
    const timeFilter = document.querySelector('input[name="log-filter"]:checked')?.value || 'all';
    const roomFilter = document.getElementById('log-room-filter')?.value || '';
    const deptFilter = document.getElementById('log-dept-filter')?.value || '';

    // Filter bookings
    let filteredBookings = this.bookings.filter(booking => {
        // Search filter
        if (searchTerm) {
            const searchFields = [
                booking.title,
                this.getRoomName(booking.room_id),
                this.getDepartmentName(booking.department_id),
                booking.contact_person,
                booking.date_gregorian
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchTerm)) return false;
        }

        // Time filter
        if (timeFilter !== 'all') {
            const today = new Date();
            const bookingDate = new Date(booking.date_gregorian);
            
            if (timeFilter === 'past' && bookingDate >= today) return false;
            if (timeFilter === 'current') {
                const isToday = bookingDate.toDateString() === today.toDateString();
                if (!isToday) return false;
            }
            if (timeFilter === 'future' && bookingDate <= today) return false;
        }

        // Room filter
        if (roomFilter && booking.room_id !== roomFilter) return false;

        // Department filter
        if (deptFilter && booking.department_id !== deptFilter) return false;

        return booking.status !== 'cancelled';
    });

    // Sort by date (newest first)
    filteredBookings.sort((a, b) => {
        return new Date(b.date_gregorian) - new Date(a.date_gregorian);
    });

    // Update count
    const countElement = document.getElementById('log-count');
    if (countElement) {
        countElement.innerHTML = `
            <i class="fas fa-list me-1"></i>
            إجمالي الحجوزات: <strong>${filteredBookings.length}</strong>
        `;
    }

    // Generate table rows
    if (filteredBookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <i class="fas fa-inbox fa-3x mb-3 d-block"></i>
                    <p class="mb-0">لا توجد حجوزات متطابقة مع البحث</p>
                </td>
            </tr>
        `;
        return;
    }

    // Paginate
    const startIndex = (this.currentLogPage - 1) * this.logPageSize;
    const endIndex = startIndex + this.logPageSize;
    const pageBookings = filteredBookings.slice(startIndex, endIndex);

    tbody.innerHTML = pageBookings.map(booking => this.createBookingLogRow(booking)).join('');

    // Generate pagination
    this.generateLogPagination(filteredBookings.length);
};

RoomBookingApp.prototype.createBookingLogRow = function(booking) {
    const room = this.rooms.find(r => r.id === booking.room_id);
    const dept = this.departments.find(d => d.id === booking.department_id);
    const roomIcon = room && room.type === 'discussion' ? '💬' : '👨‍🏫';
    const deptIcon = this.getDepartmentIcon(booking.department_id);
    
    const today = new Date();
    const bookingDate = new Date(booking.date_gregorian);
    let statusBadge = '';
    
    if (bookingDate.toDateString() === today.toDateString()) {
        statusBadge = '<span class="badge bg-success">اليوم</span>';
    } else if (bookingDate < today) {
        statusBadge = '<span class="badge bg-secondary">سابق</span>';
    } else {
        statusBadge = '<span class="badge bg-primary">قادم</span>';
    }

    const timeDisplay = booking.start_time && booking.end_time 
        ? `${booking.start_time} - ${booking.end_time}`
        : '<span class="text-muted">غير محدد</span>';

    return `
        <tr class="booking-log-row" data-booking-id="${booking.id}">
            <td class="text-center">${statusBadge}</td>
            <td>
                <div class="fw-bold">${booking.date_gregorian}</div>
                <small class="text-muted">${booking.date_hijri || ''}</small>
            </td>
            <td class="text-center">
                <div>${roomIcon}</div>
                <small>${room ? room.name.split(' ')[1] : ''}</small>
            </td>
            <td>
                <div>${deptIcon} ${dept ? dept.name : 'غير محدد'}</div>
            </td>
            <td>
                <strong>${booking.title || '<span class="text-muted">بدون عنوان</span>'}</strong>
            </td>
            <td>${timeDisplay}</td>
            <td>
                <div>${booking.contact_person || '<span class="text-muted">-</span>'}</div>
                <small class="text-muted">${booking.contact_phone || ''}</small>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-info" onclick="app.viewBookingFromLog('${booking.id}')" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${this.isAdminMode ? `
                    <button class="btn btn-outline-warning" onclick="app.editBookingFromLog('${booking.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="app.deleteBookingFromLog('${booking.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
};

RoomBookingApp.prototype.getDepartmentIcon = function(deptId) {
    const dept = this.departments.find(d => d.id === deptId);
    if (!dept) return '📋';
    
    const iconMap = {
        'قسم اللغويات': '🗣️',
        'قسم الأدب والبلاغة': '📖',
        'قسم الإعلام': '📡',
        'قسم التربية': '🎓',
        'قسم التاريخ': '📜',
        'قسم اللغات والترجمة': '🌍',
        'حجز من خارج الكلية': '🏢',
        'أخرى': '⋯'
    };
    
    return iconMap[dept.name] || '📋';
};

RoomBookingApp.prototype.generateLogPagination = function(totalItems) {
    const pagination = document.getElementById('log-pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(totalItems / this.logPageSize);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '<ul class="pagination pagination-sm mb-0 justify-content-end">';
    
    // Previous button
    html += `
        <li class="page-item ${this.currentLogPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="app.changeLogPage(${this.currentLogPage - 1}); return false;">السابق</a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `
            <li class="page-item ${i === this.currentLogPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="app.changeLogPage(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (totalPages > 5) {
        html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }

    // Next button
    html += `
        <li class="page-item ${this.currentLogPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="app.changeLogPage(${this.currentLogPage + 1}); return false;">التالي</a>
        </li>
    `;

    html += '</ul>';
    pagination.innerHTML = html;
};

RoomBookingApp.prototype.changeLogPage = function(page) {
    this.currentLogPage = page;
    this.loadBookingsLog();
    document.getElementById('bookings-log-section').scrollIntoView({ behavior: 'smooth' });
};

RoomBookingApp.prototype.refreshBookingsLog = async function() {
    this.showLoading(true);
    try {
        await this.loadBookings();
        this.loadBookingsLog();
        this.updateCalendar();
        this.updateRoomStatus();
        this.showAlert('تم تحديث السجل', 'success');
    } catch (error) {
        console.error('Error refreshing log:', error);
        this.showAlert('حدث خطأ في تحديث السجل', 'danger');
    } finally {
        this.showLoading(false);
    }
};

RoomBookingApp.prototype.viewBookingFromLog = function(bookingId) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (booking && this.calendar) {
        this.calendar.showBookingDetails(booking);
    }
};

RoomBookingApp.prototype.editBookingFromLog = function(bookingId) {
    if (this.editBooking) {
        this.editBooking(bookingId);
    }
};

RoomBookingApp.prototype.deleteBookingFromLog = async function(bookingId) {
    if (!this.isAdminMode) {
        this.showAlert('يجب تسجيل الدخول كمدير', 'warning');
        return;
    }
    
    if (this.cancelBooking) {
        await this.cancelBooking(bookingId);
        this.loadBookingsLog();
    }
};

RoomBookingApp.prototype.handleCalendarDayClick = function(dateStr) {
    // Set the date in booking form
    const bookingDateInput = document.getElementById('booking-date');
    if (bookingDateInput) {
        bookingDateInput.value = dateStr;
        bookingDateInput.dispatchEvent(new Event('change'));
        
        // Scroll to booking section
        document.getElementById('booking-section').scrollIntoView({
            behavior: 'smooth'
        });
    }
};