// Calendar functionality for Room Booking System
class Calendar {
    constructor(app) {
        this.app = app;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        this.dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        this.hijriMonthNames = [
            'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
            'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
            'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
        ];
    }

    initializeCalendar() {
        this.generateSingleMonthCalendar();
        this.setupCalendarEventListeners();
    }

    generateSingleMonthCalendar() {
        const container = document.getElementById('multi-calendar-container');
        if (!container) return;

        container.innerHTML = '';
        
        // Generate single month with navigation
        const monthCard = this.createMonthCalendar(this.currentDate);
        container.appendChild(monthCard);
    }

    createMonthCalendar(date) {
        const monthCard = document.createElement('div');
        monthCard.className = 'month-calendar-card mb-4';
        
        const monthName = this.monthNames[date.getMonth()];
        const year = date.getFullYear();
        const hijriMoment = moment(date);
        const hijriMonth = this.hijriMonthNames[hijriMoment.iMonth()];
        const hijriYear = hijriMoment.iYear();

        monthCard.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-gradient text-white" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <button class="btn btn-sm btn-light" onclick="app.navigateMonth(-1)" title="الشهر السابق">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <div class="col text-center">
                            <h5 class="mb-0">
                                <i class="fas fa-calendar me-2"></i>
                                ${monthName} ${year}م
                            </h5>
                            <small>${hijriMonth} ${hijriYear}هـ</small>
                        </div>
                        <div class="col-auto">
                            <button class="btn btn-sm btn-light" onclick="app.navigateMonth(1)" title="الشهر التالي">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body p-2">
                    <div class="table-responsive">
                        <table class="table table-bordered calendar-table mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="text-center">السبت</th>
                                    <th class="text-center">الأحد</th>
                                    <th class="text-center">الإثنين</th>
                                    <th class="text-center">الثلاثاء</th>
                                    <th class="text-center">الأربعاء</th>
                                    <th class="text-center">الخميس</th>
                                    <th class="text-center">الجمعة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateMonthDays(date)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        return monthCard;
    }

    generateMonthDays(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Start from Saturday
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - ((firstDay.getDay() + 1) % 7));
        
        let html = '';
        let currentDate = new Date(startDate);
        
        // Generate weeks
        while (currentDate <= lastDay || currentDate.getMonth() === month) {
            html += '<tr>';
            
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(currentDate);
                const isCurrentMonth = cellDate.getMonth() === month;
                const cell = this.createDayCell(cellDate, isCurrentMonth);
                html += cell;
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            html += '</tr>';
            
            if (currentDate.getMonth() !== month && currentDate > lastDay) {
                break;
            }
        }
        
        return html;
    }

    createDayCell(date, isCurrentMonth) {
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const dateStr = this.formatDate(date);
        const dayBookings = this.getBookingsForDate(dateStr);
        
        let cellClass = 'text-center p-2';
        if (!isCurrentMonth) cellClass += ' calendar-day-other-month';
        if (isToday) cellClass += ' bg-info bg-opacity-25';
        if (dayBookings.length > 0) cellClass += ' calendar-day-has-booking';
        
        const hijriDate = moment(date).iDate();
        
        let bookingsHtml = '';
        dayBookings.slice(0, 2).forEach(booking => {
            const room = this.app.rooms.find(r => r.id === booking.room_id);
            const icon = room && room.type === 'discussion' ? '💬' : '👨‍🏫';
            bookingsHtml += `<div class="booking-indicator" title="${booking.title}" onclick="app.viewBookingFromLog('${booking.id}')">
                ${icon} ${booking.start_time || ''}
            </div>`;
        });
        
        if (dayBookings.length > 2) {
            bookingsHtml += `<div class="booking-indicator more-bookings">+${dayBookings.length - 2}</div>`;
        }
        
        return `
            <td class="${cellClass}" style="min-height: 80px; cursor: pointer;" onclick="app.handleCalendarDayClick('${dateStr}')">
                <div class="day-number ${isToday ? 'fw-bold text-info' : ''}">${date.getDate()}</div>
                <div class="hijri-date text-muted" style="font-size: 0.7rem;">${hijriDate}</div>
                ${bookingsHtml}
            </td>
        `;
    }

    setupCalendarEventListeners() {
        // Calendar navigation
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        const todayBtn = document.getElementById('todayBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.navigateMonth(-1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.navigateMonth(1);
            });
        }
        
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.goToToday();
            });
        }

        // Room filter
        const roomFilter = document.getElementById('roomFilter');
        if (roomFilter) {
            roomFilter.addEventListener('change', () => {
                this.updateCalendar();
            });
        }
    }

    navigateMonth(direction) {
        const newDate = new Date(this.currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        this.currentDate = newDate;
        this.updateCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.updateCalendar();
    }

    updateCalendar() {
        this.generateSingleMonthCalendar();
    }

    updateCalendarHeader() {
        const monthYearElement = document.getElementById('calendar-month-year');
        const hijriDateElement = document.getElementById('calendar-hijri-date');
        
        if (monthYearElement) {
            const monthName = this.monthNames[this.currentDate.getMonth()];
            const year = this.currentDate.getFullYear();
            monthYearElement.textContent = `${monthName} ${year}م`;
        }

        if (hijriDateElement) {
            try {
                const hijriMoment = moment(this.currentDate);
                const hijriMonth = this.hijriMonthNames[hijriMoment.iMonth()];
                const hijriYear = hijriMoment.iYear();
                hijriDateElement.textContent = `${hijriMonth} ${hijriYear}هـ`;
            } catch (error) {
                console.error('Error converting to Hijri:', error);
                hijriDateElement.textContent = '';
            }
        }
    }

    generateCalendarDays() {
        const calendarBody = document.getElementById('calendar-body');
        if (!calendarBody) return;

        calendarBody.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);
        
        // Start from Saturday (6 = Saturday in JavaScript)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - ((firstDay.getDay() + 1) % 7));
        
        // Generate 6 weeks of days
        const weeksToShow = 6;
        const daysToShow = weeksToShow * 7;
        
        for (let week = 0; week < weeksToShow; week++) {
            const row = document.createElement('tr');
            
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const cell = this.createCalendarCell(cellDate, month);
                row.appendChild(cell);
            }
            
            calendarBody.appendChild(row);
        }
    }

    createCalendarCell(date, currentMonth) {
        const cell = document.createElement('td');
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isToday(date);
        const dateStr = this.formatDate(date);
        
        cell.classList.add('calendar-cell');
        if (!isCurrentMonth) {
            cell.classList.add('calendar-day-other-month');
        }

        // Create day number element
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        if (isToday) {
            dayElement.classList.add('calendar-day-today');
        }
        dayElement.textContent = date.getDate();

        // Create Hijri date element
        const hijriElement = document.createElement('div');
        hijriElement.classList.add('calendar-hijri');
        try {
            const hijriMoment = moment(date);
            hijriElement.textContent = `${hijriMoment.iDate()}`;
        } catch (error) {
            hijriElement.textContent = '';
        }

        cell.appendChild(dayElement);
        cell.appendChild(hijriElement);

        // Get bookings for this date
        const dayBookings = this.getBookingsForDate(dateStr);
        
        if (dayBookings.length > 0) {
            cell.classList.add('calendar-day-has-booking');
            
            // Add booking indicators
            dayBookings.forEach((booking, index) => {
                if (index < 3) { // Show max 3 bookings per day
                    const bookingElement = this.createBookingElement(booking);
                    cell.appendChild(bookingElement);
                }
            });

            // Show "more" indicator if there are more than 3 bookings
            if (dayBookings.length > 3) {
                const moreElement = document.createElement('div');
                moreElement.classList.add('calendar-booking');
                moreElement.textContent = `+${dayBookings.length - 3} أخرى`;
                moreElement.style.background = 'linear-gradient(45deg, #6c757d, #495057)';
                cell.appendChild(moreElement);
            }
        }

        // Add click event
        cell.addEventListener('click', () => {
            this.handleDateClick(date, dayBookings);
        });

        return cell;
    }

    createBookingElement(booking) {
        const bookingElement = document.createElement('div');
        bookingElement.classList.add('calendar-booking');
        
        const room = this.app.rooms.find(r => r.id === booking.room_id);
        const roomType = room ? (room.type === 'discussion' ? 'ن' : 'ت') : 'ق';
        
        bookingElement.textContent = `${roomType}: ${booking.start_time}`;
        bookingElement.title = `${booking.title} - ${this.app.getRoomName(booking.room_id)}`;
        
        // Color code by room type
        if (room && room.type === 'discussion') {
            bookingElement.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
        } else {
            bookingElement.style.background = 'linear-gradient(45deg, #fd7e14, #e55a00)';
        }

        bookingElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBookingDetails(booking);
        });

        return bookingElement;
    }

    getBookingsForDate(dateStr) {
        const selectedRoomFilter = document.querySelector('input[name="room-filter"]:checked');
        const filterType = selectedRoomFilter ? selectedRoomFilter.value : '';
        
        return this.app.bookings.filter(booking => {
            const matchesDate = booking.date_gregorian === dateStr;
            let matchesRoom = true;
            
            if (filterType) {
                const room = this.app.rooms.find(r => r.id === booking.room_id);
                matchesRoom = room && room.type === filterType;
            }
            
            const isActive = booking.status === 'confirmed';
            
            return matchesDate && matchesRoom && isActive;
        });
    }

    handleDateClick(date, bookings) {
        this.selectedDate = date;
        
        if (bookings.length === 0) {
            // No bookings on this date - could be used for quick booking
            const dateStr = this.formatDate(date);
            const bookingDateInput = document.getElementById('booking-date');
            if (bookingDateInput) {
                bookingDateInput.value = dateStr;
                // Trigger change event to update Hijri date
                bookingDateInput.dispatchEvent(new Event('change'));
                
                // Scroll to booking section
                document.getElementById('booking-section').scrollIntoView({
                    behavior: 'smooth'
                });
            }
        } else if (bookings.length === 1) {
            // Single booking - show details
            this.showBookingDetails(bookings[0]);
        } else {
            // Multiple bookings - show list
            this.showDayBookingsList(date, bookings);
        }
    }

    showBookingDetails(booking) {
        const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
        const content = document.getElementById('booking-details-content');
        const footer = document.getElementById('booking-details-footer');
        
        const room = this.app.rooms.find(r => r.id === booking.room_id);
        const department = this.app.departments.find(d => d.id === booking.department_id);
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="booking-info-item">
                        <div class="booking-info-label">عنوان الحجز</div>
                        <div class="booking-info-value">${booking.title}</div>
                    </div>
                    <div class="booking-info-item">
                        <div class="booking-info-label">القاعة</div>
                        <div class="booking-info-value">${room ? room.name : 'غير محدد'}</div>
                    </div>
                    <div class="booking-info-item">
                        <div class="booking-info-label">القسم</div>
                        <div class="booking-info-value">${department ? department.name : 'غير محدد'}</div>
                    </div>
                    <div class="booking-info-item">
                        <div class="booking-info-label">التاريخ الميلادي</div>
                        <div class="booking-info-value">${booking.date_gregorian}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="booking-info-item">
                        <div class="booking-info-label">التاريخ الهجري</div>
                        <div class="booking-info-value">${booking.date_hijri || 'غير محدد'}</div>
                    </div>
                    <div class="booking-info-item">
                        <div class="booking-info-label">الوقت</div>
                        <div class="booking-info-value">${booking.start_time} - ${booking.end_time}</div>
                    </div>
                    <div class="booking-info-item">
                        <div class="booking-info-label">المسؤول</div>
                        <div class="booking-info-value">${booking.contact_person}</div>
                    </div>
                    <div class="booking-info-item">
                        <div class="booking-info-label">رقم الهاتف</div>
                        <div class="booking-info-value">${booking.contact_phone || 'غير محدد'}</div>
                    </div>
                </div>
            </div>
            ${booking.notes ? `
                <div class="booking-info-item mt-3">
                    <div class="booking-info-label">ملاحظات</div>
                    <div class="booking-info-value">${booking.notes}</div>
                </div>
            ` : ''}
        `;

        // Setup footer buttons based on admin mode
        footer.innerHTML = '';
        
        if (this.app.isAdminMode) {
            footer.innerHTML = `
                <button type="button" class="btn btn-warning" onclick="app.editBooking('${booking.id}')">
                    <i class="fas fa-edit me-1"></i>
                    تعديل الحجز
                </button>
                <button type="button" class="btn btn-danger" onclick="app.cancelBooking('${booking.id}')">
                    <i class="fas fa-times me-1"></i>
                    إلغاء الحجز
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
            `;
        } else {
            footer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
            `;
        }
        
        modal.show();
    }

    showDayBookingsList(date, bookings) {
        const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
        const content = document.getElementById('booking-details-content');
        const footer = document.getElementById('booking-details-footer');
        
        const dateStr = this.formatDateArabic(date);
        
        content.innerHTML = `
            <h6 class="mb-3">حجوزات يوم ${dateStr}</h6>
            <div class="list-group">
                ${bookings.map(booking => {
                    const room = this.app.rooms.find(r => r.id === booking.room_id);
                    const department = this.app.departments.find(d => d.id === booking.department_id);
                    
                    return `
                        <div class="list-group-item list-group-item-action" onclick="app.calendar.showBookingDetails(${JSON.stringify(booking).replace(/"/g, '&quot;')})">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${booking.title}</h6>
                                <small class="text-muted">${booking.start_time} - ${booking.end_time}</small>
                            </div>
                            <p class="mb-1">${room ? room.name : 'قاعة غير محددة'}</p>
                            <small class="text-muted">${department ? department.name : 'قسم غير محدد'}</small>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
        `;
        
        modal.show();
    }

    // Utility methods
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    formatDate(date) {
        return moment(date).format('YYYY-MM-DD');
    }

    formatDateArabic(date) {
        const day = date.getDate();
        const month = this.monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    }
}

// Extend the main app to include calendar functionality
RoomBookingApp.prototype.initializeCalendar = function() {
    this.calendar = new Calendar(this);
    this.calendar.initializeCalendar();
};

RoomBookingApp.prototype.updateCalendar = function() {
    if (this.calendar) {
        this.calendar.updateCalendar();
    }
};

RoomBookingApp.prototype.navigateMonth = function(direction) {
    if (this.calendar) {
        this.calendar.navigateMonth(direction);
    }
};

RoomBookingApp.prototype.goToToday = function() {
    if (this.calendar) {
        this.calendar.goToToday();
    }
};

// Admin functions for booking management
RoomBookingApp.prototype.editBooking = function(bookingId) {
    // Find booking
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Populate form with booking data
    // Select room icon
    const roomInputs = document.querySelectorAll('input[name="room-select"]');
    roomInputs.forEach(input => {
        if (input.value === booking.room_id) {
            input.checked = true;
        } else {
            input.checked = false;
        }
    });
    
    // Select department icon
    const deptInputs = document.querySelectorAll('input[name="department-select"]');
    deptInputs.forEach(input => {
        if (input.value === booking.department_id) {
            input.checked = true;
        } else {
            input.checked = false;
        }
    });
    
    document.getElementById('booking-title').value = booking.title;
    document.getElementById('booking-date').value = booking.date_gregorian;
    document.getElementById('start-time').value = booking.start_time;
    document.getElementById('end-time').value = booking.end_time;
    document.getElementById('contact-person').value = booking.contact_person;
    document.getElementById('contact-phone').value = booking.contact_phone || '';
    document.getElementById('booking-notes').value = booking.notes || '';
    document.getElementById('hijri-date').value = booking.date_hijri || '';
    
    // Close modal and scroll to form
    const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
    modal.hide();
    
    document.getElementById('booking-section').scrollIntoView({
        behavior: 'smooth'
    });
    
    // Store the booking ID for updating
    document.getElementById('booking-form').dataset.editingId = bookingId;
    
    // Change form button text
    const submitBtn = document.querySelector('#booking-form button[type="submit"]');
    submitBtn.innerHTML = `
        <i class="fas fa-save me-2"></i>
        تحديث الحجز
    `;
};

RoomBookingApp.prototype.cancelBooking = async function(bookingId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
        return;
    }
    
    this.showLoading(true);
    
    try {
        const response = await fetch(`tables/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'cancelled'
            })
        });

        if (!response.ok) {
            throw new Error('فشل في إلغاء الحجز');
        }

        this.showAlert('تم إلغاء الحجز بنجاح', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
        modal.hide();
        
        // Reload data and update displays
        await this.loadBookings();
        this.updateCalendar();
        this.updateRoomStatus();
        this.loadBookingsLog();
        
    } catch (error) {
        console.error('Cancel booking error:', error);
        this.showAlert(error.message, 'danger');
    } finally {
        this.showLoading(false);
    }
};