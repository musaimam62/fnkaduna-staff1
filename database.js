const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'staffofmonth.db');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Departments table
            db.run(`CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                password TEXT DEFAULT '1234',
                head_name TEXT,
                description TEXT,
                mission TEXT,
                what_we_do TEXT,
                what_we_will_do TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) reject(err);
            });

            // Staff table
            db.run(`CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department_id INTEGER,
                name TEXT NOT NULL,
                position TEXT,
                photo TEXT,
                bio TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(id)
            )`, (err) => {
                if (err) reject(err);
            });

            // Nominations table
            db.run(`CREATE TABLE IF NOT EXISTS nominations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department_id INTEGER,
                staff_id INTEGER,
                reason1 TEXT,
                reason2 TEXT,
                reason3 TEXT,
                reason4 TEXT,
                reason5 TEXT,
                hod_reason TEXT,
                status TEXT DEFAULT 'pending',
                ai_score REAL,
                ai_analysis TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(id),
                FOREIGN KEY (staff_id) REFERENCES staff(id)
            )`, (err) => {
                if (err) reject(err);
            });

            // News table
            db.run(`CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                type TEXT,
                image_url TEXT,
                video_url TEXT,
                author TEXT,
                event_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) reject(err);
            });

            // Staff of Month History
            db.run(`CREATE TABLE IF NOT EXISTS staff_of_month (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_id INTEGER,
                department_id INTEGER,
                month TEXT,
                year INTEGER,
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES staff(id),
                FOREIGN KEY (department_id) REFERENCES departments(id)
            )`, (err) => {
                if (err) reject(err);
            });

            // Memos table
            db.run(`CREATE TABLE IF NOT EXISTS memos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_type TEXT,
                sender_id INTEGER,
                receiver_type TEXT,
                receiver_id INTEGER,
                subject TEXT,
                content TEXT,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) reject(err);
            });

            // Notifications table
            db.run(`CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department_id INTEGER,
                type TEXT,
                message TEXT,
                is_sent INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(id)
            )`, (err) => {
                if (err) reject(err);
            });

            // Admin users table
            db.run(`CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) reject(err);
            });

            // Service details table
            db.run(`CREATE TABLE IF NOT EXISTS service_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(id)
            )`, (err) => {
                if (err) reject(err);
            });

            // Insert default admin and super admin
            const bcrypt = require('bcryptjs');
            const defaultPassword = 'musaimam';
            const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

            // Delete existing musaimam users first
            db.run(`DELETE FROM admins WHERE username = 'musaimam'`, (err) => {
                // Insert musaimam as superadmin (which gives full access)
                db.run(`INSERT INTO admins (username, password, role) VALUES (?, ?, ?)`, 
                    ['musaimam', hashedPassword, 'superadmin'], (err) => {
                    if (err) console.log('Admin insert error:', err);
                });
            });

            // Insert sample departments
            db.run(`INSERT OR IGNORE INTO departments (name, head_name, description, mission, what_we_do, what_we_will_do) VALUES 
                (?, ?, ?, ?, ?, ?)`,
                ['IT Department', 'John Smith', 'Technology and Innovation', 
                 'To deliver cutting-edge technological solutions that empower our organization.',
                 'Software development, System maintenance, IT support, Network management, Cybersecurity',
                 'AI integration, Cloud migration, Digital transformation, IoT implementation'],
                (err) => { if (err) console.log('Department insert error:', err); }
            );

            db.run(`INSERT OR IGNORE INTO departments (name, head_name, description, mission, what_we_do, what_we_will_do) VALUES 
                (?, ?, ?, ?, ?, ?)`,
                ['HR Department', 'Sarah Johnson', 'Human Resources Management',
                 'To foster a positive workplace culture and develop our most valuable asset - our people.',
                 'Recruitment, Training, Employee relations, Performance management, Benefits administration',
                 'Remote work policies, Diversity initiatives, Employee wellness programs, Career development'],
                (err) => { if (err) console.log('Department insert error:', err); }
            );

            db.run(`INSERT OR IGNORE INTO departments (name, head_name, description, mission, what_we_do, what_we_will_do) VALUES 
                (?, ?, ?, ?, ?, ?)`,
                ['Finance Department', 'Michael Brown', 'Financial Planning and Analysis',
                 'To ensure financial sustainability and growth through strategic planning and management.',
                 'Budgeting, Financial reporting, Payroll, Auditing, Investment management',
                 'Financial automation, Risk management, Blockchain adoption, ESG reporting'],
                (err) => { if (err) console.log('Department insert error:', err); }
            );

            // Insert service details for Finance Department
            const financeServices = [
                { title: 'Budgeting', description: 'Comprehensive budget planning and management for all organizational departments. We create annual budgets, monitor spending, and provide financial forecasts to ensure optimal resource allocation.', category: 'what_we_do' },
                { title: 'Financial reporting', description: 'Preparation of accurate financial statements including balance sheets, income statements, and cash flow statements. Monthly, quarterly, and annual reports for stakeholders and regulatory compliance.', category: 'what_we_do' },
                { title: 'Payroll', description: 'Complete payroll processing services including salary calculations, tax deductions, benefits administration, and direct deposit processing for all employees.', category: 'what_we_do' },
                { title: 'Auditing', description: 'Internal and external audit coordination, financial compliance verification, and risk assessment to ensure accuracy and integrity of financial data.', category: 'what_we_do' },
                { title: 'Investment management', description: 'Strategic investment planning, portfolio management, and asset allocation to maximize returns while managing risk across organizational funds.', category: 'what_we_do' },
                { title: 'Financial automation', description: 'Implementation of automated financial systems, AI-powered forecasting tools, and digital payment solutions to streamline financial operations.', category: 'what_we_will_do' },
                { title: 'Risk management', description: 'Comprehensive risk assessment, mitigation strategies, and insurance management to protect organizational assets and ensure business continuity.', category: 'what_we_will_do' },
                { title: 'Blockchain adoption', description: 'Integration of blockchain technology for secure transactions, smart contracts, and transparent record-keeping across financial operations.', category: 'what_we_will_do' },
                { title: 'ESG reporting', description: 'Environmental, Social, and Governance reporting framework implementation to track and communicate sustainability and responsible business practices.', category: 'what_we_will_do' }
            ];
            
            financeServices.forEach(service => {
                db.run(`INSERT INTO service_details (department_id, title, description, category) VALUES (?, ?, ?, ?)`,
                    [3, service.title, service.description, service.category],
                    (err) => { if (err) console.log('Service insert error:', err); }
                );
            });

            // Insert sample staff for IT Department
            db.run(`INSERT OR IGNORE INTO staff (department_id, name, position, photo, bio) VALUES 
                (?, ?, ?, ?, ?)`,
                [1, 'Alice Williams', 'Senior Developer', 'alice.jpg', 'Experienced full-stack developer with 8 years of experience'],
                (err) => { if (err) console.log('Staff insert error:', err); }
            );
            db.run(`INSERT OR IGNORE INTO staff (department_id, name, position, photo, bio) VALUES 
                (?, ?, ?, ?, ?)`,
                [1, 'Bob Johnson', 'UI/UX Designer', 'bob.jpg', 'Creative designer passionate about user experience'],
                (err) => { if (err) console.log('Staff insert error:', err); }
            );
            db.run(`INSERT OR IGNORE INTO staff (department_id, name, position, photo, bio) VALUES 
                (?, ?, ?, ?, ?)`,
                [1, 'Carol Davis', 'Database Administrator', 'carol.jpg', 'Expert in database management and optimization'],
                (err) => { if (err) console.log('Staff insert error:', err); }
            );

            // Insert sample staff for HR Department
            db.run(`INSERT OR IGNORE INTO staff (department_id, name, position, photo, bio) VALUES 
                (?, ?, ?, ?, ?)`,
                [2, 'David Lee', 'HR Manager', 'david.jpg', 'Strategic HR professional with expertise in talent management'],
                (err) => { if (err) console.log('Staff insert error:', err); }
            );
            db.run(`INSERT OR IGNORE INTO staff (department_id, name, position, photo, bio) VALUES 
                (?, ?, ?, ?, ?)`,
                [2, 'Emma Wilson', 'Recruiter', 'emma.jpg', 'Dedicated recruiter with strong networking skills'],
                (err) => { if (err) console.log('Staff insert error:', err); }
            );

            // Insert sample staff for Finance Department
            db.run(`INSERT OR IGNORE INTO staff (department_id, name, position, photo, bio) VALUES 
                (?, ?, ?, ?, ?)`,
                [3, 'Frank Miller', 'Financial Analyst', 'frank.jpg', 'Analytical thinker with expertise in financial modeling'],
                (err) => { if (err) console.log('Staff insert error:', err); }
            );
            db.run(`INSERT OR IGNORE INTO staff (department_id, name, position, photo, bio) VALUES 
                (?, ?, ?, ?, ?)`,
                [3, 'Grace Chen', 'Accountant', 'grace.jpg', 'Detail-oriented accountant with CPA certification'],
                (err) => { if (err) console.log('Staff insert error:', err); }
            );

            // Insert sample news
            db.run(`INSERT OR IGNORE INTO news (title, content, type, author, event_date) VALUES 
                (?, ?, ?, ?, ?)`,
                ['Staff of the Month Announcement', 'We are proud to announce Alice Williams as our Staff of the Month for February 2026!', 
                 'staff_month', 'Admin', '2026-02-01'],
                (err) => { if (err) console.log('News insert error:', err); }
            );

            db.run(`INSERT OR IGNORE INTO news (title, content, type, author, event_date) VALUES 
                (?, ?, ?, ?, ?)`,
                ['IT Department Annual Summit', 'Join us for our annual technology summit featuring workshops on AI and cloud computing.',
                 'event', 'John Smith', '2026-03-15'],
                (err) => { if (err) console.log('News insert error:', err); }
            );

            db.run(`INSERT OR IGNORE INTO news (title, content, type, author, event_date) VALUES 
                (?, ?, ?, ?, ?)`,
                ['New Employee Onboarding Program', 'Our HR department launches an enhanced onboarding experience for new hires.',
                 'general', 'Sarah Johnson', '2026-01-20'],
                (err) => { if (err) console.log('News insert error:', err); }
            );

            // Insert sample staff of month history
            db.run(`INSERT OR IGNORE INTO staff_of_month (staff_id, department_id, month, year, comment) VALUES 
                (?, ?, ?, ?, ?)`,
                [1, 1, 'February', 2026, 'Outstanding performance in project delivery'],
                (err) => { if (err) console.log('Staff of month insert error:', err); }
            );

            console.log('Database initialized successfully!');
            resolve();
        });
    });
}

module.exports = { db, initializeDatabase };
