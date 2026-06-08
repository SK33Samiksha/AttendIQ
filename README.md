# 📋 AttendIQ — Smart Attendance Management System
### Full Stack: HTML/CSS/JS + Node.js + Express + MySQL

---

## 📁 Project Structure

```
attendance-system/
├── database.sql              ← Run this in MySQL Workbench first
├── frontend/                 ← Open in browser (served by Node.js)
│   ├── index.html            ← Login page
│   ├── dashboard.html        ← Dashboard
│   ├── mark.html             ← Mark attendance
│   ├── records.html          ← View records
│   ├── students.html         ← Manage students
│   ├── subjects.html         ← Manage subjects
│   ├── reports.html          ← Attendance percentage reports
│   ├── css/
│   │   └── shared.css
│   └── js/
│       └── app.js
└── backend/
    ├── server.js             ← Main entry point
    ├── package.json
    ├── .env                  ← Configure your MySQL password here
    ├── config/
    │   └── db.js             ← MySQL pool connection
    ├── middleware/
    │   └── auth.js           ← JWT authentication
    └── routes/
        ├── auth.js           ← Login, Register
        ├── students.js       ← CRUD students
        ├── subjects.js       ← CRUD subjects
        └── attendance.js     ← Mark, view, reports
```

---

## ⚡ Setup Instructions

### Step 1 — MySQL Workbench
1. Open **MySQL Workbench**
2. Connect to your local MySQL server
3. Open the file `database.sql`
4. Click **Execute** (⚡ button) to create the database and seed data

### Step 2 — Configure .env
Open `backend/.env` and set your MySQL password:
```
DB_PASSWORD=your_mysql_root_password
```

### Step 3 — Install Dependencies
```bash
cd backend
npm install
```

### Step 4 — Start the Server
```bash
npm start
# or for auto-reload:
npm run dev
```

### Step 5 — Open in Browser
```
http://localhost:5000
```

---

## 🔐 Login Credentials

| Role    | Email                 | Password  |
|---------|-----------------------|-----------|
| Admin   | admin@school.com      | password  |
| Teacher | sharma@school.com     | password  |
| Teacher | mehta@school.com      | password  |

---

## 🌐 API Endpoints

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| POST   | /api/auth/login                 | Login                        |
| POST   | /api/auth/register              | Register new user            |
| GET    | /api/students                   | List all students            |
| POST   | /api/students                   | Add student                  |
| PUT    | /api/students/:id               | Update student               |
| DELETE | /api/students/:id               | Delete student               |
| GET    | /api/subjects                   | List all subjects            |
| POST   | /api/subjects                   | Add subject                  |
| DELETE | /api/subjects/:id               | Delete subject               |
| POST   | /api/attendance/mark            | Mark attendance (bulk)       |
| GET    | /api/attendance/by-date         | Get by date & subject        |
| GET    | /api/attendance/summary         | Percentage summary (view)    |
| GET    | /api/attendance/stats           | Dashboard stats              |
| GET    | /api/attendance/student/:id     | Student history              |

---

## 🛠 Technologies Used

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript         |
| Backend    | Node.js, Express.js                     |
| Database   | MySQL (via MySQL Workbench)             |
| Auth       | JWT (jsonwebtoken) + bcrypt             |
| ORM/Driver | mysql2 (promise-based)                  |

---

## 🗄 Database Tables

| Table      | Purpose                          |
|------------|----------------------------------|
| users      | Teachers/admins (login)          |
| students   | Student records                  |
| subjects   | Course subjects                  |
| attendance | Daily attendance records         |

**View:** `attendance_summary` — auto-calculates percentage per student per subject

---

## 📊 Key Features

- ✅ JWT-based secure login
- ✅ Mark attendance in bulk (all students at once)
- ✅ Auto-calculate attendance percentage
- ✅ MySQL VIEW for instant summary
- ✅ UNIQUE constraint prevents duplicate entries
- ✅ ON DUPLICATE KEY UPDATE for re-marking
- ✅ Filter records by date, subject, student
- ✅ Color-coded attendance badges (green/amber/red)
- ✅ Responsive dashboard with stat cards
