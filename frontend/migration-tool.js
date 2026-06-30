// migration-tool.js - FIXED VERSION
// One-click localStorage → Supabase migration tool

const MigrationTool = {
  config: {
    dryRun: false,
    skipExisting: true,
    verbose: true,
    batchSize: 10
  },
  
  progress: {
    total: 0,
    completed: 0,
    skipped: 0,
    errors: []
  },

  // 🎯 MAIN ENTRY POINT
  async migrateAll(options = {}) {
    this.config = { ...this.config, ...options };
    console.log('🚀 SmartDormX Migration Started');
    console.log(`Config: dryRun=${this.config.dryRun}, batchSize=${this.config.batchSize}`);
    
    const startTime = Date.now();
    
    try {
      // 🔑 CRITICAL ORDER: Parents before children!
      
      // 1️⃣ Students FIRST (parent table)
      await this.migrateStudents();
      
      // ⚠️ Wait briefly to ensure students are committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 2️⃣ Payments (depend on students)
      await this.migratePayments('hostel');
      await this.migratePayments('mess');
      
      // 3️⃣ Announcements (independent)
      await this.migrateAnnouncements();
      
      // 4️⃣ Requests (may reference students)
      await this.migrateRequests();
      
      // 5️⃣ Mess data (attendance/feedback depend on students)
      await this.migrateMessData();
      
      // 6️⃣ Dashboard data (independent)
      await this.migrateDashboardData();
      
      // 7️⃣ Profile (independent)
      await this.migrateProfile();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.showSummary(duration);
      
      return {
        success: true,
        duration,
        ...this.progress
      };
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.progress.errors.push(`Fatal: ${error.message}`);
      this.showSummary(((Date.now() - startTime) / 1000).toFixed(1));
      throw error;
    }
  },

  // 📚 MIGRATE STUDENTS (MUST RUN FIRST)
async migrateStudents() {
  // Try multiple possible keys with better logging
  const possibleKeys = ['smartdormx_students', 'students', 'sd_students', 'smartdormx_student_data'];
  let localData = null;
  let foundKey = null;
  
  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);
    if (raw && raw !== '[]' && raw !== '{}') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localData = parsed;
          foundKey = key;
          console.log(`📦 Found ${parsed.length} students in localStorage key: "${key}"`);
          break;
        }
      } catch(e) {
        console.warn(`⚠️ Could not parse ${key}:`, e.message);
      }
    }
  }

  if (!localData || !localData.length) {
    console.log('📭 No local students found in localStorage to migrate');
    console.log('🔍 Checked keys:', possibleKeys);
    // List what IS in localStorage for debugging
    const allKeys = Object.keys(localStorage).filter(k => k.includes('smartdorm') || k.includes('student'));
    if (allKeys.length) console.log('📋 Found related localStorage keys:', allKeys);
    return;
  }

  console.log(`📚 Starting migration of ${localData.length} students from "${foundKey}"...`);

  for (const student of localData) {
    try {
      // Transform frontend camelCase → Supabase snake_case with null handling
      const supabaseData = {
        reg_no: student.regNo || student.reg_no || null,
        first_name: student.firstName || student.first_name || null,
        last_name: student.lastName || student.last_name || null,
        email: student.email || null,
        phone: student.phone || null,
        gender: student.gender || null,
        blood_group: student.bloodGroup || student.blood_group || null,
        hostel: student.hostel || null,
        room: student.room || null,
        program: student.program || null,
        guardian_name: student.guardian || student.guardian_name || null,
        guardian_phone: student.guardianPhone || student.guardian_phone || null,
        address: student.address || null,
        city: student.city || null,
        postal_code: student.postalCode || student.postal_code || null,
        country: student.country || 'Pakistan',
        disability: student.disability || 'None',
        disability_details: student.disabilityDetails || student.disability_details || null,
        date_of_birth: student.dob || student.date_of_birth || null,
        cnic: student.cnic || null,
        photo_url: student.photo || student.photo_url || null,
        joining_date: student.joiningDate || student.joining_date || null
      };
      
      // Skip required fields that are null/empty
      if (!supabaseData.reg_no || !supabaseData.first_name || !supabaseData.email) {
        console.warn(`⚠️ Skipping student with missing required fields:`, {
          reg_no: supabaseData.reg_no,
          first_name: supabaseData.first_name,
          email: supabaseData.email
        });
        this.progress.skipped = (this.progress.skipped || 0) + 1;
        continue;
      }
      
      // Skip if dry run
      if (this.config?.dryRun) {
        this.progress.completed = (this.progress.completed || 0) + 1;
        continue;
      }
      
      // Check if exists (by reg_no - the unique field)
      if (this.config?.skipExisting !== false) {
        const { data: existing, error: checkError } = await window.supabaseClient
          .from('students')
          .select('id')
          .eq('reg_no', supabaseData.reg_no)
          .maybeSingle();
        
        if (checkError) {
          console.warn(`⚠️ Error checking existing student ${supabaseData.reg_no}:`, checkError.message);
        }
        
        if (existing) {
          this.progress.skipped = (this.progress.skipped || 0) + 1;
          if (this.config?.verbose) {
            console.log(`[students] ⏭️ Skipping existing: reg_no=${supabaseData.reg_no}`);
          }
          continue;
        }
      }
      
      // Insert new student
      const { data: inserted, error: insertError } = await window.supabaseClient
        .from('students')
        .insert(supabaseData)
        .select('id, reg_no')
        .single();
      
      if (insertError) {
        // Handle unique violation gracefully
        if (insertError.code === '23505') {
          this.progress.skipped = (this.progress.skipped || 0) + 1;
          if (this.config?.verbose) {
            console.log(`[students] ⏭️ Duplicate reg_no (race condition): ${supabaseData.reg_no}`);
          }
          continue;
        }
        throw insertError;
      }
      
      this.progress.completed = (this.progress.completed || 0) + 1;
      if (this.config?.verbose) {
        console.log(`[students] ✅ Inserted: reg_no=${supabaseData.reg_no}, id=${inserted?.id}`);
      }
      
    } catch (err) {
      const msg = `Student ${student.regNo || student.reg_no || 'unknown'}: ${err.message}`;
      this.progress.errors = this.progress.errors || [];
      this.progress.errors.push(msg);
      console.warn(`⚠️ ${msg}`, err);
    }
  }
  this.progress.total = (this.progress.total || 0) + localData.length;
  console.log(`📚 Student migration complete: ${this.progress.completed} inserted, ${this.progress.skipped || 0} skipped`);
},

  // 💰 MIGRATE PAYMENTS (hostel or mess) - FIXED VERSION
async migratePayments(type) {
  const keyMap = { hostel: 'sd_hostel', mess: 'sd_mess' };
  const tableMap = { hostel: 'payments_hostel', mess: 'payments_mess' };
  const fieldMap = {
    hostel: { period: 'semester', periodField: 'semester' },
    mess: { period: 'month', periodField: 'month' }
  };
  
  const localKey = keyMap[type];
  const tableName = tableMap[type];
  const { period, periodField } = fieldMap[type];

  const raw = localStorage.getItem(localKey);
  const localData = raw ? JSON.parse(raw) : [];
  
  if (!localData || !localData.length) {
    console.log(`📭 No local ${type} payments to migrate`);
    return;
  }

  console.log(`[${new Date().toLocaleTimeString()}] Migrating ${localData.length} ${type} payments...`);

  for (const payment of localData) {
    try {
      const studentRegNo = payment.reg || payment.student_reg_no;
      const periodValue = payment[period] || payment.semester || payment.month;
      
      if (!studentRegNo || !periodValue) {
        console.warn(`⚠️ Skipping ${type} payment with missing reg/period`);
        this.progress.skipped = (this.progress.skipped || 0) + 1;
        continue;
      }
      
      const supabaseData = {
        student_reg_no: studentRegNo,
        [periodField]: periodValue,
        amount: payment.amount,
        issue_date: payment.issue || payment.issue_date,
        due_date: payment.due || payment.due_date,
        status: payment.status,
        receipt_url: payment.receipt_url || null
      };
      
      if (this.config?.dryRun) {
        this.progress.completed = (this.progress.completed || 0) + 1;
        continue;
      }
       
      // 🔑 CRITICAL: Verify student exists BEFORE inserting payment
      const { data: student, error: studentError } = await window.supabaseClient
        .from('students')
        .select('reg_no')
        .eq('reg_no', studentRegNo)
        .maybeSingle();
      
      if (studentError) {
        console.warn(`⚠️ Error checking student ${studentRegNo}:`, studentError.message);
      }
      
      if (!student) {
        if (this.config?.verbose) {
          console.log(`[${tableName}] ⚠️ Skipping: student ${studentRegNo} not found in Supabase`);
        }
        this.progress.skipped = (this.progress.skipped || 0) + 1;
        continue;
      }
      
      // Check for duplicates
      if (this.config?.skipExisting !== false) {
        const { data: existing } = await window.supabaseClient
          .from(tableName)
          .select('id')
          .eq('student_reg_no', studentRegNo)
          .eq(periodField, periodValue)
          .maybeSingle();
        
        if (existing) {
          this.progress.skipped = (this.progress.skipped || 0) + 1;
          if (this.config?.verbose) {
            console.log(`[${tableName}] ⏭️ Skipping existing: ${studentRegNo}_${periodValue}`);
          }
          continue;
        }
      }
      
      const { error } = await window.supabaseClient
        .from(tableName)
        .insert(supabaseData)
        .select();
      
      if (error) {
        // Handle foreign key violation gracefully
        if (error.code === '23503') {
          if (this.config?.verbose) {
            console.log(`[${tableName}] ⚠️ FK violation for ${studentRegNo} (student may have been deleted), skipping...`);
          }
          this.progress.skipped = (this.progress.skipped || 0) + 1;
          continue;
        }
        // Handle unique violation
        if (error.code === '23505') {
          this.progress.skipped = (this.progress.skipped || 0) + 1;
          if (this.config?.verbose) {
            console.log(`[${tableName}] ⏭️ Duplicate entry for ${studentRegNo}_${periodValue}`);
          }
          continue;
        }
        throw error;
      }
      
      this.progress.completed = (this.progress.completed || 0) + 1;
      if (this.config?.verbose && this.progress.completed % 10 === 0) {
        console.log(`[${tableName}] ✅ Inserted: ${studentRegNo}_${periodValue}`);
      }
      
    } catch (err) {
      const msg = `[${tableName}] ❌ Insert failed for ${payment.reg || payment.student_reg_no}: ${err.message}`;
      this.progress.errors = this.progress.errors || [];
      this.progress.errors.push(msg);
      console.log(msg);
    }
  }
  this.progress.total = (this.progress.total || 0) + localData.length;
},

 // 📢 MIGRATE ANNOUNCEMENTS - FIXED VERSION
async migrateAnnouncements() {
  const raw = localStorage.getItem('smartdormx_announcements');
  const localData = raw ? JSON.parse(raw) : [];
  
  if (!localData || !localData.length) {
    console.log('📭 No local announcements to migrate');
    return;
  }
  
  console.log(`[${new Date().toLocaleTimeString()}] Migrating ${localData.length} announcements...`);

  for (const ann of localData) {
    try {
      // 🔥 CRITICAL: Ensure subject is never null/undefined/empty (NOT NULL constraint)
      const subject = ann.subject?.toString()?.trim();
      if (!subject) {
        if (this.config?.verbose) {
          console.log(`[announcements] ⚠️ Skipping announcement with empty/invalid subject:`, ann);
        }
        this.progress.skipped = (this.progress.skipped || 0) + 1;
        continue;
      }
      
      const supabaseData = {
        id: ann.id || null,
        subject: subject, // Now guaranteed to be non-empty string
        message: ann.message?.toString() || '',
        target_audience: ann.target || ann.target_audience || 'all',
        priority: ann.priority || 'normal',
        sender_name: ann.sender || 'Admin',
        published_at: ann.timestamp || ann.published_at || new Date().toISOString()
      };
      
      if (this.config?.dryRun) {
        this.progress.completed = (this.progress.completed || 0) + 1;
        continue;
      }
      
      // Use upsert with conflict on subject+published_at if id is not reliable
      const { data, error } = await window.supabaseClient
        .from('announcements')
        .insert(supabaseData)
        .select();
      
      if (error) {
        // Handle unique violation (duplicate subject+timestamp)
        if (error.code === '23505') {
          this.progress.skipped = (this.progress.skipped || 0) + 1;
          if (this.config?.verbose) {
            console.log(`[announcements] ⏭️ Skipping duplicate: "${subject}"`);
          }
          continue;
        }
        throw error;
      }
      
      this.progress.completed = (this.progress.completed || 0) + 1;
      if (this.config?.verbose) {
        console.log(`[announcements] ✅ Inserted: subject="${subject}"`);
      }
      
    } catch (err) {
      const msg = `[announcements] ❌ Insert failed for subject=${ann?.subject}: ${err.message}`;
      this.progress.errors = this.progress.errors || [];
      this.progress.errors.push(msg);
      console.log(msg);
    }
  }
  this.progress.total = (this.progress.total || 0) + localData.length;
},

  // 📋 MIGRATE REQUESTS
  async migrateRequests() {
    const localData = JSON.parse(localStorage.getItem('smartdormx_requests') || '[]');
    if (!localData.length) {
      console.log('📭 No local requests to migrate');
      return;
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] Migrating ${localData.length} requests...`);
    
    for (const req of localData) {
      try {
        const supabaseData = {
          id: req.id,
          student_reg_no: req.studentReg || req.student_reg_no || null,
          type: req.type,
          subject: req.subject,
          description: req.description,
          priority: req.priority || 'medium',
          status: req.status || 'pending',
          created_at: req.createdAt || req.created_at || new Date().toISOString(),
          resolved_at: req.resolvedAt || req.resolved_at || null,
          resolution_notes: req.resolutionNotes || req.resolution_notes || null
        };
        
        if (this.config.dryRun) {
          this.progress.completed++;
          continue;
        }
        
        const { error } = await window.supabaseClient
          .from('requests')
          .upsert(supabaseData, { onConflict: 'id' })
          .select();
        
        if (error) throw error;
        this.progress.completed++;
        
      } catch (err) {
        this.progress.errors.push(`Request: ${err.message}`);
      }
    }
    this.progress.total += localData.length;
  },

  // 🍽️ MIGRATE MESS DATA
  async migrateMessData() {
    // Attendance
    const attendance = JSON.parse(localStorage.getItem('smartdormx_attendance') || '[]');
    if (attendance.length) {
      console.log(`[${new Date().toLocaleTimeString()}] Migrating ${attendance.length} attendance records...`);
      
      for (const record of attendance) {
        try {
          // Format: student_reg_no = "B22F0400CS100_2025-03-01_Lunch"
          const studentRegNo = record.reg || record.student_reg_no;
          const mealDate = record.dateStr || record.meal_date;
          const mealType = record.meal || record.meal_type;
          
          const supabaseData = {
            student_reg_no: studentRegNo,
            meal_date: mealDate,
            meal_type: mealType,
            status: record.status || 'Unpaid',
            amount: record.amount || 0
          };
          
          if (this.config.dryRun) {
            this.progress.completed++;
            continue;
          }
          
          // 🔑 Verify student exists
          const { data: student } = await window.supabaseClient
            .from('students')
            .select('reg_no')
            .eq('reg_no', studentRegNo)
            .maybeSingle();
          
          if (!student) {
            if (this.config.verbose) {
              console.log(`[mess_attendance] ⚠️  Skipping: student ${studentRegNo} not found`);
            }
            this.progress.skipped++;
            continue;
          }
          
          const { error } = await window.supabaseClient
            .from('mess_attendance')
            .upsert(supabaseData, { onConflict: 'id' })
            .select();
          
          if (error) {
            if (error.code === '23503') { // FK violation
              this.progress.skipped++;
              continue;
            }
            throw error;
          }
          
          this.progress.completed++;
          if (this.config.verbose && this.progress.completed % 50 === 0) {
            console.log(`[mess_attendance] Progress: ${Math.round((this.progress.completed/attendance.length)*100)}% (${this.progress.completed} done, ${this.progress.skipped} skipped)`);
          }
          
        } catch (err) {
          const msg = `[mess_attendance] ❌ Insert failed for student_reg_no=${record.reg || record.student_reg_no}_${record.dateStr || record.meal_date}_${record.meal || record.meal_type}: ${err.message}`;
          this.progress.errors.push(msg);
          console.log(msg);
        }
      }
      this.progress.total += attendance.length;
    }
    
    // Menu (static - no migration needed)
    console.log('📭 Menu data is static - no migration needed');
    
    // Feedback
    const feedback = JSON.parse(localStorage.getItem('smartdormx_feedback') || '[]');
    if (feedback.length) {
      console.log(`[${new Date().toLocaleTimeString()}] Migrating ${feedback.length} feedback entries...`);
      
      for (const fb of feedback) {
        try {
          const supabaseData = {
            student_reg_no: fb.reg || fb.student_reg_no || null,
            rating: fb.rating,
            feedback_text: fb.text || fb.feedback_text,
            submitted_at: fb.date || fb.submitted_at || new Date().toISOString()
          };
          
          if (this.config.dryRun) {
            this.progress.completed++;
            continue;
          }
          
          // Only insert if student exists (or allow null reg_no)
          if (supabaseData.student_reg_no) {
            const { data: student } = await window.supabaseClient
              .from('students')
              .select('reg_no')
              .eq('reg_no', supabaseData.student_reg_no)
              .maybeSingle();
            
            if (!student) {
              this.progress.skipped++;
              continue;
            }
          }
          
          const { error } = await window.supabaseClient
            .from('mess_feedback')
            .insert(supabaseData)
            .select();
          
          if (error) {
            if (error.code === '23503') {
              this.progress.skipped++;
              continue;
            }
            throw error;
          }
          
          this.progress.completed++;
          
        } catch (err) {
          this.progress.errors.push(`Feedback: ${err.message}`);
        }
      }
      this.progress.total += feedback.length;
    }
  },

  // 📊 MIGRATE DASHBOARD DATA - FIXED VERSION (alerts section)
async migrateDashboardData() {
  // ... [stats migration unchanged] ...
  
  // Alerts - FIXED timestamp handling
  const raw = localStorage.getItem('smartdormx_alerts');
  const alerts = raw ? JSON.parse(raw) : [];
  
  if (alerts && alerts.length) {
    console.log(`[${new Date().toLocaleTimeString()}] Migrating ${alerts.length} alerts...`);
    
    for (const alert of alerts) {
      try {
        // 🔥 FIX: Convert relative time strings to proper ISO timestamps
        let alertTime = alert.time || alert.alert_time;
        
        // Handle relative time strings like "1d ago", "2h ago", "Just now"
        if (alertTime && typeof alertTime === 'string') {
          if (alertTime.includes('ago') || alertTime.toLowerCase() === 'just now') {
            // Use current time for relative timestamps
            alertTime = new Date().toISOString();
          } else {
            // Try to parse as date, fallback to now
            const parsed = new Date(alertTime);
            if (isNaN(parsed.getTime())) {
              console.warn(`⚠️ Invalid timestamp "${alertTime}", using current time`);
              alertTime = new Date().toISOString();
            } else {
              alertTime = parsed.toISOString();
            }
          }
        } else if (!alertTime) {
          alertTime = new Date().toISOString();
        }
        
        const supabaseData = {
          alert_type: alert.type,
          title: alert.title,
          message: alert.message,
          location: alert.location,
          severity: alert.type === 'urgent' ? 'urgent' : 
                    alert.type === 'warning' ? 'warning' : 'info',
          is_read: alert.read || false,
          alert_time: alertTime // Now guaranteed to be valid ISO string
        };
        
        if (this.config?.dryRun) {
          this.progress.completed = (this.progress.completed || 0) + 1;
          continue;
        }
        
        const { error } = await window.supabaseClient
          .from('dashboard_alerts')
          .insert(supabaseData)
          .select();
        
        if (error) {
          if (error.code === '23505') { // duplicate
            this.progress.skipped = (this.progress.skipped || 0) + 1;
            if (this.config?.verbose) {
              console.log(`[dashboard_alerts] ⏭️ Skipping existing: title=${alert.title}`);
            }
            continue;
          }
          throw error;
        }
        
        this.progress.completed = (this.progress.completed || 0) + 1;
        
      } catch (err) {
        const msg = `[dashboard_alerts] ❌ Insert failed for title=${alert?.title}: ${err.message}`;
        this.progress.errors = this.progress.errors || [];
        this.progress.errors.push(msg);
        console.log(msg);
      }
    }
    this.progress.total = (this.progress.total || 0) + alerts.length;
  }
},

  // 👤 MIGRATE PROFILE
  async migrateProfile() {
    const profile = JSON.parse(localStorage.getItem('smartdormx_profile') || '{}');
    if (Object.keys(profile).length) {
      console.log('👤 Migrating admin profile...');
      try {
        await window.supabaseClient
          .from('admin_profiles')
          .upsert({
            full_name: profile.name || profile.full_name,
            email: profile.email,
            phone: profile.phone,
            role: 'admin',
            avatar_url: profile.avatar || profile.avatar_url
          }, { onConflict: 'email' });
        this.progress.completed++;
        this.progress.total++;
      } catch (err) {
        this.progress.errors.push(`Profile: ${err.message}`);
      }
    }
  },

  // 📋 SHOW SUMMARY
  showSummary(duration) {
    console.log('📊 Migration Summary');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Completed: ${this.progress.completed}`);
    console.log(`⏭️  Skipped (existing): ${this.progress.skipped}`);
    console.log(`❌ Errors: ${this.progress.errors.length}`);
    
    if (this.progress.errors.length > 0) {
      console.log('\nError details:');
      this.progress.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i+1}. ${err}`);
      });
      if (this.progress.errors.length > 10) {
        console.log(`  ... and ${this.progress.errors.length - 10} more`);
      }
    }
  }
};

// Make globally available
window.MigrationTool = MigrationTool;
console.log('✅ MigrationTool loaded. Run: await MigrationTool.migrateAll()');