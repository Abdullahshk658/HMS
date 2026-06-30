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

console.log('✅ SupabaseHelpers loaded');