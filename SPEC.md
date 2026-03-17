# Staff of the Month - Application Specification

## 1. Project Overview

**Project Name:** Staff of the Month
**Project Type:** Full-stack Web Application (Offline-capable)
**Core Functionality:** A comprehensive system for departments to nominate and select "Staff of the Month" with AI-assisted selection, news management, and super admin controls.
**Target Users:** Department heads, staff members, administrators, and super admins

---

## 2. UI/UX Specification

### 2.1 Layout Structure

**Main Layout:**
- Fixed sidebar navigation (right side, 280px width)
- Main content area (fluid width)
- Responsive design for all screen sizes

**Page Sections:**
- Header: Logo and app title
- Sidebar: Navigation menu with icons
- Content Area: Dynamic content based on selected menu
- Footer: Copyright and version info

### 2.2 Visual Design

**Color Palette:**
- Primary: `#1a365d` (Deep Navy Blue)
- Secondary: `#2c5282` (Royal Blue)
- Accent: `#ed8936` (Warm Orange)
- Success: `#38a169` (Green)
- Warning: `#d69e2e` (Gold)
- Danger: `#e53e3e` (Red)
- Background: `#f7fafc` (Light Gray)
- Card Background: `#ffffff` (White)
- Text Primary: `#1a202c` (Dark Gray)
- Text Secondary: `#718096` (Medium Gray)

**Typography:**
- Headings: 'Playfair Display', serif
- Body: 'Source Sans Pro', sans-serif
- Font Sizes:
  - H1: 2.5rem
  - H2: 2rem
  - H3: 1.5rem
  - Body: 1rem
  - Small: 0.875rem

**Spacing System:**
- Base unit: 8px
- Margins: 8px, 16px, 24px, 32px
- Padding: 8px, 16px, 24px, 32px

**Visual Effects:**
- Card shadows: `0 4px 6px rgba(0, 0, 0, 0.1)`
- Hover shadows: `0 8px 15px rgba(0, 0, 0, 0.15)`
- Border radius: 8px for cards, 4px for inputs
- Transitions: 0.3s ease-in-out

### 2.3 Components

**Navigation Items:**
- Default: Light background, dark text
- Hover: Primary color background, white text
- Active: Accent color background, white text

**Buttons:**
- Primary: Primary color background, white text
- Secondary: Transparent, primary color border
- Danger: Danger color background, white text
- Sizes: Small (28px), Medium (36px), Large (44px)

**Form Inputs:**
- Border: 1px solid #e2e8f0
- Focus: Primary color border, light shadow
- Padding: 12px 16px
- Border radius: 4px

**Cards:**
- White background
- Border radius: 8px
- Shadow on hover
- Padding: 24px

**Tables:**
- Striped rows (alternating #f7fafc and white)
- Hover highlight
- Header: Primary color background

---

## 3. Functionality Specification

### 3.1 Home Page

**Features:**
- Hero section with department head photo and welcome message
- Mission statement section
- "What We Do" section with icons
- "What We Will Do" section with future plans
- Events carousel/slider
- News highlights preview

### 3.2 Department Module

**Authentication:**
- Username format: `department` (static)
- Password format: `{department_name}` (lowercase, no spaces)
- Session-based authentication

**Features:**
- **Staff Management:**
  - Add new staff (name, position, photo, bio)
  - Remove staff (with confirmation)
  - View staff list with photos
  
- **Nomination:**
  - Select staff for "Staff of the Month"
  - Provide 5 reasons for selection
  - Text area for head of department's reasoning
  - Submit nomination to collection

### 3.3 News Module

**Features:**
- News feed with articles
- Staff of the Month gallery (past and present)
- Photo gallery with lightbox
- Video clips section
- "What We Do" section
- "What We Will Do" section (future plans)
- Admin can add/edit/delete news

### 3.4 Collection Menu (Admin Only)

**Authentication:**
- Separate admin login
- Username: `admin`
- Password: `admin123`

**Features:**
- View all submitted nominations
- Send/Delete data options
- Send notification to departments who:
  - Have submitted data (send confirmation)
  - Have not submitted data (send reminder)
- Filter by department
- Export data option

### 3.5 Selection Module (Super Admin)

**Authentication:**
- Head of department as super admin
- Username: `superadmin`
- Password: `superadmin123`

**Features:**
- View all nominations from all departments
- Checkbox selection for candidates
- AI-powered best staff selection:
  - Analyze reasons provided
  - Score based on quality and specificity
  - Display top recommendation
- Manual override option
- Send final selection to Super Admin Dashboard

### 3.6 Super Admin Module

**Authentication:**
- Username: `superadmin`
- Password: `superadmin123`

**Features:**
- **Department Management:**
  - Add new department
  - Remove department
  - Edit department details
  
- **Comments:**
  - Comment on each department's selection
  - Rate/feedback on nominations
  
- **Memo System:**
  - Send memo to all departments
  - Receive memo from departments
  - Internal messaging system

---

## 4. Technical Architecture

### 4.1 Backend

**Framework:** Node.js with Express
**Database:** SQLite (offline-capable)
**Authentication:** JWT tokens + Session storage
**API:** RESTful JSON API

### 4.2 Database Schema

```sql
-- Departments
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  head_name TEXT,
  description TEXT,
  mission TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Staff
CREATE TABLE staff (
  id INTEGER PRIMARY KEY,
  department_id INTEGER,
  name TEXT NOT NULL,
  position TEXT,
  photo TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Nominations
CREATE TABLE nominations (
  id INTEGER PRIMARY KEY,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- News
CREATE TABLE news (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT,
  image_url TEXT,
  video_url TEXT,
  author TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Staff of Month History
CREATE TABLE staff_of_month (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER,
  department_id INTEGER,
  month TEXT,
  year INTEGER,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Memos
CREATE TABLE memos (
  id INTEGER PRIMARY KEY,
  sender_type TEXT,
  sender_id INTEGER,
  receiver_type TEXT,
  receiver_id INTEGER,
  subject TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  department_id INTEGER,
  type TEXT,
  message TEXT,
  is_sent BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

### 4.3 API Endpoints

**Authentication:**
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/verify`

**Departments:**
- GET `/api/departments`
- POST `/api/departments`
- PUT `/api/departments/:id`
- DELETE `/api/departments/:id`

**Staff:**
- GET `/api/staff/:departmentId`
- POST `/api/staff`
- PUT `/api/staff/:id`
- DELETE `/api/staff/:id`

**Nominations:**
- GET `/api/nominations`
- POST `/api/nominations`
- PUT `/api/nominations/:id`
- GET `/api/nominations/collection`
- POST `/api/nominations/select-best`

**News:**
- GET `/api/news`
- POST `/api/news`
- PUT `/api/news/:id`
- DELETE `/api/news/:id`

**Staff of Month:**
- GET `/api/staff-of-month`
- POST `/api/staff-of-month`

**Memos:**
- GET `/api/memos`
- POST `/api/memos`
- PUT `/api/memos/:id/read`

**Notifications:**
- GET `/api/notifications`
- POST `/api/notifications/send`
- POST `/api/notifications/remind`

**AI Selection:**
- POST `/api/ai/select-best`

---

## 5. Acceptance Criteria

### 5.1 Home Page
- [ ] Displays head of department photo
- [ ] Shows mission statement
- [ ] Displays "What We Do" section
- [ ] Displays "What We Will Do" section
- [ ] Shows events/news highlights
- [ ] Right sidebar navigation works

### 5.2 Department Module
- [ ] Login with department credentials works
- [ ] Can add new staff
- [ ] Can remove staff
- [ ] Can nominate staff with 5 reasons
- [ ] Can provide HOD reasoning
- [ ] Can submit nomination

### 5.3 News Module
- [ ] Displays news articles
- [ ] Shows Staff of Month gallery
- [ ] Photo gallery with lightbox
- [ ] Video section displays
- [ ] Admin can manage news

### 5.4 Collection Menu
- [ ] Admin login works
- [ ] Shows all submitted nominations
- [ ] Can send notifications
- [ ] Can filter by department

### 5.5 Selection Module
- [ ] Super admin login works
- [ ] Shows all nominations
- [ ] Checkbox selection works
- [ ] AI selection provides recommendation
- [ ] Can send to Super Admin Dashboard

### 5.6 Super Admin Module
- [ ] Can add/remove departments
- [ ] Can comment on selections
- [ ] Can send/receive memos
- [ ] Full system control

---

## 6. File Structure

```
staff-of-month/
├── server.js                 # Main server file
├── package.json              # Dependencies
├── database.js               # Database setup
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── departments.js       # Department routes
│   ├── staff.js             # Staff routes
│   ├── nominations.js       # Nomination routes
│   ├── news.js              # News routes
│   ├── memos.js             # Memo routes
│   └── ai.js                # AI selection routes
├── public/
│   ├── index.html           # Home page
│   ├── css/
│   │   └── style.css        # Main styles
│   ├── js/
│   │   ├── app.js           # Main app logic
│   │   ├── auth.js          # Authentication
│   │   ├── department.js    # Department module
│   │   ├── news.js          # News module
│   │   ├── collection.js    # Collection module
│   │   ├── selection.js     # Selection module
│   │   └── superadmin.js    # Super admin module
│   └── images/              # Image assets
└── data/
    └── staffofmonth.db      # SQLite database
```
