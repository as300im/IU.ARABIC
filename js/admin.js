// Admin functionality for Room Booking System
class Admin {
    constructor(app) {
        this.app = app;
        this.adminPassword = "091986"; // كلمة مرور المدير
    }

    async authenticateAdmin(password) {
        // In production, this should be verified server-side
        return password === this.adminPassword;
    }

    setupAdminUI() {
        if (!this.app.isAdminMode) return;

        // Add admin-specific styling and functionality
        this.addAdminIndicators();
        this.setupAdminEventListeners();
    }

    addAdminIndicators() {
        // Add admin mode indicator to navbar
        const navbar = document.querySelector('.navbar');
        if (navbar && !document.getElementById('admin-indicator')) {
            const adminIndicator = document.createElement('div');
            adminIndicator.id = 'admin-indicator';
            adminIndicator.className = 'position-fixed top-0 end-0 bg-warning text-dark px-3 py-1';
            adminIndicator.style.cssText = 'z-index: 9999; border-radius: 0 0 0 10px; font-size: 0.8rem; font-weight: bold;';
            adminIndicator.innerHTML = '<i class="fas fa-shield-alt me-1"></i>وضع المدير';
            document.body.appendChild(adminIndicator);
        }

        // Add logout button
        const navbarNav = document.querySelector('.navbar-nav');
        if (navbarNav && !document.getElementById('admin-logout')) {
            const logoutItem = document.createElement('li');
            logoutItem.className = 'nav-item';
            logoutItem.id = 'admin-logout';
            logoutItem.innerHTML = `
                <button class="btn btn-outline-danger btn-sm ms-2" onclick="app.admin.logoutAdmin()">
                    <i class="fas fa-sign-out-alt me-1"></i> خروج المدير
                </button>
            `;
            navbarNav.appendChild(logoutItem);
        }
    }

    setupAdminEventListeners() {
        // Override booking form to handle updates
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            bookingForm.removeEventListener('submit', this.app.handleBookingSubmit);
            bookingForm.addEventListener('submit', this.handleAdminBookingSubmit.bind(this));
        }
    }

    async handleAdminBookingSubmit(e) {
        e.preventDefault();
        
        const editingId = e.target.dataset.editingId;
        
        if (editingId) {
            // Update existing booking
            await this.updateBooking(editingId, e.target);
        } else {
            // Create new booking (use original method)
            await this.app.handleBookingSubmit(e);
        }
    }

    async updateBooking(bookingId, form) {
        this.app.showLoading(true);
        
        try {
            // Get selected room and department from radio buttons
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
                status: 'confirmed'
            };

            // No validation required - all fields are optional

            // Check for conflicts only if necessary fields are provided
            if (bookingData.date_gregorian && bookingData.room_id && 
                bookingData.start_time && bookingData.end_time) {
                
                await this.app.loadBookings();
                const conflicts = this.app.bookings.filter(booking => {
                    if (booking.id === bookingId) return false; // Exclude current booking
                    
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

            const response = await fetch(`tables/bookings/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) {
                throw new Error('فشل في تحديث الحجز');
            }

            this.app.showAlert('تم تحديث الحجز بنجاح', 'success');
            
            // Reset form and remove editing mode
            form.reset();
            document.getElementById('hijri-date').value = '';
            delete form.dataset.editingId;
            
            // Reset button text
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = `
                <i class="fas fa-save me-2"></i>
                تأكيد الحجز
            `;
            
            // Reload data and update displays
            await this.app.loadBookings();
            this.app.updateCalendar();
            this.app.updateRoomStatus();
            
        } catch (error) {
            console.error('Update booking error:', error);
            this.app.showAlert(error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async cancelBooking(bookingId) {
        if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
            return;
        }
        
        this.app.showLoading(true);
        
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

            this.app.showAlert('تم إلغاء الحجز بنجاح', 'success');
            
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload data and update displays
            await this.app.loadBookings();
            this.app.updateCalendar();
            this.app.updateRoomStatus();
            
        } catch (error) {
            console.error('Cancel booking error:', error);
            this.app.showAlert(error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async deleteBooking(bookingId) {
        if (!confirm('هل أنت متأكد من حذف هذا الحجز نهائياً؟\nهذا الإجراء لا يمكن التراجع عنه.')) {
            return;
        }
        
        this.app.showLoading(true);
        
        try {
            const response = await fetch(`tables/bookings/${bookingId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('فشل في حذف الحجز');
            }

            this.app.showAlert('تم حذف الحجز نهائياً', 'success');
            
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload data and update displays
            await this.app.loadBookings();
            this.app.updateCalendar();
            this.app.updateRoomStatus();
            
        } catch (error) {
            console.error('Delete booking error:', error);
            this.app.showAlert(error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    logoutAdmin() {
        if (confirm('هل تريد الخروج من وضع المدير؟')) {
            this.app.isAdminMode = false;
            
            // Remove admin indicators
            const adminIndicator = document.getElementById('admin-indicator');
            if (adminIndicator) {
                adminIndicator.remove();
            }
            
            const logoutBtn = document.getElementById('admin-logout');
            if (logoutBtn) {
                logoutBtn.remove();
            }
            
            // Reset form event listeners
            this.resetEventListeners();
            
            // Update calendar and UI
            this.app.updateCalendar();
            
            this.app.showAlert('تم الخروج من وضع المدير', 'info');
        }
    }

    resetEventListeners() {
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            // Remove admin event listener
            bookingForm.removeEventListener('submit', this.handleAdminBookingSubmit);
            
            // Reset to original form state
            delete bookingForm.dataset.editingId;
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = `
                    <i class="fas fa-save me-2"></i>
                    تأكيد الحجز
                `;
            }
            
            // Re-add original event listener
            bookingForm.addEventListener('submit', this.app.handleBookingSubmit.bind(this.app));
        }
    }

    // Enhanced booking management methods
    async getBookingStatistics() {
        const stats = {
            total: 0,
            confirmed: 0,
            cancelled: 0,
            byDepartment: {},
            byRoom: {},
            byMonth: {}
        };

        this.app.bookings.forEach(booking => {
            stats.total++;
            
            if (booking.status === 'confirmed') {
                stats.confirmed++;
            } else if (booking.status === 'cancelled') {
                stats.cancelled++;
            }

            // By department
            if (!stats.byDepartment[booking.department_id]) {
                stats.byDepartment[booking.department_id] = 0;
            }
            stats.byDepartment[booking.department_id]++;

            // By room
            if (!stats.byRoom[booking.room_id]) {
                stats.byRoom[booking.room_id] = 0;
            }
            stats.byRoom[booking.room_id]++;

            // By month
            if (booking.date_gregorian) {
                const month = booking.date_gregorian.substring(0, 7); // YYYY-MM
                if (!stats.byMonth[month]) {
                    stats.byMonth[month] = 0;
                }
                stats.byMonth[month]++;
            }
        });

        return stats;
    }

    async exportBookingsToCSV(startDate, endDate) {
        const bookings = this.app.bookings.filter(booking => {
            if (startDate && booking.date_gregorian < startDate) return false;
            if (endDate && booking.date_gregorian > endDate) return false;
            return true;
        });

        const headers = [
            'رقم الحجز',
            'عنوان الحجز', 
            'القاعة',
            'القسم',
            'التاريخ الميلادي',
            'التاريخ الهجري',
            'وقت البداية',
            'وقت النهاية',
            'المسؤول',
            'رقم الهاتف',
            'الحالة',
            'ملاحظات'
        ];

        const csvContent = [headers.join(',')];
        
        bookings.forEach(booking => {
            const row = [
                booking.id,
                `"${booking.title}"`,
                `"${this.app.getRoomName(booking.room_id)}"`,
                `"${this.app.getDepartmentName(booking.department_id)}"`,
                booking.date_gregorian,
                `"${booking.date_hijri || ''}"`,
                booking.start_time,
                booking.end_time,
                `"${booking.contact_person}"`,
                booking.contact_phone || '',
                booking.status,
                `"${booking.notes || ''}"`
            ];
            csvContent.push(row.join(','));
        });

        const csvString = csvContent.join('\n');
        const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bookings_${startDate || 'all'}_${endDate || 'all'}.csv`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    // Bulk operations
    async bulkCancelBookings(bookingIds) {
        if (!confirm(`هل أنت متأكد من إلغاء ${bookingIds.length} حجز؟`)) {
            return;
        }

        this.app.showLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const bookingId of bookingIds) {
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

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error('Error cancelling booking:', bookingId, error);
                errorCount++;
            }
        }

        this.app.showLoading(false);
        
        let message = '';
        if (successCount > 0) {
            message += `تم إلغاء ${successCount} حجز بنجاح. `;
        }
        if (errorCount > 0) {
            message += `فشل في إلغاء ${errorCount} حجز.`;
        }

        this.app.showAlert(message, errorCount > 0 ? 'warning' : 'success');
        
        // Refresh data
        await this.app.loadBookings();
        this.app.updateCalendar();
        this.app.updateRoomStatus();
    }

    // Room and department management
    async addRoom(roomData) {
        try {
            const response = await fetch('tables/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: roomData.name,
                    type: roomData.type,
                    capacity: roomData.capacity,
                    active: true
                })
            });

            if (!response.ok) {
                throw new Error('فشل في إضافة القاعة');
            }

            this.app.showAlert('تم إضافة القاعة بنجاح', 'success');
            await this.app.loadRooms();
            this.app.populateSelects();
            
        } catch (error) {
            console.error('Error adding room:', error);
            this.app.showAlert(error.message, 'danger');
        }
    }

    async addDepartment(departmentData) {
        try {
            const response = await fetch('tables/departments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: departmentData.name,
                    type: departmentData.type,
                    active: true
                })
            });

            if (!response.ok) {
                throw new Error('فشل في إضافة القسم');
            }

            this.app.showAlert('تم إضافة القسم بنجاح', 'success');
            await this.app.loadDepartments();
            this.app.populateSelects();
            
        } catch (error) {
            console.error('Error adding department:', error);
            this.app.showAlert(error.message, 'danger');
        }
    }
}

// Extend the main app to include admin functionality
RoomBookingApp.prototype.initializeAdmin = function() {
    this.admin = new Admin(this);
};

RoomBookingApp.prototype.handleAdminLogin = function(e) {
    e.preventDefault();
    
    const password = document.getElementById('admin-password').value;
    
    if (this.admin && this.admin.authenticateAdmin(password)) {
        this.isAdminMode = true;
        this.showAlert('تم دخول وضع المدير بنجاح', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
        modal.hide();
        
        // Setup admin UI
        this.admin.setupAdminUI();
        this.updateCalendar();
    } else {
        this.showAlert('الرقم السري غير صحيح', 'danger');
    }
    
    // Clear password field
    document.getElementById('admin-password').value = '';
};

// Update the main app initialization
const originalInit = RoomBookingApp.prototype.init;
RoomBookingApp.prototype.init = async function() {
    this.initializeAdmin();
    await originalInit.call(this);
};