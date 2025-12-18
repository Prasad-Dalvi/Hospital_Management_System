git clone https://github.com/Prasad-Dalvi/Hospital_Management_System.git
run RunThisInMysql.sql in MySQL
# Navigate to backend folder
cd Hospital_Management-System/backend

# Install all required packages
npm install

# Configure Database Connection
# Open backend/server.js and find this section (around line 25):
# javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'YOUR_MYSQL_PASSWORD', // ← CHANGE THIS
  database: 'memory_tracker',
  waitForConnections: true,
  connectionLimit: 10
});
# Replace 'YOUR_MYSQL_PASSWORD' with your actual MySQL password.

Step 5: Start the Server
bash
# From backend folder
node server.js

# You should see:
# 🚀 Server running on http://localhost:3000
# ✅ Database connected successfully

# Access the Application
# Open your web browser
# Go to: http://localhost:3000

# You should see the login page

🔐 Default Login Credentials
Role	Username	Password	Dashboard Access
👑 Admin	admin	admin123	Full system control
👨‍⚕️ Doctor	doctor1	doctor123	Patient management
👩‍⚕️ Caretaker	caretaker1	care123	Activity logging
👤 Patient	patient1	patient123	Personal data only
