const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'staff-of-month-secret-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize database
initializeDatabase().then(() => {
    console.log('Database ready!');
}).catch(err => {
    console.error('Database initialization error:', err);
});

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password, loginType } = req.body;
    
    if (loginType === 'department') {
        // Department login - check departments table
        db.get("SELECT * FROM departments WHERE LOWER(name) = ?", [username.toLowerCase()], (err, department) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            if (!department) {
                return res.json({ success: false, message: 'Department not found' });
            }
            // For department, password is '1234' by default or custom password
            const storedPassword = department.password || '1234';
            if (password === storedPassword) {
                req.session.user = { id: department.id, name: department.name, type: 'department' };
                return res.json({ success: true, message: 'Login successful', department });
            }
            return res.json({ success: false, message: 'Invalid password' });
        });
    } else if (loginType === 'admin' || loginType === 'superadmin') {
        // Admin/Super admin login - check admins table
        db.get("SELECT * FROM admins WHERE username = ?", [username], (err, admin) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            if (!admin) {
                return res.json({ success: false, message: 'Admin not found' });
            }
            const validPassword = bcrypt.compareSync(password, admin.password);
            if (validPassword) {
                // Use the actual role from database
                req.session.user = { id: admin.id, name: admin.username, type: admin.role };
                return res.json({ success: true, message: 'Login successful', user: req.session.user });
            }
            return res.json({ success: false, message: 'Invalid password' });
        });
    } else {
        res.json({ success: false, message: 'Invalid login type' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify session
app.get('/api/auth/verify', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'Not authenticated' });
    }
});

// ==================== DEPARTMENT ROUTES ====================

// Get all departments
app.get('/api/departments', (req, res) => {
    db.all("SELECT * FROM departments ORDER BY name", [], (err, departments) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, departments });
    });
});

// Get single department
app.get('/api/departments/:id', (req, res) => {
    db.get("SELECT * FROM departments WHERE id = ?", [req.params.id], (err, department) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, department });
    });
});

// ==================== SERVICE DETAILS ROUTES ====================

// Get service details by department
app.get('/api/services/:departmentId', (req, res) => {
    db.all("SELECT * FROM service_details WHERE department_id = ?", [req.params.departmentId], (err, services) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, services });
    });
});

// Get single service detail
app.get('/api/services/detail/:id', (req, res) => {
    db.get("SELECT * FROM service_details WHERE id = ?", [req.params.id], (err, service) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, service });
    });
});

// Add department (Super Admin only)
app.post('/api/departments', (req, res) => {
    if (!req.session.user || (req.session.user.type !== 'superadmin' && req.session.user.type !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { name, head_name, description, mission, what_we_do, what_we_will_do } = req.body;
    db.run("INSERT INTO departments (name, head_name, description, mission, what_we_do, what_we_will_do) VALUES (?, ?, ?, ?, ?, ?)",
        [name, head_name, description, mission, what_we_do, what_we_will_do],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(500).json({ success: false, message: 'Department name already exists. Please use a different name.' });
                }
                return res.status(500).json({ success: false, message: 'Error adding department: ' + err.message });
            }
            res.json({ success: true, message: 'Department added successfully', id: this.lastID });
        }
    );
});

// Update department
app.put('/api/departments/:id', (req, res) => {
    if (!req.session.user || (req.session.user.type !== 'superadmin' && req.session.user.type !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { name, head_name, description, mission, what_we_do, what_we_will_do } = req.body;
    db.run("UPDATE departments SET name = ?, head_name = ?, description = ?, mission = ?, what_we_do = ?, what_we_will_do = ? WHERE id = ?",
        [name, head_name, description, mission, what_we_do, what_we_will_do, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating department' });
            }
            res.json({ success: true, message: 'Department updated successfully' });
        }
    );
});

// Delete department
app.delete('/api/departments/:id', (req, res) => {
    if (!req.session.user || (req.session.user.type !== 'superadmin' && req.session.user.type !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    db.run("DELETE FROM departments WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error deleting department' });
        }
        res.json({ success: true, message: 'Department deleted successfully' });
    });
});

// Update department password
app.put('/api/departments/:id/password', (req, res) => {
    if (!req.session.user || (req.session.user.type !== 'superadmin' && req.session.user.type !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { password } = req.body;
    db.run("UPDATE departments SET password = ? WHERE id = ?", 
        [password, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating password' });
            }
            res.json({ success: true, message: 'Password updated successfully' });
        }
    );
});

// Update home page content
app.put('/api/homepage/update', (req, res) => {
    if (!req.session.user || (req.session.user.type !== 'superadmin' && req.session.user.type !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { hod_name, description, mission, what_we_do, what_we_will_do } = req.body;
    
    // Update first department (main department)
    db.run(`UPDATE departments SET head_name = ?, description = ?, mission = ?, what_we_do = ?, what_we_will_do = ? WHERE id = 1`,
        [hod_name, description, mission, what_we_do, what_we_will_do],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating homepage' });
            }
            res.json({ success: true, message: 'Homepage updated successfully' });
        }
    );
});

// Upload image (simple base64 storage)
app.post('/api/upload/image', (req, res) => {
    if (!req.session.user || (req.session.user.type !== 'superadmin' && req.session.user.type !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { image_data, type } = req.body;
    
    // Store in news table as a news item with image
    const title = type === 'event' ? 'New Event Added' : 'New Image Gallery';
    const content = 'Image uploaded by Super Admin';
    
    db.run(`INSERT INTO news (title, content, type, image_url, author) VALUES (?, ?, ?, ?, ?)`,
        [title, content, type === 'event' ? 'event' : 'general', image_data, 'Super Admin'],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error uploading image' });
            }
            res.json({ success: true, message: 'Image uploaded successfully', id: this.lastID });
        }
    );
});

// ==================== STAFF ROUTES ====================

// Get staff by department
app.get('/api/staff/:departmentId', (req, res) => {
    db.all("SELECT * FROM staff WHERE department_id = ? AND is_active = 1", [req.params.departmentId], (err, staff) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, staff });
    });
});

// Get all staff
app.get('/api/staff', (req, res) => {
    db.all("SELECT s.*, d.name as department_name FROM staff s LEFT JOIN departments d ON s.department_id = d.id WHERE s.is_active = 1", [], (err, staff) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, staff });
    });
});

// Add staff
app.post('/api/staff', (req, res) => {
    const { department_id, name, position, photo, bio } = req.body;
    db.run("INSERT INTO staff (department_id, name, position, photo, bio) VALUES (?, ?, ?, ?, ?)",
        [department_id, name, position, photo, bio],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error adding staff' });
            }
            res.json({ success: true, message: 'Staff added successfully', id: this.lastID });
        }
    );
});

// Update staff
app.put('/api/staff/:id', (req, res) => {
    const { name, position, photo, bio } = req.body;
    db.run("UPDATE staff SET name = ?, position = ?, photo = ?, bio = ? WHERE id = ?",
        [name, position, photo, bio, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating staff' });
            }
            res.json({ success: true, message: 'Staff updated successfully' });
        }
    );
});

// Remove staff (soft delete)
app.delete('/api/staff/:id', (req, res) => {
    db.run("UPDATE staff SET is_active = 0 WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error removing staff' });
        }
        res.json({ success: true, message: 'Staff removed successfully' });
    });
});

// ==================== NOMINATION ROUTES ====================

// Get all nominations
app.get('/api/nominations', (req, res) => {
    let query = `
        SELECT n.*, s.name as staff_name, s.position, s.photo, d.name as department_name 
        FROM nominations n 
        LEFT JOIN staff s ON n.staff_id = s.id 
        LEFT JOIN departments d ON n.department_id = d.id
        ORDER BY n.created_at DESC
    `;
    db.all(query, [], (err, nominations) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, nominations });
    });
});

// Get nominations by department
app.get('/api/nominations/department/:departmentId', (req, res) => {
    db.all(`
        SELECT n.*, s.name as staff_name, s.position, s.photo, d.name as department_name 
        FROM nominations n 
        LEFT JOIN staff s ON n.staff_id = s.id 
        LEFT JOIN departments d ON n.department_id = d.id
        WHERE n.department_id = ?
        ORDER BY n.created_at DESC
    `, [req.params.departmentId], (err, nominations) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, nominations });
    });
});

// Submit nomination
app.post('/api/nominations', (req, res) => {
    const { department_id, staff_id, reason1, reason2, reason3, reason4, reason5, hod_reason } = req.body;
    db.run(`
        INSERT INTO nominations (department_id, staff_id, reason1, reason2, reason3, reason4, reason5, hod_reason, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [department_id, staff_id, reason1, reason2, reason3, reason4, reason5, hod_reason],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error submitting nomination' });
            }
            res.json({ success: true, message: 'Nomination submitted successfully', id: this.lastID });
        }
    );
});

// Update nomination status
app.put('/api/nominations/:id', (req, res) => {
    const { status, ai_score, ai_analysis } = req.body;
    db.run("UPDATE nominations SET status = ?, ai_score = ?, ai_analysis = ? WHERE id = ?",
        [status, ai_score, ai_analysis, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating nomination' });
            }
            res.json({ success: true, message: 'Nomination updated successfully' });
        }
    );
});

// Get collection (submitted nominations)
app.get('/api/nominations/collection', (req, res) => {
    db.all(`
        SELECT n.*, s.name as staff_name, s.position, s.photo, d.name as department_name 
        FROM nominations n 
        LEFT JOIN staff s ON n.staff_id = s.id 
        LEFT JOIN departments d ON n.department_id = d.id
        WHERE n.status = 'submitted'
        ORDER BY n.created_at DESC
    `, [], (err, nominations) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, nominations });
    });
});

// Get pending nominations
app.get('/api/nominations/pending', (req, res) => {
    db.all(`
        SELECT n.*, s.name as staff_name, s.position, s.photo, d.name as department_name 
        FROM nominations n 
        LEFT JOIN staff s ON n.staff_id = s.id 
        LEFT JOIN departments d ON n.department_id = d.id
        WHERE n.status = 'pending'
        ORDER BY n.created_at DESC
    `, [], (err, nominations) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, nominations });
    });
});

// ==================== NEWS ROUTES ====================

// Get all news
app.get('/api/news', (req, res) => {
    db.all("SELECT * FROM news ORDER BY created_at DESC", [], (err, news) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, news });
    });
});

// Get news by type
app.get('/api/news/:type', (req, res) => {
    db.all("SELECT * FROM news WHERE type = ? ORDER BY created_at DESC", [req.params.type], (err, news) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, news });
    });
});

// Add news
app.post('/api/news', (req, res) => {
    const { title, content, type, image_url, video_url, author, event_date } = req.body;
    db.run(`
        INSERT INTO news (title, content, type, image_url, video_url, author, event_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, content, type, image_url, video_url, author, event_date],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error adding news' });
            }
            res.json({ success: true, message: 'News added successfully', id: this.lastID });
        }
    );
});

// Update news
app.put('/api/news/:id', (req, res) => {
    const { title, content, type, image_url, video_url, author, event_date } = req.body;
    db.run(`
        UPDATE news SET title = ?, content = ?, type = ?, image_url = ?, video_url = ?, author = ?, event_date = ?
        WHERE id = ?
    `, [title, content, type, image_url, video_url, author, event_date, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating news' });
            }
            res.json({ success: true, message: 'News updated successfully' });
        }
    );
});

// Delete news
app.delete('/api/news/:id', (req, res) => {
    db.run("DELETE FROM news WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error deleting news' });
        }
        res.json({ success: true, message: 'News deleted successfully' });
    });
});

// ==================== STAFF OF MONTH ROUTES ====================

// Get staff of month history
app.get('/api/staff-of-month', (req, res) => {
    db.all(`
        SELECT som.*, s.name as staff_name, s.position, s.photo, d.name as department_name 
        FROM staff_of_month som
        LEFT JOIN staff s ON som.staff_id = s.id
        LEFT JOIN departments d ON som.department_id = d.id
        ORDER BY som.year DESC, som.month DESC
    `, [], (err, history) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, history });
    });
});

// Add staff of month
app.post('/api/staff-of-month', (req, res) => {
    const { staff_id, department_id, month, year, comment } = req.body;
    db.run(`
        INSERT INTO staff_of_month (staff_id, department_id, month, year, comment)
        VALUES (?, ?, ?, ?, ?)
    `, [staff_id, department_id, month, year, comment],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error adding staff of month' });
            }
            // Update nomination status
            db.run("UPDATE nominations SET status = 'selected' WHERE staff_id = ? AND department_id = ?",
                [staff_id, department_id], (err) => {});
            res.json({ success: true, message: 'Staff of month added successfully', id: this.lastID });
        }
    );
});

// ==================== MEMO ROUTES ====================

// Get memos
app.get('/api/memos', (req, res) => {
    let query = `
        SELECT m.*, 
        CASE WHEN m.sender_type = 'superadmin' THEN 'Super Admin' ELSE d.name END as sender_name,
        CASE WHEN m.receiver_type = 'superadmin' THEN 'Super Admin' ELSE d2.name END as receiver_name
        FROM memos m 
        LEFT JOIN departments d ON m.sender_type = 'department' AND m.sender_id = d.id
        LEFT JOIN departments d2 ON m.receiver_type = 'department' AND m.receiver_id = d2.id
        ORDER BY m.created_at DESC
    `;
    db.all(query, [], (err, memos) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, memos });
    });
});

// Send memo
app.post('/api/memos', (req, res) => {
    const { sender_type, sender_id, receiver_type, receiver_id, subject, content } = req.body;
    db.run(`
        INSERT INTO memos (sender_type, sender_id, receiver_type, receiver_id, subject, content)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [sender_type, sender_id, receiver_type, receiver_id, subject, content],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error sending memo' });
            }
            res.json({ success: true, message: 'Memo sent successfully', id: this.lastID });
        }
    );
});

// Mark memo as read
app.put('/api/memos/:id/read', (req, res) => {
    db.run("UPDATE memos SET is_read = 1 WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error marking memo as read' });
        }
        res.json({ success: true, message: 'Memo marked as read' });
    });
});

// ==================== NOTIFICATION ROUTES ====================

// Get notifications
app.get('/api/notifications', (req, res) => {
    let query = `
        SELECT n.*, d.name as department_name 
        FROM notifications n
        LEFT JOIN departments d ON n.department_id = d.id
        ORDER BY n.created_at DESC
    `;
    db.all(query, [], (err, notifications) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, notifications });
    });
});

// Send notification
app.post('/api/notifications/send', (req, res) => {
    const { department_id, type, message } = req.body;
    db.run(`
        INSERT INTO notifications (department_id, type, message, is_sent)
        VALUES (?, ?, ?, 1)
    `, [department_id, type, message],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error sending notification' });
            }
            res.json({ success: true, message: 'Notification sent successfully' });
        }
    );
});

// Send reminder to departments that haven't submitted
app.post('/api/notifications/remind', (req, res) => {
    // Get all departments
    db.all("SELECT id, name FROM departments", [], (err, departments) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        
        // Get departments that have submitted nominations this month
        db.all(`
            SELECT DISTINCT department_id FROM nominations 
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `, [], (err, submitted) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            
            const submittedIds = submitted.map(s => s.department_id);
            const notSubmitted = departments.filter(d => !submittedIds.includes(d.id));
            
            // Send reminder to each department that hasn't submitted
            notSubmitted.forEach(dept => {
                db.run(`
                    INSERT INTO notifications (department_id, type, message, is_sent)
                    VALUES (?, 'reminder', 'Reminder: Please submit your Staff of the Month nomination', 1)
                `, [dept.id], (err) => {});
            });
            
            res.json({ success: true, message: `Reminders sent to ${notSubmitted.length} departments` });
        });
    });
});

// ==================== AI SELECTION ROUTES ====================

// AI-powered best staff selection
app.post('/api/ai/select-best', (req, res) => {
    const { nominations } = req.body;
    
    if (!nominations || nominations.length === 0) {
        return res.json({ success: false, message: 'No nominations provided' });
    }
    
    // Simple AI scoring algorithm
    const scored = nominations.map(nom => {
        let score = 0;
        let analysis = [];
        
        // Score based on reasons quality
        const reasons = [nom.reason1, nom.reason2, nom.reason3, nom.reason4, nom.reason5].filter(r => r);
        
        // Length check (more detailed = better)
        const avgLength = reasons.reduce((sum, r) => sum + (r ? r.length : 0), 0) / reasons.length;
        
        if (avgLength > 50) {
            score += 30;
            analysis.push('Detailed reasons provided (+30)');
        } else if (avgLength > 30) {
            score += 20;
            analysis.push('Good level of detail (+20)');
        } else {
            score += 10;
            analysis.push('Basic reasons provided (+10)');
        }
        
        // Keywords analysis
        const positiveWords = ['excellent', 'outstanding', 'exceptional', 'dedicated', 'hardworking', 'innovative', 'leadership', 'teamwork', 'professional'];
        const text = reasons.join(' ').toLowerCase();
        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        
        score += positiveCount * 10;
        analysis.push(`Found ${positiveCount} positive keywords (+${positiveCount * 10})`);
        
        // HOD reason check
        if (nom.hod_reason && nom.hod_reason.length > 50) {
            score += 20;
            analysis.push('Strong HOD endorsement (+20)');
        } else if (nom.hod_reason && nom.hod_reason.length > 20) {
            score += 10;
            analysis.push('Moderate HOD endorsement (+10)');
        }
        
        // Random factor for fairness (slight variation)
        score += Math.random() * 10;
        
        return {
            ...nom,
            ai_score: Math.min(score, 100),
            ai_analysis: analysis.join('. ')
        };
    });
    
    // Sort by score and get top candidate
    scored.sort((a, b) => b.ai_score - a.ai_score);
    const best = scored[0];
    
    res.json({ 
        success: true, 
        best: best,
        allScored: scored,
        analysis: `AI Analysis: ${best.ai_analysis}. Final Score: ${best.ai_score.toFixed(1)}/100`
    });
});

// ==================== STATS ROUTES ====================

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    db.get("SELECT COUNT(*) as count FROM departments", [], (err, row) => {
        stats.departments = row.count;
        
        db.get("SELECT COUNT(*) as count FROM staff WHERE is_active = 1", [], (err, row) => {
            stats.staff = row.count;
            
            db.get("SELECT COUNT(*) as count FROM nominations WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')", [], (err, row) => {
                stats.nominations = row.count;
                
                db.get("SELECT COUNT(*) as count FROM news", [], (err, row) => {
                    stats.news = row.count;
                    
                    res.json({ success: true, stats });
                });
            });
        });
    });
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Staff of the Month server running on http://localhost:${PORT}`);
});
