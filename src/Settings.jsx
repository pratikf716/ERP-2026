import { MoreOutlined } from "@ant-design/icons";
import { Button, Checkbox, Table, Avatar, Card, Tag, Tooltip } from "antd";
import { signOut } from "firebase/auth";
import { ref, get, update } from 'firebase/database';
import { useContext, useEffect, useState } from "react";
import Swal from "sweetalert2";
import "./AdminList.css";
import { DarkModeContext } from "./DarkModeContext";
import { auth, db } from "./firebase";

const AdminList = () => {
  const { darkMode } = useContext(DarkModeContext);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists()) {
            const userData = snapshot.val();
            setCurrentUser({
              key: user.uid,
              uid: user.uid,
              firstName: userData.displayName?.split(' ')[0] || userData.email.split('@')[0],
              lastName: userData.displayName?.split(' ')[1] || '',
              email: userData.email,
              role: userData.role || "user",
              branch: userData.branch || "main",
              enabled: userData.enabled !== false,
              photoURL: userData.photoURL || ''
            });
          } else {
            await update(ref(db, `users/${user.uid}`), {
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
              role: 'user',
              branch: 'main',
              enabled: true
            });
            setCurrentUser({
              key: user.uid,
              firstName: user.displayName?.split(' ')[0] || user.email.split('@')[0],
              lastName: user.displayName?.split(' ')[1] || '',
              email: user.email,
              role: "user",
              branch: "main",
              enabled: true,
              photoURL: user.photoURL || ''
            });
          }
        } catch (error) {
          Swal.fire({
            title: "Error!",
            text: "Failed to load user data",
            icon: "error",
            background: darkMode ? "#2a2a3a" : "#ffffff",
            color: darkMode ? "#e0e0e0" : "#000000",
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [darkMode]);

  const columns = [
    {
      title: <span className={darkMode ? "dark-table-header" : ""}>Name</span>,
      dataIndex: "name",
      render: (_, record) => (
        <span className={darkMode ? "dark-text" : ""} style={{ fontWeight: 600 }}>{record.firstName} {record.lastName}</span>
      ),
      width: 180
    },
    {
      title: <span className={darkMode ? "dark-table-header" : ""}>Email</span>,
      dataIndex: "email",
      render: (email) => (
        <Tooltip title={email}>
          <span className={darkMode ? "dark-text" : ""}>{email}</span>
        </Tooltip>
      ),
      width: 220,
      responsive: ['md']
    },
    {
      title: <span className={darkMode ? "dark-table-header" : ""}>Role</span>,
      dataIndex: "role",
      render: (role) => <Tag color={role === 'admin' ? 'geekblue' : 'green'}>{role.toUpperCase()}</Tag>,
      width: 100
    },
    {
      title: <span className={darkMode ? "dark-table-header" : ""}>Branch</span>,
      dataIndex: "branch",
      render: (branch) => <Tag className={darkMode ? "dark-tag" : ""}>{branch}</Tag>,
      width: 100,
      responsive: ['md']
    },
    {
      title: <span className={darkMode ? "dark-table-header" : ""}>Enabled</span>,
      dataIndex: "enabled",
      render: (enabled) => <Checkbox checked={enabled} disabled className={darkMode ? "dark-checkbox" : ""} />,
      width: 100,
      responsive: ['md']
    }
  ];

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to log out?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, logout!",
      cancelButtonText: "Cancel",
      background: darkMode ? "#2a2a3a" : "#ffffff",
      color: darkMode ? "#e0e0e0" : "#000000",
    }).then((result) => {
      if (result.isConfirmed) {
        signOut(auth).then(() => {
          Swal.fire({
            title: "Logged out!",
            text: "You have been logged out.",
            icon: "success",
            background: darkMode ? "#2a2a3a" : "#ffffff",
            color: darkMode ? "#e0e0e0" : "#000000",
          });
        }).catch((error) => {
          Swal.fire({
            title: "Error!",
            text: error.message,
            icon: "error",
            background: darkMode ? "#2a2a3a" : "#ffffff",
            color: darkMode ? "#e0e0e0" : "#000000",
          });
        });
      }
    });
  };

  if (loading) {
    return <div className={`loading-container ${darkMode ? "dark-mode" : ""}`}>Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className={`no-user-container ${darkMode ? "dark-mode" : ""}`}>
        <h2 className={darkMode ? "dark-text" : ""}>No user logged in</h2>
        <p className={darkMode ? "dark-text" : ""}>Please sign in to view your admin settings.</p>
      </div>
    );
  }

  return (
    <div className={`admin-container ${darkMode ? "dark-mode" : ""}`}>
      <Card
        title={<h2 className={darkMode ? "dark-text" : ""}>Admin Settings</h2>}
        extra={<Button danger onClick={handleLogout} className={darkMode ? "dark-logout-button" : "light-logout-button"}>Logout</Button>}
        bordered={false}
        className={darkMode ? "dark-card" : ""}
        style={{ marginBottom: 20 }}
      >
        {isMobile ? (
          // Mobile view
          <div className={`mobile-user-card ${darkMode ? "dark-mobile-card" : ""}`}>
            <div className="mobile-user-header">
              <div className="mobile-user-info">
                <h3 className={darkMode ? "dark-text" : ""}>{currentUser.firstName} {currentUser.lastName}</h3>
                <Tooltip title={currentUser.email}>
                  <p className={`mobile-email ${darkMode ? "dark-text" : ""}`}>{currentUser.email}</p>
                </Tooltip>
              </div>
            </div>
            
            <div className="mobile-user-details">
              <div className="mobile-detail-row">
                <span className="detail-label">Role:</span>
                <Tag color={currentUser.role === 'admin' ? 'geekblue' : 'green'}>{currentUser.role.toUpperCase()}</Tag>
              </div>
              
              <div className="mobile-detail-row">
                <span className="detail-label">Branch:</span>
                <Tag className={darkMode ? "dark-tag" : ""}>{currentUser.branch}</Tag>
              </div>
              
              <div className="mobile-detail-row">
                <span className="detail-label">Enabled:</span>
                <Checkbox checked={currentUser.enabled} disabled className={darkMode ? "dark-checkbox" : ""} />
              </div>
            </div>
          </div>
        ) : (
          // Desktop view
          <Table
            columns={columns}
            dataSource={[currentUser]}
            rowKey="key"
            pagination={false}
            className={darkMode ? "dark-table" : ""}
          />
        )}
      </Card>
      <div className="Last">
        Made with ❤️ By Pratik
      </div>
    </div>
  );
};

export default AdminList;