import { DeleteOutlined, EditOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Col, Form, Grid, Input, Modal, notification, Popconfirm, Row, Space, Table } from "antd";
import CryptoJS from "crypto-js";
import { ref as dbRef, onValue, push, remove, update } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import { DarkModeContext } from "./DarkModeContext";
import { db } from "./firebase";

const { useBreakpoint } = Grid;
const SECRET_KEY = "your-strong-secret-key-32-chars";

const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

const decryptData = (encryptedData) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

const DeleteButton = ({ 
  onConfirm, 
  disabled = false, 
  size = 'middle',
  type = 'text',
  danger = true,
  icon = <DeleteOutlined />,
  children,
  placement = 'left'
}) => {
  const { darkMode } = useContext(DarkModeContext);
  
  return (
    <Popconfirm
      title="Are you sure you want to delete?"
      onConfirm={onConfirm}
      okText="Yes"
      cancelText="No"
      placement={placement}
      disabled={disabled}
      overlayClassName={darkMode ? "dark-popconfirm" : ""}
    >
      <Button
        icon={icon}
        danger={danger}
        size={size}
        type={type}
        disabled={disabled}
        className={darkMode ? "dark-button" : ""}
        style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
      >
        {children}
      </Button>
    </Popconfirm>
  );
};

const CompanyList = () => {
  const { darkMode } = useContext(DarkModeContext);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [userId, setUserId] = useState(null);

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const userCompaniesRef = dbRef(db, `users/${userId}/companies`);
    onValue(userCompaniesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const companyList = Object.entries(data).map(([id, value]) => {
        try {
          const decrypted = decryptData(value.encryptedData);
          return { id, ...decrypted };
        } catch (error) {
          console.error("Decryption failed for company:", id, error);
          return { id, name: "Invalid Company Data" };
        }
      });
      setCompanies(companyList);
      setFilteredCompanies(companyList);
    });
  }, [userId]);

  // Search filter
  useEffect(() => {
    const filtered = companies.filter(company =>
      Object.values(company).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      ));
    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  const handleSubmit = (values) => {
    if (!userId) {
      notification.error({
        message: "Error",
        description: "User not authenticated. Please log in again.",
      });
      return;
    }

    setLoading(true);
    const encryptedData = encryptData(values);
    
    if (editingCompany) {
      // Update existing company
      update(dbRef(db, `users/${userId}/companies/${editingCompany.id}`), { encryptedData })
        .then(() => {
          notification.success({
            message: "Success",
            description: "Company updated successfully",
          });
          setIsModalOpen(false);
          form.resetFields();
          setEditingCompany(null);
        })
        .catch((error) => {
          notification.error({
            message: "Error",
            description: "Failed to update company",
          });
          console.error("Error updating company:", error);
        })
        .finally(() => setLoading(false));
    } else {
      // Add new company
      push(dbRef(db, `users/${userId}/companies`), { encryptedData })
        .then(() => {
          notification.success({
            message: "Success",
            description: "Company added successfully",
          });
          setIsModalOpen(false);
          form.resetFields();
        })
        .catch((error) => {
          notification.error({
            message: "Error",
            description: "Failed to add company",
          });
          console.error("Error adding company:", error);
        })
        .finally(() => setLoading(false));
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!userId) {
      notification.error({
        message: "Error",
        description: "User not authenticated. Please log in again.",
      });
      return;
    }

    try {
      await remove(dbRef(db, `users/${userId}/companies/${id}`));
      notification.success({
        message: "Success",
        description: "Company has been deleted successfully.",
      });
      setSelectedRowKeys(selectedRowKeys.filter(key => key !== id));
    } catch (err) {
      console.error("Error deleting company:", err);
      notification.error({
        message: "Error",
        description: "Failed to delete company. Please try again.",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!userId) {
      notification.error({
        message: "Error",
        description: "User not authenticated. Please log in again.",
      });
      return;
    }

    if (selectedRowKeys.length === 0) {
      notification.warning({
        message: "Warning",
        description: "Please select at least one company to delete",
      });
      return;
    }

    setDeleteLoading(true);
    try {
      const deletePromises = selectedRowKeys.map(id => 
        remove(dbRef(db, `users/${userId}/companies/${id}`))
      );
      await Promise.all(deletePromises);
      notification.success({
        message: "Success",
        description: `Deleted ${selectedRowKeys.length} company(s) successfully`,
      });
      setSelectedRowKeys([]);
    } catch (error) {
      console.error("Error deleting companies:", error);
      notification.error({
        message: "Error",
        description: "Failed to delete selected companies",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAllCompanies = async () => {
    if (!userId) {
      notification.error({
        message: "Error",
        description: "User not authenticated. Please log in again.",
      });
      return;
    }

    if (companies.length === 0) {
      notification.info({
        message: "Info",
        description: "There are no companies to delete."
      });
      return;
    }
    
    Modal.confirm({
      title: "Confirm Delete All Companies",
      content: (
        <div className={darkMode ? "dark-modal-content" : ""}>
          <p>Are you sure you want to delete ALL {companies.length} companies?</p>
          <p style={{ color: "#ff4d4f", fontWeight: "bold" }}>This action cannot be undone!</p>
        </div>
      ),
      okText: "Delete All",
      okType: "danger",
      cancelText: "Cancel",
      className: darkMode ? "dark-modal" : "",
      onOk: async () => {
        setLoading(true);
        try {
          await remove(dbRef(db, `users/${userId}/companies`));
          notification.success({
            message: "Success",
            description: `All ${companies.length} companies have been deleted successfully.`,
            duration: 3
          });
          setSelectedRowKeys([]);
        } catch (err) {
          console.error("Error deleting companies:", err);
          notification.error({
            message: "Error",
            description: "Failed to delete companies. Please try again.",
            duration: 3
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    form.setFieldsValue({
      name: company.name,
      contact: company.contact,
      phone: company.phone,
      email: company.email,
      website: company.website
    });
    setIsModalOpen(true);
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const getColumns = () => {
    if (isMobile) {
      return [
        {
          title: "Company",
          dataIndex: "name",
          key: "name",
          render: (text, record) => (
            <div className={`mobile-company-card ${darkMode ? "dark-mobile-card" : ""}`}>
              <div className="mobile-company-name" style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>
                {text}
              </div>
              <div className="mobile-company-details" style={{ color: darkMode ? "#d9d9d9" : "#666" }}>
                {record.contact && <div><strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Contact:</strong> {record.contact}</div>}
                {record.phone && <div><strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Phone:</strong> {record.phone}</div>}
                {record.email && <div><strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Email:</strong> {record.email}</div>}
              </div>
              <Space style={{ marginTop: 8 }}>
                <Button 
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                  size="small"
                  type="text"
                  className={darkMode ? "dark-button" : ""}
                />
                <Popconfirm
                  title="Are you sure to delete this company?"
                  onConfirm={() => handleDeleteCompany(record.id)}
                  okText="Yes"
                  cancelText="No"
                  className={darkMode ? "dark-popconfirm" : ""}
                >
                  <Button 
                    icon={<DeleteOutlined />}
                    size="small" 
                    danger
                    style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
                    className={darkMode ? "dark-button" : ""}
                  />
                </Popconfirm>
              </Space>
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
        width: '20%',
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text}</span>
      },
      { 
        title: "Contact", 
        dataIndex: "contact", 
        key: "contact", 
        width: '20%',
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text || "-"}</span>
      },
      { 
        title: "Phone", 
        dataIndex: "phone", 
        key: "phone", 
        width: '15%',
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text || "-"}</span>
      },
      { 
        title: "Email", 
        dataIndex: "email", 
        key: "email", 
        width: '20%',
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text || "-"}</span>
      },
      {
        title: "Website",
        dataIndex: "website",
        key: "website",
        width: '15%',
        render: (text) =>
          text ? (
            <a
              href={text.startsWith("http") ? text : `https://${text}`}
              target="_blank"
              rel="noopener noreferrer"
              className="website-link"
              style={{ color: darkMode ? "#1890ff" : "#1890ff" }}
            >
              {text}
            </a>
          ) : (
            <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>-</span>
          ),
      },
      {
        title: "Actions",
        key: "actions",
        width: '10%',
        render: (_, record) => (
          <Space>
            <Button 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className={darkMode ? "dark-button" : ""}
            />
            <Popconfirm
              title="Are you sure to delete this company?"
              onConfirm={() => handleDeleteCompany(record.id)}
              okText="Yes"
              cancelText="No"
              className={darkMode ? "dark-popconfirm" : ""}
            >
              <Button 
                icon={<DeleteOutlined />}
                danger
                style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
                className={darkMode ? "dark-button" : ""}
              />
            </Popconfirm>
          </Space>
        ),
      },
    ];
  };

  return (
    <div className={`company-list-container ${darkMode ? "dark-mode" : ""}`} style={{ 
      padding: isMobile ? "16px" : "24px",
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: darkMode ? "#141414" : "#f8f9fa",
      color: darkMode ? "#f1f1f1" : "inherit",
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
      marginLeft: isMobile ? '0' : '200px',
      transition: 'margin-left 0.3s ease'
    }}>
      <div className="company-list-header" style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        marginBottom: '24px',
        gap: isMobile ? '16px' : '24px',
        width: '100%'
      }}>
        <h2 className="company-list-title" style={{ 
          margin: 0,
          fontSize: isMobile ? '1.5rem' : '1.8rem',
          color: darkMode ? "#f1f1f1" : "inherit",
          textAlign: isMobile ? 'center' : 'left',
          width: isMobile ? '100%' : 'auto'
        }}>Company List</h2>
        <div className="company-list-actions" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px',
          width: isMobile ? '100%' : 'auto'
        }}>
          <Input
            placeholder="Search companies"
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={darkMode ? "dark-input" : ""}
            style={{ 
              width: isMobile ? '100%' : '250px',
              backgroundColor: darkMode ? "#2d2d2d" : "#fff",
              color: darkMode ? "#f1f1f1" : "inherit",
              borderColor: darkMode ? "#555" : "#d9d9d9"
            }}
          />
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            flexDirection: isMobile ? 'row' : 'row',
            width: isMobile ? '100%' : 'auto',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
              className={darkMode ? "dark-button" : ""}
              style={{ width: isMobile ? 'auto' : 'auto' }}
            />
            <Button 
              type="primary" 
              onClick={handleAddCompany}
              style={{
                width: isMobile ? 'auto' : 'auto',
                padding: '0 16px',
                backgroundColor: darkMode ? "#177ddc" : "#1890ff",
                borderColor: darkMode ? "#177ddc" : "#1890ff"
              }}
            >
              + Add Company
            </Button>
            <Button
              danger
              onClick={handleDeleteAllCompanies}
              loading={loading}
              style={{
                width: isMobile ? 'auto' : 'auto',
                padding: '0 16px',
                backgroundColor: darkMode ? "#d9363e" : "#ff4d4f",
                borderColor: darkMode ? "#d9363e" : "#ff4d4f"
              }}
            >
              Delete All
            </Button>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} selected company(s)?`}
                onConfirm={handleDeleteSelected}
                okText="Yes"
                cancelText="No"
                className={darkMode ? "dark-popconfirm" : ""}
              >
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteLoading}
                  style={{
                    width: isMobile ? 'auto' : 'auto',
                    padding: '0 16px',
                    backgroundColor: darkMode ? "#d9363e" : "#ff4d4f",
                    borderColor: darkMode ? "#d9363e" : "#ff4d4f",
                    color: '#fff'
                  }}
                >
                  Delete Selected ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </div>

      <div className="company-table-container" style={{
        overflowX: 'auto',
        borderRadius: '8px',
        boxShadow: darkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        width: '100%',
        margin: '0 auto'
      }}>
        <Table
          columns={getColumns()}
          dataSource={filteredCompanies}
          rowKey="id"
          scroll={{ x: true }}
          pagination={{
            pageSize: isMobile ? 5 : 10,
            showSizeChanger: false,
            style: {
              marginRight: isMobile ? 0 : 16,
              padding: isMobile ? '0 8px' : '0 16px'
            }
          }}
          className={darkMode ? "dark-table" : ""}
          style={{ 
            backgroundColor: darkMode ? "#1f1f1f" : "#fff",
            color: darkMode ? "#f1f1f1" : "inherit",
            width: '100%'
          }}
          rowSelection={isMobile ? undefined : rowSelection}
          onRow={(record) => ({
            style: { 
              backgroundColor: selectedRowKeys.includes(record.id) 
                ? (darkMode ? "#2a2a2a" : "#fafafa") 
                : (darkMode ? "#1f1f1f" : "#fff")
            },
          })}
        />
      </div>

      <Modal
        title={editingCompany ? "Edit Company" : "Add New Company"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingCompany(null);
        }}
        footer={null}
        destroyOnClose
        width={isMobile ? '90%' : '50%'}
        className={darkMode ? "dark-modal" : ""}
        style={{
          top: 20,
          transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)'
        }}
        bodyStyle={{
          padding: '24px',
          transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
          backgroundColor: darkMode ? "#1f1f1f" : "#fff",
          color: darkMode ? "#f1f1f1" : "inherit"
        }}
        headerStyle={{
          backgroundColor: darkMode ? "#1f1f1f" : "#fff",
          color: darkMode ? "#f1f1f1" : "inherit",
          borderBottomColor: darkMode ? "#444" : "#f0f0f0"
        }}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="name"
                label="Company Name"
                rules={[
                  { required: true, message: 'Please enter company name' },
                  { 
                    pattern: /^[a-zA-Z\s]+$/, 
                    message: 'Company name can only contain letters and spaces' 
                  }
                ]}
              >
                <Input 
                  placeholder="Enter company name" 
                  className={darkMode ? "dark-input" : ""}
                  style={{
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="contact"
                label="Contact Person"
                rules={[
                  { required: true, message: 'Please enter contact person' },
                  { 
                    pattern: /^[a-zA-Z\s]+$/, 
                    message: 'Contact person can only contain letters and spaces' 
                  }
                ]}
              >
                <Input 
                  placeholder="Enter contact person" 
                  className={darkMode ? "dark-input" : ""}
                  style={{
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { required: true, message: 'Please enter phone number' },
                  { 
                    pattern: /^[0-9]{10}$/, 
                    message: 'Please enter exactly 10 digits' 
                  }
                ]}
              >
                <Input 
                  placeholder="Enter phone number (10 digits)" 
                  className={darkMode ? "dark-input" : ""}
                  style={{
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                  maxLength={10}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { 
                    type: 'email', 
                    message: 'Please enter a valid email' 
                  },
                  {
                    validator: (_, value) => {
                      if (!value || value === value.toLowerCase()) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Email must be in lowercase'));
                    }
                  }
                ]}
              >
                <Input 
                  placeholder="Enter email (lowercase)" 
                  className={darkMode ? "dark-input" : ""}
                  style={{
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                  onInput={(e) => {
                    e.target.value = e.target.value.toLowerCase();
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="website"
                label="Website"
                rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
              >
                <Input 
                  placeholder="Enter website URL (https://)" 
                  className={darkMode ? "dark-input" : ""}
                  style={{
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Button 
                onClick={() => {
                  setIsModalOpen(false);
                  form.resetFields();
                  setEditingCompany(null);
                }} 
                style={{ marginRight: 8 }}
                className={darkMode ? "dark-button" : ""}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
                style={{
                  backgroundColor: darkMode ? "#177ddc" : "#1890ff",
                  borderColor: darkMode ? "#177ddc" : "#1890ff"
                }}
              >
                {editingCompany ? "Update Company" : "Add Company"}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      <style>{`
        .company-list-container {
          transition: all 0.3s ease;
        }
        
        .dark-mode {
          background-color: #141414;
          color: #f1f1f1;
        }
        
        .dark-input {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-input::placeholder {
          color: #8c8c8c !important;
        }
        
        .dark-input:hover, .dark-input:focus {
          border-color: #177ddc !important;
        }
        
        .dark-table .ant-table {
          background-color: #1f1f1f !important;
          color: #f1f1f1 !important;
        }
        
        .dark-table .ant-table-thead > tr > th {
          background-color: #1d1d1d !important;
          color: #f1f1f1 !important;
          border-bottom-color: #444 !important;
        }
        
        .dark-table .ant-table-tbody > tr > td {
          background-color: #1f1f1f !important;
          color: #f1f1f1 !important;
          border-bottom-color: #444 !important;
        }
        
        .dark-table .ant-table-tbody > tr:hover > td {
          background-color: #2a2a2a !important;
        }
        
        .dark-modal .ant-modal-content {
          background-color: #1f1f1f !important;
          color: #f1f1f1 !important;
          border: 1px solid #444 !important;
        }
        
        .dark-modal .ant-modal-title {
          color: #f1f1f1 !important;
        }
        
        .dark-modal .ant-modal-close {
          color: #f1f1f1 !important;
        }
        
        .dark-modal .ant-modal-close:hover {
          color: #177ddc !important;
        }
        
        .dark-modal-content {
          color: #f1f1f1 !important;
        }
        
        .dark-mobile-card {
          background-color: #1f1f1f !important;
          border-color: #444 !important;
        }
        
        .dark-button {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-button:hover {
          color: #177ddc !important;
          border-color: #177ddc !important;
        }
        
        .dark-popconfirm .ant-popover-inner {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border: 1px solid #555 !important;
        }
        
        .dark-popconfirm .ant-popover-title {
          color: #f1f1f1 !important;
          border-bottom-color: #555 !important;
        }
        
        .dark-popconfirm .ant-popover-message {
          color: #f1f1f1 !important;
        }
        
        .website-link:hover {
          text-decoration: underline;
        }
        
        .mobile-company-card {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 8px;
          border: 1px solid #f0f0f0;
          background-color: #fff;
        }
        
        .dark-mode .mobile-company-card {
          border-color: #444;
          background-color: #1f1f1f;
        }
        
        .mobile-company-name {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
        }
        
        .mobile-company-details {
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .ant-table-selection-column {
          padding-right: 8px !important;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .company-list-container {
            padding: 16px 12px !important;
            margin-left: 0 !important;
          }
          
          .company-list-header {
            flex-direction: column;
            align-items: stretch !important;
          }
          
          .company-list-title {
            text-align: center !important;
            margin-bottom: 16px !important;
          }
          
          .company-list-actions {
            width: 100% !important;
          }
          
          .company-table-container {
            margin: 0 !important;
            width: 100%;
          }
          
          .ant-table-wrapper {
            width: 100%;
          }
          
          .ant-table {
            width: 100% !important;
          }
          
          .ant-table-container {
            width: 100% !important;
          }
          
          .ant-table-content {
            width: 100% !important;
          }
        }
        
        @media (min-width: 769px) {
          .company-list-container {
            margin-left: 200px !important;
            width: calc(100% - 200px) !important;
          }
        }
        
        @media (min-width: 1200px) {
          .company-list-container {
            margin-left: 250px !important;
            width: calc(100% - 250px) !important;
          }
        }
        
        @media (max-width: 576px) {
          .company-list-container {
            padding: 12px 8px !important;
          }
          
          .company-list-title {
            font-size: 1.3rem !important;
          }
          
          .ant-btn {
            font-size: 14px;
          }
          
          .mobile-company-card {
            padding: 10px;
          }
          
          .mobile-company-name {
            fontSize: 15px;
          }
          
          .mobile-company-details {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default CompanyList;