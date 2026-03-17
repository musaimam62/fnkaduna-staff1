// ==================== Global State ====================
let currentUser = null;
let currentPage = 'home';
let selectedLoginType = 'department';
let currentDepartment = null;
let allDepartments = [];
let allStaff = [];
let allNominations = [];
let allNews = [];

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    loadHomePageData();
    verifySession();
});

// ==================== Authentication ====================
function verifySession() {
    fetch('/api/auth/verify')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                updateUIForLoggedInUser();
            }
        })
        .catch(err => console.error('Session verification error:', err));
}

function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    selectLoginType('department');
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginMessage').innerHTML = '';
}

function selectLoginType(type) {
    selectedLoginType = type;
    
    // Update button styles
    document.querySelectorAll('.login-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
    
    // Update hint
    const hint = document.getElementById('loginHint');
    if (type === 'department') {
        hint.innerHTML = '<i class="fas fa-info-circle"></i> Username: department name | Password: same as username';
    } else if (type === 'admin') {
        hint.innerHTML = '<i class="fas fa-info-circle"></i> Username: musaimam | Password: musaimam';
    } else if (type === 'superadmin') {
        hint.innerHTML = '<i class="fas fa-info-circle"></i> Username: musaimam | Password: musaimam';
    }
    
    // Update form fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Login Form Submit
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
            username,
            password,
            loginType: selectedLoginType
        })
    })
    .then(res => res.json())
    .then(data => {
        const messageEl = document.getElementById('loginMessage');
        if (data.success) {
            messageEl.className = 'message success';
            messageEl.innerHTML = `<i class="fas fa-check-circle"></i> ${data.message}`;
            
            currentUser = data.user || data.admin || data.superadmin;
            // Use the type from server response, but allow override from login type for admin/superadmin
            if (selectedLoginType === 'admin' || selectedLoginType === 'superadmin') {
                currentUser.type = selectedLoginType;
            }
            
            setTimeout(() => {
                closeLoginModal();
                updateUIForLoggedInUser();
            }, 1000);
        } else {
            messageEl.className = 'message error';
            messageEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${data.message}`;
        }
    })
    .catch(err => {
        console.error('Login error:', err);
        document.getElementById('loginMessage').className = 'message error';
        document.getElementById('loginMessage').innerHTML = '<i class="fas fa-exclamation-circle"></i> Login failed';
    });
});

function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            currentUser = null;
            currentDepartment = null;
            updateUIForLoggedOutUser();
            showPage('home');
        });
}

function updateUIForLoggedInUser() {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'flex';
    
    console.log('User logged in:', currentUser);
    
    // Navigate to the appropriate page based on user type
    if (currentUser.type === 'department') {
        showPage('department');
    } else if (currentUser.type === 'admin') {
        showPage('collection');
    } else if (currentUser.type === 'superadmin') {
        // Superadmin can access all pages - go to superadmin dashboard
        showPage('superadmin');
    }
    
    // Show news admin panel for admin and superadmin
    if (currentUser.type === 'admin' || currentUser.type === 'superadmin') {
        document.getElementById('newsAdminPanel').style.display = 'block';
    }
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginBtn').style.display = 'flex';
    document.getElementById('logoutBtn').style.display = 'none';
    
    // Hide all authenticated sections
    document.getElementById('departmentContent').style.display = 'none';
    document.getElementById('departmentLoginRequired').style.display = 'block';
    document.getElementById('collectionContent').style.display = 'none';
    document.getElementById('collectionLoginRequired').style.display = 'block';
    document.getElementById('selectionContent').style.display = 'none';
    document.getElementById('selectionLoginRequired').style.display = 'block';
    document.getElementById('superadminContent').style.display = 'none';
    document.getElementById('superadminLoginRequired').style.display = 'block';
    document.getElementById('newsAdminPanel').style.display = 'none';
}

// ==================== Navigation ====================
function showPage(page) {
    currentPage = page;
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');
    
    // Check authentication for protected pages
    if (page === 'department' || page === 'collection' || page === 'selection' || page === 'superadmin') {
        if (!currentUser) {
            openLoginModal();
            if (page === 'department') selectLoginType('department');
            else if (page === 'collection') selectLoginType('admin');
            else if (page === 'selection' || page === 'superadmin') selectLoginType('superadmin');
            return;
        }
        
        // Check if user has permission for this page - superadmin has access to all
        if (page === 'department' && currentUser.type !== 'department' && currentUser.type !== 'superadmin') {
            alert('Please login as Department');
            openLoginModal();
            selectLoginType('department');
            return;
        }
        if (page === 'collection' && currentUser.type !== 'admin' && currentUser.type !== 'superadmin') {
            alert('Please login as Admin');
            openLoginModal();
            selectLoginType('admin');
            return;
        }
        if ((page === 'selection' || page === 'superadmin') && currentUser.type !== 'superadmin') {
            alert('Please login as Super Admin');
            openLoginModal();
            selectLoginType('superadmin');
            return;
        }
    }
    
    // Load page-specific data
    switch(page) {
        case 'home':
            loadHomePageData();
            break;
        case 'department':
            // Both department users and superadmin can access department page
            if (currentUser && (currentUser.type === 'department' || currentUser.type === 'superadmin')) {
                document.getElementById('departmentLoginRequired').style.display = 'none';
                document.getElementById('departmentContent').style.display = 'block';
                loadDepartmentData();
            }
            break;
        case 'news':
            loadNewsData();
            break;
        case 'collection':
            // Both admin and superadmin can access collection page
            if (currentUser && (currentUser.type === 'admin' || currentUser.type === 'superadmin')) {
                document.getElementById('collectionLoginRequired').style.display = 'none';
                document.getElementById('collectionContent').style.display = 'block';
                loadCollectionData();
            }
            break;
        case 'selection':
            if (currentUser && currentUser.type === 'superadmin') {
                document.getElementById('selectionLoginRequired').style.display = 'none';
                document.getElementById('selectionContent').style.display = 'block';
                loadSelectionData();
            }
            break;
        case 'superadmin':
            if (currentUser && currentUser.type === 'superadmin') {
                document.getElementById('superadminLoginRequired').style.display = 'none';
                document.getElementById('superadminContent').style.display = 'block';
                loadSuperAdminData();
            }
            break;
    }
}

// ==================== Home Page ====================
let allServices = [];

function loadHomePageData() {
    // Load departments for home page
    fetch('/api/departments')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.departments.length > 0) {
                const dept = data.departments[0];
                document.getElementById('hodName').textContent = dept.head_name || 'Head of Department';
                document.getElementById('departmentDescription').textContent = dept.description || '';
                document.getElementById('missionText').textContent = dept.mission || '';
            }
        });
    
    // Load service details for Finance Department (id=3)
    fetch('/api/services/3')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allServices = data.services;
                
                const whatWeDoServices = allServices.filter(s => s.category === 'what_we_do');
                const whatWeWillDoServices = allServices.filter(s => s.category === 'what_we_will_do');
                
                // What we do - now clickable
                const whatWeDoContainer = document.getElementById('whatWeDo');
                whatWeDoContainer.innerHTML = whatWeDoServices.map(service => `
                    <div class="service-item clickable" onclick="showServiceDetail(${service.id})">
                        <i class="fas fa-check-circle"></i>
                        <h4>${service.title}</h4>
                    </div>
                `).join('');
                
                // What we will do - now clickable
                const whatWeWillDoContainer = document.getElementById('whatWeWillDo');
                whatWeWillDoContainer.innerHTML = whatWeWillDoServices.map(service => `
                    <div class="plan-item clickable" onclick="showServiceDetail(${service.id})">
                        <i class="fas fa-star"></i>
                        <h4>${service.title}</h4>
                    </div>
                `).join('');
            }
        });
    
    // Load events
    fetch('/api/news/event')
        .then(res => res.json())
        .then(data => {
            const eventsContainer = document.getElementById('eventsList');
            if (data.success && data.news.length > 0) {
                eventsContainer.innerHTML = data.news.slice(0, 3).map(news => {
                    const date = news.event_date ? new Date(news.event_date) : new Date(news.created_at);
                    return `
                        <div class="event-item">
                            <div class="event-date">
                                <span class="day">${date.getDate()}</span>
                                <span class="month">${date.toLocaleString('default', { month: 'short' })}</span>
                            </div>
                            <div class="event-info">
                                <h4>${news.title}</h4>
                                <p>${news.content.substring(0, 60)}...</p>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                eventsContainer.innerHTML = '<p class="text-center">No upcoming events</p>';
            }
        });
    
    // Load staff of month
    fetch('/api/staff-of-month')
        .then(res => res.json())
        .then(data => {
            const somContainer = document.getElementById('staffOfMonthPreview');
            if (data.success && data.history.length > 0) {
                const som = data.history[0];
                somContainer.innerHTML = `
                    <div class="som-photo">
                        <i class="fas fa-user"></i>
                    </div>
                    <h4>${som.staff_name}</h4>
                    <p>${som.department_name}</p>
                    <p><strong>${som.month} ${som.year}</strong></p>
                `;
            } else {
                somContainer.innerHTML = '<p class="text-center">No Staff of the Month yet</p>';
            }
        });
}

// Show service detail modal
function showServiceDetail(serviceId) {
    const service = allServices.find(s => s.id === serviceId);
    if (!service) return;
    
    const modal = document.getElementById('serviceDetailModal');
    const content = document.getElementById('serviceDetailContent');
    
    const categoryLabel = service.category === 'what_we_do' ? 'What We Do' : 'What We Will Do';
    
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--primary); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa${service.category === 'what_we_do' ? '-check-circle' : '-star'}" style="font-size: 40px; color: white;"></i>
            </div>
            <span class="news-tag" style="margin-bottom: 10px; display: inline-block;">${categoryLabel}</span>
            <h2 style="color: var(--primary); margin: 15px 0;">${service.title}</h2>
            <p style="line-height: 1.8; color: #555;">${service.description}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeServiceDetailModal() {
    document.getElementById('serviceDetailModal').style.display = 'none';
}

// ==================== Department Page ====================
function loadDepartmentData() {
    if (!currentUser || currentUser.type !== 'department') return;
    
    fetch(`/api/departments/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentDepartment = data.department;
                document.getElementById('displayDeptName').textContent = currentDepartment.name;
                
                // Load staff count
                fetch(`/api/staff/${currentUser.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            allStaff = data.staff;
                            document.getElementById('staffCount').textContent = data.staff.length;
                            renderStaffList(data.staff);
                            populateNomineeSelect(data.staff);
                        }
                    });
                
                // Load nominations
                fetch(`/api/nominations/department/${currentUser.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            document.getElementById('nominationCount').textContent = data.nominations.length;
                            renderMyNominations(data.nominations);
                        }
                    });
            }
        });
    
    document.getElementById('departmentLoginRequired').style.display = 'none';
    document.getElementById('departmentContent').style.display = 'block';
}

function showDepartmentTab(tab) {
    document.querySelectorAll('#departmentPage .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) btn.classList.add('active');
    });
    
    document.querySelectorAll('#departmentPage .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tab + 'Tab').classList.add('active');
}

function renderStaffList(staff) {
    const container = document.getElementById('staffList');
    if (staff.length === 0) {
        container.innerHTML = '<p class="text-center">No staff members yet</p>';
        return;
    }
    
    container.innerHTML = staff.map(s => `
        <div class="staff-card" onclick="showStaffDetail(${s.id})">
            <div class="staff-photo">
                <i class="fas fa-user"></i>
            </div>
            <h4>${s.name}</h4>
            <p>${s.position || 'Staff'}</p>
            <div class="staff-actions">
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); removeStaff(${s.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function populateNomineeSelect(staff) {
    const select = document.getElementById('nomineeSelect');
    select.innerHTML = '<option value="">Choose a staff member...</option>' +
        staff.map(s => `<option value="${s.id}">${s.name} - ${s.position || 'Staff'}</option>`).join('');
    
    // Also populate selection dropdown
    const finalSelect = document.getElementById('finalSelect');
    if (finalSelect) {
        finalSelect.innerHTML = '<option value="">Choose the selected staff...</option>' +
            staff.map(s => `<option value="${s.id}">${s.name} - ${s.position || 'Staff'}</option>`).join('');
    }
}

function renderMyNominations(nominations) {
    const container = document.getElementById('myNominations');
    if (nominations.length === 0) {
        container.innerHTML = '<p class="text-center">No nominations yet</p>';
        return;
    }
    
    container.innerHTML = nominations.map(n => `
        <div class="comment-card">
            <div class="comment-staff">
                <div class="comment-staff-photo">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                    <h4>${n.staff_name}</h4>
                    <p>${n.position}</p>
                </div>
            </div>
            <div class="reasons-list">
                <h5>Reasons:</h5>
                <p>${n.reason1}</p>
                <p>${n.reason2}</p>
                <p>${n.reason3}</p>
                <p>${n.reason4}</p>
                <p>${n.reason5}</p>
            </div>
            <p style="margin-top: 12px;"><strong>Status:</strong> ${n.status}</p>
            <p><small>Submitted: ${new Date(n.created_at).toLocaleDateString()}</small></p>
        </div>
    `).join('');
}

// Add Staff Modal
function showAddStaffModal() {
    document.getElementById('addStaffModal').style.display = 'block';
}

function closeAddStaffModal() {
    document.getElementById('addStaffModal').style.display = 'none';
    document.getElementById('addStaffForm').reset();
}

document.getElementById('addStaffForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const staffData = {
        department_id: currentUser.id,
        name: document.getElementById('staffName').value,
        position: document.getElementById('staffPosition').value,
        bio: document.getElementById('staffBio').value
    };
    
    fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Staff added successfully!');
            closeAddStaffModal();
            loadDepartmentData();
        } else {
            alert('Error: ' + data.message);
        }
    });
});

function removeStaff(id) {
    if (confirm('Are you sure you want to remove this staff member?')) {
        fetch(`/api/staff/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadDepartmentData();
                } else {
                    alert('Error: ' + data.message);
                }
            });
    }
}

function showStaffDetail(id) {
    const staff = allStaff.find(s => s.id === id);
    if (!staff) return;
    
    const modal = document.getElementById('staffDetailModal');
    const content = document.getElementById('staffDetailContent');
    
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="width: 120px; height: 120px; border-radius: 50%; background: var(--primary); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-user" style="font-size: 60px; color: white;"></i>
            </div>
            <h2>${staff.name}</h2>
            <p style="color: var(--accent); font-weight: 600;">${staff.position || 'Staff'}</p>
            <p style="margin-top: 16px;">${staff.bio || 'No bio available'}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeStaffDetailModal() {
    document.getElementById('staffDetailModal').style.display = 'none';
}

// Submit Nomination
document.getElementById('nominationForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nominationData = {
        department_id: currentUser.id,
        staff_id: document.getElementById('nomineeSelect').value,
        reason1: document.getElementById('reason1').value,
        reason2: document.getElementById('reason2').value,
        reason3: document.getElementById('reason3').value,
        reason4: document.getElementById('reason4').value,
        reason5: document.getElementById('reason5').value,
        hod_reason: document.getElementById('hodReason').value
    };
    
    fetch('/api/nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nominationData)
    })
    .then(res => res.json())
    .then(data => {
        const messageEl = document.getElementById('nominationMessage');
        if (data.success) {
            messageEl.className = 'message success';
            messageEl.innerHTML = '<i class="fas fa-check-circle"></i> Nomination submitted successfully!';
            document.getElementById('nominationForm').reset();
            loadDepartmentData();
        } else {
            messageEl.className = 'message error';
            messageEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + data.message;
        }
    });
});

// ==================== News Page ====================
function loadNewsData() {
    fetch('/api/news')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allNews = data.news;
                renderNews(allNews);
                
                // Show admin panel if logged in as admin/superadmin
                if (currentUser && (currentUser.type === 'admin' || currentUser.type === 'superadmin')) {
                    document.getElementById('newsAdminPanel').style.display = 'block';
                }
            }
        });
}

function filterNews(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === type) btn.classList.add('active');
    });
    
    if (type === 'all') {
        renderNews(allNews);
    } else {
        const filtered = allNews.filter(n => n.type === type);
        renderNews(filtered);
    }
}

function renderNews(news) {
    const container = document.getElementById('newsGrid');
    if (news.length === 0) {
        container.innerHTML = '<p class="text-center">No news available</p>';
        return;
    }
    
    container.innerHTML = news.map(n => `
        <div class="news-card">
            <div class="news-image">
                <i class="fas fa-newspaper"></i>
            </div>
            <div class="news-content">
                <span class="news-tag">${n.type}</span>
                <h3>${n.title}</h3>
                <p>${n.content.substring(0, 150)}...</p>
                <div class="news-meta">
                    <span><i class="fas fa-user"></i> ${n.author}</span>
                    <span>${new Date(n.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// News Form
document.getElementById('newsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newsData = {
        title: document.getElementById('newsTitle').value,
        content: document.getElementById('newsContent').value,
        type: document.getElementById('newsType').value,
        author: document.getElementById('newsAuthor').value,
        event_date: document.getElementById('newsEventDate').value
    };
    
    fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newsData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('News added successfully!');
            document.getElementById('newsForm').reset();
            loadNewsData();
        } else {
            alert('Error: ' + data.message);
        }
    });
});

// ==================== Collection Page ====================
function loadCollectionData() {
    fetch('/api/nominations')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allNominations = data.nominations;
                renderCollectionStats();
                renderNominationsTable();
            }
        });
    
    fetch('/api/departments')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allDepartments = data.departments;
            }
        });
}

function renderCollectionStats() {
    const total = allNominations.length;
    const submitted = allNominations.filter(n => n.status === 'submitted').length;
    const pending = allNominations.filter(n => n.status === 'pending').length;
    
    document.getElementById('totalNominations').textContent = total;
    document.getElementById('submittedNominations').textContent = submitted;
    document.getElementById('pendingNominations').textContent = pending;
}

function renderNominationsTable() {
    const tbody = document.getElementById('nominationsTable');
    if (allNominations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No nominations yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = allNominations.map(n => `
        <tr>
            <td>${n.staff_name}</td>
            <td>${n.department_name}</td>
            <td>${new Date(n.created_at).toLocaleDateString()}</td>
            <td><span class="news-tag">${n.status}</span></td>
            <td>
                ${n.status === 'pending' ? `
                    <button class="btn btn-sm btn-primary" onclick="submitNomination(${n.id})">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function submitNomination(id) {
    fetch(`/api/nominations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadCollectionData();
        } else {
            alert('Error: ' + data.message);
        }
    });
}

function sendNotifications() {
    // Send to those who submitted
    const submitted = allNominations.filter(n => n.status === 'submitted');
    submitted.forEach(n => {
        fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                department_id: n.department_id,
                type: 'confirmation',
                message: 'Your nomination has been received!'
            })
        });
    });
    alert(`Notifications sent to ${submitted.length} departments`);
}

function sendReminders() {
    fetch('/api/notifications/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
    });
}

// ==================== Selection Page ====================
function loadSelectionData() {
    fetch('/api/nominations')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allNominations = data.nominations;
                renderSelectionList();
                populateFinalSelect();
            }
        });
    
    fetch('/api/staff')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allStaff = data.staff;
            }
        });
}

function renderSelectionList() {
    const container = document.getElementById('selectionList');
    const submitted = allNominations.filter(n => n.status === 'submitted');
    
    if (submitted.length === 0) {
        container.innerHTML = '<p class="text-center">No submitted nominations to select from</p>';
        return;
    }
    
    container.innerHTML = submitted.map(n => `
        <div class="selection-card" id="selection-${n.id}">
            <div class="selection-header">
                <div class="selection-photo">
                    <i class="fas fa-user"></i>
                </div>
                <div class="selection-info">
                    <h4>${n.staff_name}</h4>
                    <p>${n.department_name}</p>
                </div>
            </div>
            <div class="reasons-list">
                <h5>Reasons for nomination:</h5>
                <p>${n.reason1}</p>
                <p>${n.reason2}</p>
                <p>${n.reason3}</p>
                <p>${n.reason4}</p>
                <p>${n.reason5}</p>
            </div>
            <div style="margin-top: 12px;">
                <strong>HOD Reason:</strong>
                <p>${n.hod_reason}</p>
            </div>
        </div>
    `).join('');
}

function populateFinalSelect() {
    const select = document.getElementById('finalSelect');
    const submitted = allNominations.filter(n => n.status === 'submitted');
    
    select.innerHTML = '<option value="">Choose the selected staff...</option>' +
        submitted.map(n => `<option value="${n.staff_id}" data-dept="${n.department_id}">${n.staff_name} - ${n.department_name}</option>`).join('');
}

function runAISelection() {
    const submitted = allNominations.filter(n => n.status === 'submitted');
    
    if (submitted.length === 0) {
        alert('No nominations to analyze');
        return;
    }
    
    fetch('/api/ai/select-best', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nominations: submitted })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const result = document.getElementById('aiResult');
            result.style.display = 'block';
            
            const rec = document.getElementById('aiRecommendation');
            rec.innerHTML = `
                <div class="selection-card selected" style="text-align: center; padding: 30px;">
                    <i class="fas fa-trophy" style="font-size: 4rem; color: var(--accent); margin-bottom: 20px;"></i>
                    <h3 style="font-size: 1.5rem; margin-bottom: 12px;">${data.best.staff_name}</h3>
                    <p style="color: var(--text-secondary);">${data.best.department_name}</p>
                    <div style="margin-top: 20px; padding: 16px; background: var(--bg); border-radius: 8px;">
                        <strong>AI Score:</strong> <span style="font-size: 1.5rem; color: var(--accent);">${data.best.ai_score.toFixed(1)}/100</span>
                    </div>
                    <p style="margin-top: 16px; font-size: 0.9rem;">${data.analysis}</p>
                </div>
            `;
            
            // Highlight the selected card
            document.querySelectorAll('.selection-card').forEach(card => {
                card.classList.remove('selected');
            });
            const bestCard = document.getElementById(`selection-${data.best.id}`);
            if (bestCard) {
                bestCard.classList.add('selected');
            }
            
            // Pre-select in dropdown
            document.getElementById('finalSelect').value = data.best.staff_id;
        } else {
            alert('Error: ' + data.message);
        }
    });
}

// Final Selection Form
document.getElementById('finalSelectionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const staffId = document.getElementById('finalSelect').value;
    const selectedOption = document.getElementById('finalSelect').selectedOptions[0];
    const deptId = selectedOption ? selectedOption.dataset.dept : null;
    
    if (!staffId || !deptId) {
        alert('Please select a staff member');
        return;
    }
    
    const selectionData = {
        staff_id: staffId,
        department_id: deptId,
        month: document.getElementById('selectMonth').value,
        year: parseInt(document.getElementById('selectYear').value),
        comment: document.getElementById('selectComment').value
    };
    
    fetch('/api/staff-of-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectionData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Staff of the Month has been selected!');
            document.getElementById('finalSelectionForm').reset();
            loadSelectionData();
        } else {
            alert('Error: ' + data.message);
        }
    });
});

// ==================== Super Admin Page ====================
function loadSuperAdminData() {
    loadHomepageData();
    loadDepartments();
    loadPasswordsTable();
    loadMemos();
    loadStats();
    loadAllStaff();
    
    if (currentUser && currentUser.type === 'superadmin') {
        // Show news admin panel for superadmin
        document.getElementById('newsAdminPanel').style.display = 'block';
    }
}

function showSuperAdminTab(tab) {
    document.querySelectorAll('#superadminPage .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) btn.classList.add('active');
    });
    
    document.querySelectorAll('#superadminPage .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tab + 'Tab').classList.add('active');
    
    // Load data for specific tabs
    if (tab === 'homepage') {
        loadHomepageData();
    } else if (tab === 'passwords') {
        loadPasswordsTable();
    } else if (tab === 'memos') {
        loadMemos();
    } else if (tab === 'stats') {
        loadStats();
    } else if (tab === 'allstaff') {
        loadAllStaff();
    }
}

function loadDepartments() {
    fetch('/api/departments')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allDepartments = data.departments;
                renderDepartmentsTable();
                populateMemoReceiver();
            }
        });
}

function renderDepartmentsTable() {
    const tbody = document.getElementById('departmentsTable');
    if (allDepartments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No departments</td></tr>';
        return;
    }
    
    tbody.innerHTML = allDepartments.map(d => `
        <tr>
            <td>${d.name}</td>
            <td>${d.head_name || '-'}</td>
            <td>${d.description || '-'}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${d.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddDepartmentModal() {
    document.getElementById('addDepartmentModal').style.display = 'block';
}

function closeAddDepartmentModal() {
    document.getElementById('addDepartmentModal').style.display = 'none';
    document.getElementById('addDepartmentForm').reset();
}

document.getElementById('addDepartmentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const deptData = {
        name: document.getElementById('deptName').value,
        head_name: document.getElementById('deptHead').value,
        description: document.getElementById('deptDescription').value,
        mission: document.getElementById('deptMission').value,
        what_we_do: document.getElementById('deptWhatWeDo').value,
        what_we_will_do: document.getElementById('deptWhatWeWillDo').value
    };
    
    console.log('Submitting department:', deptData);
    
    fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(deptData)
    })
    .then(res => res.json())
    .then(data => {
        console.log('Response:', data);
        if (data.success) {
            alert('Department added successfully!');
            closeAddDepartmentModal();
            loadDepartments();
            loadPasswordsTable();
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Failed to add department');
    });
});

function deleteDepartment(id) {
    if (confirm('Are you sure you want to delete this department?')) {
        fetch(`/api/departments/${id}`, { 
            method: 'DELETE',
            credentials: 'same-origin'
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadDepartments();
                } else {
                    alert('Error: ' + data.message);
                }
            });
    }
}

// Homepage data loading
function loadHomepageData() {
    fetch('/api/departments/1')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.department) {
                document.getElementById('homeHodName').value = data.department.head_name || '';
                document.getElementById('homeDescription').value = data.department.description || '';
                document.getElementById('homeMission').value = data.department.mission || '';
                document.getElementById('homeWhatWeDo').value = data.department.what_we_do || '';
                document.getElementById('homeWhatWeWillDo').value = data.department.what_we_will_do || '';
            }
        });
}

// Homepage form submit
document.getElementById('homepageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const data = {
        hod_name: document.getElementById('homeHodName').value,
        description: document.getElementById('homeDescription').value,
        mission: document.getElementById('homeMission').value,
        what_we_do: document.getElementById('homeWhatWeDo').value,
        what_we_will_do: document.getElementById('homeWhatWeWillDo').value
    };
    
    console.log('Updating homepage:', data);
    
    fetch('/api/homepage/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        console.log('Update result:', result);
        const msg = document.getElementById('homepageMessage');
        if (result.success) {
            msg.className = 'message success';
            msg.innerHTML = '<i class="fas fa-check-circle"></i> Home page updated successfully!';
            loadHomepageData();
            loadHomePageData();
        } else {
            msg.className = 'message error';
            msg.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + result.message;
        }
    })
    .catch(err => {
        console.error('Error:', err);
        const msg = document.getElementById('homepageMessage');
        msg.className = 'message error';
        msg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error occurred';
    });
});

// Passwords table
function loadPasswordsTable() {
    fetch('/api/departments')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('passwordsTable');
                tbody.innerHTML = data.departments.map(d => `
                    <tr>
                        <td>${d.name}</td>
                        <td><input type="password" id="newpass-${d.id}" placeholder="New password" style="width:150px;padding:8px;"></td>
                        <td><button class="btn btn-sm btn-primary" onclick="updatePassword(${d.id})"><i class="fas fa-save"></i> Save</button></td>
                    </tr>
                `).join('');
            }
        });
}

function updatePassword(deptId) {
    const newPass = document.getElementById('newpass-' + deptId).value;
    if (!newPass) {
        alert('Enter a new password');
        return;
    }
    fetch(`/api/departments/${deptId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: newPass })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Password updated!');
            document.getElementById('newpass-' + deptId).value = '';
        } else {
            alert('Error: ' + data.message);
        }
    });
}

// All staff
function loadAllStaff() {
    fetch('/api/staff')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const container = document.getElementById('allStaffGrid');
                if (data.staff.length === 0) {
                    container.innerHTML = '<p>No staff</p>';
                    return;
                }
                container.innerHTML = data.staff.map(s => `
                    <div class="all-staff-card">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:50px;height:50px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-user" style="color:white;font-size:20px;"></i>
                            </div>
                            <div>
                                <h4>${s.name}</h4>
                                <p class="dept-name">${s.department_name || 'No Dept'}</p>
                                <p class="position">${s.position || 'Staff'}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        });
}

// Memos
function populateMemoReceiver() {
    const select = document.getElementById('memoReceiver');
    select.innerHTML = '<option value="all">All Departments</option>' +
        allDepartments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

function loadMemos() {
    fetch('/api/memos')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderMemos(data.memos);
            }
        });
}

function renderMemos(memos) {
    const container = document.getElementById('memosList');
    if (memos.length === 0) {
        container.innerHTML = '<p>No memos</p>';
        return;
    }
    container.innerHTML = memos.map(m => `
        <div class="memo-card ${m.is_read ? '' : 'unread'}">
            <div class="memo-header">
                <h4>${m.subject}</h4>
                <span class="memo-date">${new Date(m.created_at).toLocaleDateString()}</span>
            </div>
            <p>${m.content}</p>
            <p style="font-size:0.85rem;color:#718096;">From: ${m.sender_name} | To: ${m.receiver_name}</p>
        </div>
    `).join('');
}

document.getElementById('memoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const receiverId = document.getElementById('memoReceiver').value;
    fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
            sender_type: 'superadmin',
            sender_id: currentUser.id,
            receiver_type: receiverId === 'all' ? 'all' : 'department',
            receiver_id: receiverId === 'all' ? 0 : parseInt(receiverId),
            subject: document.getElementById('memoSubject').value,
            content: document.getElementById('memoContent').value
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Memo sent!');
            document.getElementById('memoForm').reset();
            loadMemos();
        } else {
            alert('Error: ' + data.message);
        }
    });
});

// Stats
function loadStats() {
    fetch('/api/stats')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('statDepartments').textContent = data.stats.departments;
                document.getElementById('statStaff').textContent = data.stats.staff;
                document.getElementById('statNominations').textContent = data.stats.nominations;
                document.getElementById('statNews').textContent = data.stats.news;
            }
        });
}

// Upload form
document.getElementById('uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
            type: document.getElementById('uploadType').value,
            title: document.getElementById('uploadTitle').value,
            content: document.getElementById('uploadDesc').value,
            image_url: document.getElementById('uploadImageData').value,
            event_date: document.getElementById('uploadEventDate').value,
            author: 'Super Admin'
        })
    })
    .then(res => res.json())
    .then(data => {
        const msg = document.getElementById('uploadMessage');
        if (data.success) {
            msg.className = 'message success';
            msg.innerHTML = '<i class="fas fa-check-circle"></i> Uploaded!';
            document.getElementById('uploadForm').reset();
        } else {
            msg.className = 'message error';
            msg.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + data.message;
        }
    });
});

// ==================== Window Close Modals ====================
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
