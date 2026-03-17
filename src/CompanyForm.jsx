import { SearchOutlined } from "@ant-design/icons";
import { Button, Grid, Input, Modal, Table } from "antd";
import { onValue, push, ref } from "firebase/database";
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
  });

  // Apply dark mode class to the body
  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "";
  }, [darkMode]);

  // Fetch from Firebase
  useEffect(() => {
    const customersRef = ref(db, "customers");
    onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      setCustomers(list);
      setFilteredCustomers(list);
    });
  }, []);

  // Search filter
  useEffect(() => {
    const filtered = customers.filter((cust) =>
      cust.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    try {
      await push(ref(db, "customers"), formData);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        company: "",
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  };

  // Responsive Columns
  const getColumns = () => {
    if (screens.xs) {
      return [
        {
          title: "Client Details",
          dataIndex: "name",
          key: "name",
          render: (_, record) => (
            <div 
              onClick={() => onSelectCustomer(record)}
              style={{ 
                color: darkMode ? '#ffffff' : 'inherit',
                padding: '8px'
              }}
            >
              <strong>{record.name}</strong><br />
              📞 {record.phone}<br />
              ✉️ {record.email}<br />
              🏢 {record.company}<br />
              📍 {record.address}
            </div>
          ),
        },
      ];
    }

    return [
      { 
        title: "Name", 
        dataIndex: "name", 
        key: "name",
        render: (text) => <span style={{ color: darkMode ? '#ffffff' : 'inherit' }}>{text}</span>
      },
      { 
        title: "Email", 
        dataIndex: "email", 
        key: "email",
        render: (text) => <span style={{ color: darkMode ? '#ffffff' : 'inherit' }}>{text}</span>
      },
      { 
        title: "Phone", 
        dataIndex: "phone", 
        key: "phone",
        render: (text) => <span style={{ color: darkMode ? '#ffffff' : 'inherit' }}>{text}</span>
      },
      { 
        title: "Address", 
        dataIndex: "address", 
        key: "address",
        render: (text) => <span style={{ color: darkMode ? '#ffffff' : 'inherit' }}>{text}</span>
      },
      { 
        title: "Company", 
        dataIndex: "company", 
        key: "company",
        render: (text) => <span style={{ color: darkMode ? '#ffffff' : 'inherit' }}>{text}</span>
      },
    ];
  };

  // Styles
  const containerStyle = {
    padding: screens.xs ? "12px" : "24px",
    marginLeft: screens.xs ? "0" : "250px",
    maxWidth: "1100px",
    width: "100%",
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
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
    backgroundColor: 'var(--card-bg)',
    borderRadius: "8px",
    padding: screens.xs ? "8px" : "12px",
    border: '1px solid var(--border-color)'
  };

  const inputStyle = {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text-color)'
  };

  const modalBodyStyle = {
    backgroundColor: 'var(--modal-bg)',
    color: 'var(--text-color)'
  };

  const modalHeaderStyle = {
    backgroundColor: 'var(--modal-bg)',
    color: 'var(--text-color)',
    borderBottom: '1px solid var(--border-color)'
  };

  const modalFooterStyle = {
    backgroundColor: 'var(--modal-bg)',
    borderTop: '1px solid var(--border-color)'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ 
          margin: screens.xs ? "0 0 8px 0" : "0",
          color: 'var(--text-color)'
        }}>Clients List</h2>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexDirection: screens.xs ? "column" : "row",
          }}
        >
          <Input
            placeholder="Search by Name"
            allowClear
            prefix={<SearchOutlined style={{ color: 'var(--text-color)' }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              backgroundColor: 'var(--btn-primary-bg)',
              borderColor: 'var(--btn-primary-bg)'
            }}
          >
            + Add Client
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={getColumns()}
        dataSource={filteredCustomers}
        rowKey="id"
        size={screens.xs ? "small" : "middle"}
        scroll={screens.xs ? { x: true } : undefined}
        style={tableStyle}
        locale={{ emptyText: "No clients found" }}
        onRow={(record) => ({
          onClick: () => onSelectCustomer?.(record),
          style: { 
            cursor: "pointer",
            backgroundColor: 'var(--table-row-odd)',
            '&:nth-child(even)': {
              backgroundColor: 'var(--table-row-even)'
            },
            '&:hover': {
              backgroundColor: 'var(--table-hover)'
            }
          },
        })}
        components={{
          header: {
            cell: (props) => (
              <th {...props} style={{ 
                backgroundColor: 'var(--table-header-bg)',
                color: 'var(--text-color)',
                borderBottom: '1px solid var(--border-color)'
              }} />
            ),
          },
        }}
      />

      {/* Modal */}
      <Modal
        title="Add New Client"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        okText="Submit"
        cancelText="Cancel"
        width={screens.xs ? "90%" : 700}
        style={{ top: screens.xs ? "16px" : "50px" }}
        bodyStyle={modalBodyStyle}
        headerStyle={modalHeaderStyle}
        footerStyle={modalFooterStyle}
      >
        <div className="row g-3">
          {[
            { label: "Name", name: "name" },
            { label: "Email", name: "email", type: "email" },
            { label: "Phone", name: "phone" },
            { label: "Address", name: "address" },
            { label: "Company", name: "company" },
          ].map(({ label, name, type = "text" }) => (
            <div className="col-12" key={name}>
              <label className="form-label" style={{ color: 'var(--text-color)' }}>{label}</label>
              <Input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Customers;