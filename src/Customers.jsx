import { SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, Grid, Input, Modal, Table, message } from "antd";
import { onValue, push, ref, remove } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import { DarkModeContext } from "./DarkModeContext";
import { db } from "./firebase";

const { useBreakpoint } = Grid;

const Customers = ({ onSelectCustomer }) => {
  const { darkMode } = useContext(DarkModeContext);
  const screens = useBreakpoint();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
  });
  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [userId, setUserId] = useState(null);

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "";
  }, [darkMode]);

  useEffect(() => {
    if (!userId) return;

    const customersRef = ref(db, `users/${userId}/customers`);
    onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      setCustomers(list);
      setFilteredCustomers(list);
    });
  }, [userId]);

  useEffect(() => {
    const filtered = customers.filter((cust) =>
      cust.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!name) return "Name is required";
    if (!nameRegex.test(name)) return "Name can only contain letters and spaces";
    return "";
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    if (!phone) return "";
    if (!phoneRegex.test(phone)) return "Phone number must be exactly 10 digits";
    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Convert email to lowercase as user types
    if (name === "email") {
      processedValue = value.toLowerCase();
    }
    
    setFormData({ ...formData, [name]: processedValue });
    
    // Validate in real-time
    if (name === "name") {
      setFormErrors({ ...formErrors, name: validateName(processedValue) });
    } else if (name === "email") {
      setFormErrors({ ...formErrors, email: validateEmail(processedValue) });
    } else if (name === "phone") {
      setFormErrors({ ...formErrors, phone: validatePhone(processedValue) });
    }
  };

  const handleSubmit = async () => {
    // Validate all fields before submitting
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhone(formData.phone);
    
    setFormErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
    });
    
    if (nameError || emailError || phoneError) {
      message.error("Please fix the validation errors before submitting.");
      return;
    }

    if (!userId) {
      alert("User not authenticated. Please log in again.");
      return;
    }
    
    try {
      // Ensure email is stored in lowercase
      const dataToSubmit = {
        ...formData,
        email: formData.email.toLowerCase()
      };
      
      await push(ref(db, `users/${userId}/customers`), dataToSubmit);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        company: "",
      });
      setFormErrors({
        name: "",
        email: "",
        phone: "",
      });
      setIsModalOpen(false);
      message.success("Client added successfully!");
    } catch (error) {
      console.error("Error adding customer:", error);
      message.error("Failed to add client. Please try again.");
    }
  };

  const handleDeleteSelected = async () => {
    if (!userId) {
      alert("User not authenticated. Please log in again.");
      return;
    }

    if (selectedRowKeys.length === 0) {
      alert("Please select at least one customer to delete");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedRowKeys.length} selected customer(s)?`
    );
    
    if (confirmDelete) {
      try {
        const deletePromises = selectedRowKeys.map(id => 
          remove(ref(db, `users/${userId}/customers/${id}`))
        );
        await Promise.all(deletePromises);
        setSelectedRowKeys([]);
        message.success("Selected clients deleted successfully!");
      } catch (error) {
        console.error("Error deleting customers:", error);
        message.error("Failed to delete clients. Please try again.");
      }
    }
  };

  const handleDeleteAllClients = async () => {
    if (!userId) {
      alert("User not authenticated. Please log in again.");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete all clients?");
    if (confirmDelete) {
      try {
        await remove(ref(db, `users/${userId}/customers`));
        message.success("All clients deleted successfully!");
      } catch (error) {
        console.error("Error deleting customers:", error);
        message.error("Failed to delete all clients. Please try again.");
      }
    }
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };
  

  const getColumns = () => {
    const baseColumns = screens.xs
      ? [
          {
            title: "Client Details",
            dataIndex: "name",
            key: "name",
            render: (_, record) => (
              <div 
                onClick={() => onSelectCustomer(record)}
                className={darkMode ? "dark-mobile-card" : ""}
                style={{ 
                  padding: '8px'
                }}
              >
                <strong className={darkMode ? "dark-text" : ""}>{record.name}</strong><br />
                <span className={darkMode ? "dark-text-secondary" : ""}>📞 {record.phone}</span><br />
                <span className={darkMode ? "dark-text-secondary" : ""}>✉️ {record.email}</span><br />
                <span className={darkMode ? "dark-text-secondary" : ""}>🏢 {record.company}</span><br />
                <span className={darkMode ? "dark-text-secondary" : ""}>📍 {record.address}</span>
              </div>
            ),
          },
        ]
      : [
          { 
            title: "Name", 
            dataIndex: "name", 
            key: "name",
            render: (text) => <span className={darkMode ? "dark-text" : ""}>{text}</span>
          },
          { 
            title: "Email", 
            dataIndex: "email", 
            key: "email",
            render: (text) => <span className={darkMode ? "dark-text" : ""}>{text}</span>
          },
          { 
            title: "Phone", 
            dataIndex: "phone", 
            key: "phone",
            render: (text) => <span className={darkMode ? "dark-text" : ""}>{text}</span>
          },
          { 
            title: "Address", 
            dataIndex: "address", 
            key: "address",
            render: (text) => <span className={darkMode ? "dark-text" : ""}>{text}</span>
          },
          { 
            title: "Company", 
            dataIndex: "company", 
            key: "company",
            render: (text) => <span className={darkMode ? "dark-text" : ""}>{text}</span>
          },
        ];

    return [
      {
        title: '',
        key: 'selection',
        width: 50,
        render: (_, record) => (
          <Checkbox 
            checked={selectedRowKeys.includes(record.id)}
            onChange={(e) => {
              const newSelectedRowKeys = e.target.checked
                ? [...selectedRowKeys, record.id]
                : selectedRowKeys.filter(key => key !== record.id);
              setSelectedRowKeys(newSelectedRowKeys);
            }}
            className={darkMode ? "dark-checkbox" : ""}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      ...baseColumns
    ];
  };

  const containerStyle = {
    padding: screens.xs ? "12px" : "24px",
    marginLeft: screens.xs ? "0" : "250px",
    maxWidth: "1100px",
    width: "100%",
    backgroundColor: darkMode ? "#141414" : "#f8f9fa",
    color: darkMode ? "#f1f1f1" : "inherit",
    minHeight: '100vh',
    transition: 'background-color 0.3s ease, color 0.3s ease'
  };

  const headerStyle = {
    display: "flex",
    flexDirection: screens.xs ? "column" : "row",
    justifyContent: "space-between",
    marginBottom: "16px",
    gap: screens.xs ? "12px" : "8px",
  };

  const tableStyle = {
    backgroundColor: darkMode ? "#1f1f1f" : "#fff",
    borderRadius: "8px",
    padding: screens.xs ? "8px" : "12px",
    border: darkMode ? "1px solid #444" : "1px solid #d9d9d9",
    color: darkMode ? "#f1f1f1" : "inherit"
  };

  const inputStyle = {
    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
    borderColor: darkMode ? "#555" : "#d9d9d9",
    color: darkMode ? "#f1f1f1" : "inherit"
  };

  const errorStyle = {
    color: "#ff4d4f",
    fontSize: "12px",
    marginTop: "4px"
  };

  const modalBodyStyle = {
    backgroundColor: darkMode ? "#1f1f1f" : "#fff",
    color: darkMode ? "#f1f1f1" : "inherit"
  };

  const modalHeaderStyle = {
    backgroundColor: darkMode ? "#1f1f1f" : "#fff",
    color: darkMode ? "#f1f1f1" : "inherit",
    borderBottom: darkMode ? "1px solid #444" : "1px solid #f0f0f0"
  };

  const modalFooterStyle = {
    backgroundColor: darkMode ? "#1f1f1f" : "#fff",
    borderTop: darkMode ? "1px solid #444" : "1px solid #f0f0f0"
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ 
          margin: screens.xs ? "0 0 8px 0" : "0",
          color: darkMode ? "#f1f1f1" : "inherit"
        }}>Clients List</h2>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexDirection: screens.xs ? "column" : "row",
            flexWrap: "wrap"
          }}
        >
          <Input
            placeholder="Search by Name"
            allowClear
            prefix={<SearchOutlined style={{ color: darkMode ? "#f1f1f1" : "inherit" }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={darkMode ? "dark-input" : ""}
            style={{ 
              ...inputStyle,
              width: screens.xs ? "100%" : "200px"
            }}
          />
          <Button
            type="primary"
            onClick={() => setIsModalOpen(true)}
            style={{ 
              width: screens.xs ? "100%" : "auto",
              backgroundColor: darkMode ? "#177ddc" : "#1890ff",
              borderColor: darkMode ? "#177ddc" : "#1890ff"
            }}
            disabled={!userId}
          >
            + Add Client
          </Button>

          {selectedRowKeys.length > 0 && (
            <Button
              danger
              onClick={handleDeleteSelected}
              style={{
                width: screens.xs ? "100%" : "auto",
                borderColor: '#ff4d4f',
                color: '#ff4d4f',
                backgroundColor: 'transparent'
              }}
              disabled={!userId}
            >
              🗑️ Delete Selected ({selectedRowKeys.length})
            </Button>
          )}

          {/* <Button
            danger
            onClick={handleDeleteAllClients}
            style={{
              width: screens.xs ? "100%" : "auto",
              borderColor: '#ff4d4f',
              color: '#ff4d4f',
              backgroundColor: 'transparent'
            }}
            disabled={!userId}
          >
            🗑️ Delete All
          </Button> */}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={getColumns()}
        dataSource={filteredCustomers}
        rowKey="id"
        size={screens.xs ? "small" : "middle"}
        scroll={screens.xs ? { x: true } : undefined}
        className={darkMode ? "dark-table" : ""}
        style={tableStyle}
        locale={{ emptyText: "No clients found" }}
        onRow={(record) => ({
          onClick: () => onSelectCustomer?.(record),
          style: { 
            cursor: "pointer",
            backgroundColor: darkMode 
              ? (selectedRowKeys.includes(record.id) ? "#2a2a2a" : "#1f1f1f") 
              : (selectedRowKeys.includes(record.id) ? "#fafafa" : "#fff"),
            '&:hover': {
              backgroundColor: darkMode ? "#2a2a2a" : "#f5f5f5"
            }
          },
        })}
        components={{
          header: {
            cell: (props) => (
              <th {...props} style={{ 
                backgroundColor: darkMode ? "#1d1d1d" : "#fafafa",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderBottom: darkMode ? "1px solid #444" : "1px solid #f0f0f0"
              }} />
            ),
          },
        }}
      />

      {/* Modal */}
      <Modal
        title="Add New Client"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setFormErrors({ name: "", email: "", phone: "" });
        }}
        onOk={handleSubmit}
        okText="Submit"
        cancelText="Cancel"
        width={screens.xs ? "90%" : 700}
        className={darkMode ? "dark-modal" : ""}
        style={{ top: screens.xs ? "16px" : "50px" }}
        bodyStyle={modalBodyStyle}
        headerStyle={modalHeaderStyle}
        footerStyle={modalFooterStyle}
        okButtonProps={{ disabled: !userId }}
      >
        <div className="row g-3">
          {[ 
            { label: "Name", name: "name", required: true },
            { label: "Email", name: "email", type: "email" },
            { label: "Phone", name: "phone" },
            { label: "Address", name: "address" },
            { label: "Company", name: "company" },
          ].map(({ label, name, type = "text", required = false }) => (
            <div className="col-12" key={name}>
              <label className="form-label" style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>
                {label}
                {required && <span style={{ color: "#ff4d4f" }}> *</span>}
              </label>
              <Input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className={darkMode ? "dark-input" : ""}
                style={inputStyle}
                status={formErrors[name] ? "error" : ""}
              />
              {formErrors[name] && (
                <div style={errorStyle}>{formErrors[name]}</div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <style jsx>{`
        .dark-mode {
          background-color: #141414;
          color: #f1f1f1;
        }
        .dark-text {
          color: #f1f1f1 !important;
        }
        .dark-text-secondary {
          color: #d9d9d9 !important;
        }
        .dark-mobile-card {
          background-color: #1f1f1f;
          border-radius: 4px;
        }
        .dark-input {
          background-color: #2d2d2d;
          color: #f1f1f1;
          border-color: #555;
        }
        .dark-input:hover, .dark-input:focus {
          border-color: #177ddc !important;
        }
        .dark-checkbox .ant-checkbox-inner {
          background-color: #2d2d2d;
          border-color: #555;
        }
        .dark-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #177ddc;
          border-color: #177ddc;
        }
        .dark-table .ant-table {
          background-color: #1f1f1f;
          color: #f1f1f1;
        }
        .dark-table .ant-table-thead > tr > th {
          background-color: #1d1d1d;
          color: #f1f1f1;
          border-bottom-color: #444;
        }
        .dark-table .ant-table-tbody > tr > td {
          background-color: #1f1f1f;
          color: #f1f1f1;
          border-bottom-color: #444;
        }
        .dark-table .ant-table-tbody > tr:hover > td {
          background-color: #2a2a2a !important;
        }
        .dark-modal .ant-modal-content {
          background-color: #1f1f1f;
          color: #f1f1f1;
          border: 1px solid #444;
        }
        .dark-modal .ant-modal-title {
          color: #f1f1f1;
        }
        .dark-modal .ant-modal-close {
          color: #f1f1f1;
        }
        .dark-modal .ant-modal-close:hover {
          color: #177ddc;
        }
      `}</style>
    </div>
  );
};

export default Customers;