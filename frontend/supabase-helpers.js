// supabase-helpers.js
// Reusable Supabase CRUD functions for SmartDormX
// Usage: import these functions in any page JS file

// ================================
// 🎯 DASHBOARD HELPERS
// ================================

/**
 * Get dashboard stats from Supabase
 * Returns: { hostels, students, rooms, alerts, requests, urgent }
 */
async function getDashboardStats() {
  try {
    const { data, error } = await window.supabaseClient
      .from('dashboard_stats')
      .select('stat_key, stat_value');
    
    if (error) throw error;
    
    // Transform array into object like localStorage format
    const stats = {};
    data.forEach(item => {
      // Merge stat_value JSON into main stats object
      Object.assign(stats, item.stat_value);
    });
    
    return stats;
  } catch (err) {
    console.error('❌ Error fetching dashboard stats:', err);
    // Fallback to localStorage if Supabase fails
    return getFromStorage('smartdormx_stats', DEFAULT_STATS);
  }
}

/**
 * Update dashboard stats in Supabase
 * @param {Object} updates - Key-value pairs to update
 */
async function updateDashboardStats(updates) {
  try {
    for (const [key, value] of Object.entries(updates)) {
      const { error } = await window.supabaseClient
        .from('dashboard_stats')
        .upsert(
          { stat_key: key, stat_value: { [key]: value } },
          { onConflict: 'stat_key' }
        );
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('❌ Error updating stats:', err);
    showToast('Failed to sync stats to cloud', 'warning');
    return false;
  }
}

/**
 * Get recent alerts from Supabase
 * @param {number} limit - Max alerts to return (default: 4)
 */
async function getRecentAlerts(limit = 4) {
  try {
    const { data, error } = await window.supabaseClient
      .from('dashboard_alerts')
      .select('*')
      .order('alert_time', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    // Transform to match localStorage alert format
    return data.map(alert => ({
      id: alert.id,
      type: alert.severity,
      icon: getAlertIcon(alert.alert_type),
      title: alert.title,
      message: alert.message,
      location: alert.location,
      time: formatDate(alert.alert_time),
      read: alert.is_read
    }));
  } catch (err) {
    console.error('❌ Error fetching alerts:', err);
    return getFromStorage('smartdormx_alerts', DEFAULT_ALERTS).slice(0, limit);
  }
}

/**
 * Helper: Map alert_type to Font Awesome icon
 */
function getAlertIcon(type) {
  const icons = {
    'security': 'fa-triangle-exclamation',
    'maintenance': 'fa-door-open',
    'registration': 'fa-user-plus',
    'inspection': 'fa-check-circle',
    'default': 'fa-bell'
  };
  return icons[type] || icons.default;
}

// ================================
// 👥 STUDENTS TABLE HELPERS
// ================================

/**
 * Get all students from Supabase
 * @param {Object} filters - Optional: { search, hostel, program }
 */
async function getStudents(filters = {}) {
  try {
    let query = window.supabaseClient.from('students').select('*');
    
    // Apply filters if provided
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,reg_no.ilike.%${filters.search}%`);
    }
    if (filters.hostel) {
      query = query.eq('hostel', filters.hostel);
    }
    if (filters.program) {
      query = query.eq('program', filters.program);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform Supabase format to match frontend expectations
    return data.map(student => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      regNo: student.reg_no,
      email: student.email,
      phone: student.phone,
      gender: student.gender,
      bloodGroup: student.blood_group,
      hostel: student.hostel,
      room: student.room,
      program: student.program,
      guardian: student.guardian_name,
      guardianPhone: student.guardian_phone,
      address: student.address,
      city: student.city,
      disability: student.disability,
      photo: student.photo_url,
      // Keep original for reference
      _supabase: student
    }));
  } catch (err) {
    console.error('❌ Error fetching students:', err);
    return getFromStorage('smartdormx_students', []);
  }
}

/**
 * Create new student in Supabase
 * @param {Object} studentData - Student object (frontend format)
 */
async function createStudent(studentData) {
  try {
    // Transform frontend format to database format
    const dbFormat = {
      reg_no: studentData.regNo,
      first_name: studentData.firstName,
      last_name: studentData.lastName,
      email: studentData.email,
      phone: studentData.phone,
      gender: studentData.gender,
      blood_group: studentData.bloodGroup,
      hostel: studentData.hostel,
      room: studentData.room,
      program: studentData.program,
      guardian_name: studentData.guardian,
      guardian_phone: studentData.guardianPhone,
      address: studentData.address,
      city: studentData.city,
      disability: studentData.disability,
      photo_url: studentData.photo
    };
    
    const { data, error } = await window.supabaseClient
      .from('students')
      .insert(dbFormat)
      .select()
      .single();
    
    if (error) throw error;
    
    // Return in frontend format
    return {
      id: data.id,
      ...studentData,
      _supabase: data
    };
  } catch (err) {
    console.error('❌ Error creating student:', err);
    // Show specific error if duplicate reg_no
    if (err.code === '23505') {
      showToast('Registration number already exists', 'error');
    }
    return null;
  }
}

/**
 * Update existing student in Supabase
 * @param {number} id - Student ID
 * @param {Object} updates - Fields to update
 */
async function updateStudent(id, updates) {
  try {
    const dbUpdates = {};
    // Map frontend field names to database column names
    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      regNo: 'reg_no',
      bloodGroup: 'blood_group',
      guardianPhone: 'guardian_phone',
      photo: 'photo_url'
      // Add more mappings as needed
    };
    
    for (const [key, value] of Object.entries(updates)) {
      dbUpdates[fieldMap[key] || key] = value;
    }
    
    const { data, error } = await window.supabaseClient
      .from('students')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { id, ...updates, _supabase: data };
  } catch (err) {
    console.error('❌ Error updating student:', err);
    return null;
  }
}

/**
 * Delete student from Supabase
 * @param {number} id - Student ID
 */
async function deleteStudent(id) {
  try {
    const { error } = await window.supabaseClient
      .from('students')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error deleting student:', err);
    return false;
  }
}

// ================================
// 🔄 SYNC HELPERS (Transition Phase)
// ================================

/**
 * Sync localStorage data to Supabase (one-time migration helper)
 * Call this once to move existing data to cloud
 */
async function syncLocalStorageToSupabase() {
  console.log('🔄 Starting localStorage → Supabase sync...');
  
  // Sync students
  const localStudents = getFromStorage('smartdormx_students', []);
  if (localStudents.length > 0) {
    console.log(`📦 Syncing ${localStudents.length} students...`);
    for (const student of localStudents) {
      // Check if already exists by reg_no
      const exists = await window.supabaseClient
        .from('students')
        .select('id')
        .eq('reg_no', student.regNo)
        .maybeSingle();
      
      if (!exists.data) {
        await createStudent(student);
      }
    }
  }
  
  // Sync alerts (similar pattern)
  // ... add more sync logic as needed
  
  console.log('✅ Sync complete!');
  showToast('Data synced to cloud', 'success');
}

// ================================
// 🛡️ FALLBACK: Keep localStorage helpers
// ================================
// These remain for transition period and offline fallback

function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`⚠️ Error reading ${key} from storage:`, error);
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${key} to storage:`, error);
    return false;
  }
}

// Export all helpers for use in other files
window.SupabaseHelpers = {
  // Dashboard
  getDashboardStats,
  updateDashboardStats,
  getRecentAlerts,
  
  // Students
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  
  // Migration
  syncLocalStorageToSupabase,
  
  // Fallback
  getFromStorage,
  saveToStorage
};

// ================================
// 💳 PAYMENTS HELPERS
// ================================

/**
 * Fetch payments from Supabase (hostel or mess)
 * @param {string} type - 'hostel' or 'mess'
 */
async function getPayments(type) {
  try {
    const tableName = type === 'hostel' ? 'payments_hostel' : 'payments_mess';
    const { data, error } = await window.supabaseClient
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Map Supabase snake_case to frontend expected format
    return (data || []).map(record => ({
      id: record.id,
      reg: record.student_reg_no || record.reg || '',
      name: record.student_name || record.name || 'Unknown',
      room: record.room_number || record.room || '',
      semester: record.semester || '',
      month: record.month || '',
      amount: parseFloat(record.amount) || 0,
      issue: record.issue_date || record.issue || '',
      due: record.due_date || record.due || '',
      status: record.status || 'Unpaid'
    }));
  } catch (err) {
    console.error(`❌ Error fetching ${type} payments:`, err);
    return getFromStorage(type === 'hostel' ? 'sd_hostel' : 'sd_mess', []);
  }
}

/**
 * Update payment status in Supabase
 * @param {string} type - 'hostel' or 'mess'
 * @param {number} id - Payment record ID
 * @param {string} newStatus - 'Paid', 'Unpaid', or 'Overdue'
 */
async function updatePaymentStatus(type, id, newStatus) {
  try {
    const tableName = type === 'hostel' ? 'payments_hostel' : 'payments_mess';
    const { error } = await window.supabaseClient
      .from(tableName)
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`❌ Error updating ${type} payment status:`, err);
    return false;
  }
}

// Export to window for use in payments.js
window.SupabasePayments = {
  getPayments,
  updatePaymentStatus
};

// ================================
// 🍽️ MESS & DINING HELPERS
// ================================

/**
 * Fetch meal attendance records
 */
/**
 * Fetch meal attendance records from Supabase
 * @param {Object} filters - Optional: { search, status, month }
 */
async function getMessAttendance(filters = {}) {
  try {
    let query = window.supabaseClient
      .from('mess_attendance')
      .select('*');
    
    // ✅ FIX: Search by BOTH student_reg_no AND student_name
    if (filters.search) {
      const searchVal = filters.search.toLowerCase().trim();
      
      query = query.or(
        `student_reg_no.ilike.%${searchVal}%,student_name.ilike.%${searchVal}%`
      );
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    // Month filter (unchanged)
    if (filters.month) {
      const [year, month] = filters.month.split('-').map(Number);
      const lastDay = new Date(year, month, 0)
        .toISOString()
        .split('T')[0];
      const firstDay = `${filters.month}-01`;
      
      query = query
        .gte('meal_date', firstDay)
        .lte('meal_date', lastDay);
    }
    
    const { data, error } = await query.order('meal_date', { ascending: false });
    
    if (error) throw error;
    
    // Transform result
    const transformed = (data || []).map(record => {
      return {
        id: record.id,
        name: record.student_name || record.student_reg_no || 'Unknown', // ✅ Prefer name
        initials: (record.student_name || record.student_reg_no || '?')
          .slice(0, 2)
          .toUpperCase(),
        reg: record.student_reg_no || '',
        hostel: '',
        color: '#6c5ce7',
        meal: record.meal_type,
        dateStr: record.meal_date,
        amount: parseFloat(record.amount) || 0,
        status: record.status || 'Unpaid'
      };
    });
    
    return transformed;
    
  } catch (err) {
    console.error('❌ Error fetching attendance:', err);
    return getFromStorage('smartdormx_attendance', []);
  }
}

/**
 * Update attendance status
 */
async function updateAttendanceStatus(id, newStatus) {
  try {
    const { error } = await window.supabaseClient
      .from('mess_attendance')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error updating status:', err);
    return false;
  }
}

/**
 * Fetch weekly menu
 */
async function getMessMenu() {
  try {
    const { data, error } = await window.supabaseClient
      .from('mess_menu')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    
    // Transform flat DB records into nested day/meal structure
    const menu = {};
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    days.forEach(day => {
      menu[day] = { breakfast: [], lunch: [], dinner: [] };
    });
    
    data.forEach(item => {
      if (menu[item.day_of_week] && menu[item.day_of_week][item.meal_type]) {
        menu[item.day_of_week][item.meal_type].push({
          name: item.dish_name,
          price: parseFloat(item.price) || 0,
          id: item.id
        });
      }
    });
    return menu;
  } catch (err) {
    console.error('❌ Error fetching menu:', err);
    return getFromStorage('smartdormx_menu', getDefaultMenuData());
  }
}

/**
 * Add menu item
 */
async function addMenuItem(day, mealType, name, price) {
  try {
    const { error } = await window.supabaseClient
      .from('mess_menu')
      .insert({ day_of_week: day, meal_type: mealType, dish_name: name, price: parseFloat(price) });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error adding menu item:', err);
    return false;
  }
}

/**
 * Delete menu item
 */
async function deleteMenuItem(id) {
  try {
    const { error } = await window.supabaseClient.from('mess_menu').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error deleting menu item:', err);
    return false;
  }
}

/**
 * Fetch feedback
 */
async function getMessFeedback() {
  try {
    const { data, error } = await window.supabaseClient
      .from('mess_feedback')
      .select('*')
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(f => ({
      id: f.id,
      name: f.student_name || 'Anonymous',
      reg: f.student_reg_no || '',
      hostel: f.hostel || '',
      rating: parseInt(f.rating) || 0,
      text: f.feedback_text || '',
      date: f.submitted_at?.split('T')[0] || ''
    }));
  } catch (err) {
    console.error('❌ Error fetching feedback:', err);
    return getFromStorage('smartdormx_feedback', []);
  }
}

/**
 * Clear all feedback
 */
async function clearAllFeedback() {
  try {
    const { error } = await window.supabaseClient.from('mess_feedback').delete();
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error clearing feedback:', err);
    return false;
  }
}

// Export to window for use in mess.js
window.SupabaseMess = {
  getMessAttendance,
  updateAttendanceStatus,
  getMessMenu,
  addMenuItem,
  deleteMenuItem,
  getMessFeedback,
  clearAllFeedback
};

// ================================
// 📢 ANNOUNCEMENTS HELPERS
// ================================

/**
 * Fetch announcements from Supabase
 * @param {Object} filters - Optional: { target, priority, search }
 */
async function getAnnouncements(filters = {}) {
  try {
    let query = window.supabaseClient
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });
    
    if (filters.target) {
      query = query.eq('target_audience', filters.target);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.search) {
      query = query.or(`subject.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Transform to match frontend format
    return (data || []).map(ann => ({
      id: ann.id,
      subject: ann.subject,
      message: ann.message,
      target: ann.target_audience,
      targetLabel: ann.target_audience === 'all' ? 'All Residents' : 
                   ann.target_audience === 'girls' ? 'Girls Hostel Only' : 'Boys Hostel Only',
      priority: ann.priority,
      timestamp: ann.published_at || ann.created_at,
      sender: ann.sender_name || 'Admin',
      expiresAt: ann.expires_at
    }));
  } catch (err) {
    console.error('❌ Error fetching announcements:', err);
    return getFromStorage('smartdormx_announcements', []);
  }
}

/**
 * Create new announcement in Supabase
 */
async function createAnnouncement(announcementData) {
  try {
    const { data, error } = await window.supabaseClient
      .from('announcements')
      .insert({
        subject: announcementData.subject,
        message: announcementData.message,
        target_audience: announcementData.target,
        priority: announcementData.priority,
        sender_name: announcementData.sender || 'Admin',
        published_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      ...announcementData,
      timestamp: data.published_at
    };
  } catch (err) {
    console.error('❌ Error creating announcement:', err);
    return null;
  }
}

/**
 * Delete announcement from Supabase
 */
async function deleteAnnouncement(id) {
  try {
    const { error } = await window.supabaseClient
      .from('announcements')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error deleting announcement:', err);
    return false;
  }
}

// ================================
// 📋 REQUESTS HELPERS
// ================================

/**
 * Fetch requests from Supabase
 * @param {Object} filters - Optional: { type, priority, status, search }
 */
async function getRequests(filters = {}) {
  try {
    let query = window.supabaseClient
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Transform to match frontend format
    return (data || []).map(req => ({
      id: req.id,
      studentReg: req.student_reg_no,
      type: req.type,
      subject: req.subject,
      description: req.description,
      priority: req.priority,
      status: req.status,
      createdAt: req.created_at,
      resolvedAt: req.resolved_at,
      resolvedBy: req.resolved_by,
      resolutionNotes: req.resolution_notes
    }));
  } catch (err) {
    console.error('❌ Error fetching requests:', err);
    return getFromStorage('smartdormx_requests', []);
  }
}

/**
 * Update request status in Supabase
 */
async function updateRequestStatus(id, newStatus, resolutionNotes = '') {
  try {
    const updates = {
      status: newStatus,
      resolved_at: newStatus !== 'pending' ? new Date().toISOString() : null,
      resolution_notes: resolutionNotes
    };
    
    const { error } = await window.supabaseClient
      .from('requests')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error updating request:', err);
    return false;
  }
}

/**
 * Create new request (for student-side forms)
 */
async function createRequest(requestData) {
  try {
    const { data, error } = await window.supabaseClient
      .from('requests')
      .insert({
        student_reg_no: requestData.studentReg,
        type: requestData.type,
        subject: requestData.subject,
        description: requestData.description,
        priority: requestData.priority || 'medium'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { id: data.id, ...requestData };
  } catch (err) {
    console.error('❌ Error creating request:', err);
    return null;
  }
}

// Export to window for use in page JS files
window.SupabaseComms = {
  // Announcements
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  
  // Requests
  getRequests,
  updateRequestStatus,
  createRequest
};

console.log('✅ SupabaseComms loaded');

console.log('✅ SupabaseHelpers loaded');