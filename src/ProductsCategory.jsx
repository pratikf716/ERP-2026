import { SearchOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Grid, Input, Modal, Table, message, Popconfirm, Space } from "antd";
import { onValue, push, ref, remove, update } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import { DarkModeContext } from "./DarkModeContext";
import { db } from "./firebase";

const { useBreakpoint } = Grid;

const ProductsCategory = () => {
  const { darkMode } = useContext(DarkModeContext);
  const screens = useBreakpoint();
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: ""
  });
  const [editId, setEditId] = useState(null);
  const [userId, setUserId] = useState(null);

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Fetch from Firebase under user's path
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const userCategoriesRef = ref(db, `users/${userId}/categories`);
    onValue(userCategoriesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      setCategories(list);
      setFilteredCategories(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      message.error("Failed to load categories");
      setLoading(false);
    });
  }, [userId]);

  // Search filter
  useEffect(() => {
    const filtered = categories.filter(category =>
      Object.values(category).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!userId) {
      message.error("User not authenticated. Please log in again.");
      return;
    }

    if (!formData.name.trim()) {
      message.error("Category name is required");
      return;
    }

    // ✅ Validation: Name should only contain letters and spaces
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(formData.name.trim())) {
      message.error("Category name must contain only letters and spaces");
      return;
    }

    try {
      setLoading(true);
      if (editId) {
        await update(ref(db, `users/${userId}/categories/${editId}`), formData);
        message.success("Category updated successfully");
      } else {
        await push(ref(db, `users/${userId}/categories`), formData);
        message.success("Category added successfully");
      }
      setFormData({
        name: "",
        description: "",
        category: ""
      });
      setEditId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving category:", error);
      message.error("Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!userId) {
      message.error("User not authenticated. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      await remove(ref(db, `users/${userId}/categories/${id}`));
      message.success("Category deleted successfully");
    } catch (error) {
      console.error('Error deleting category:', error);
      message.error("Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!userId) {
      message.error("User not authenticated. Please log in again.");
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.warning("Please select at least one category to delete");
      return;
    }

    try {
      setLoading(true);
      const deletePromises = selectedRowKeys.map(id => 
        remove(ref(db, `users/${userId}/categories/${id}`))
      );
      await Promise.all(deletePromises);
      message.success(`Deleted ${selectedRowKeys.length} category(s)`);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Error deleting categories:', error);
      message.error("Failed to delete selected categories");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditId(category.id);
    setFormData({
      name: category.name,
      description: category.description,
      category: category.category
    });
    setIsModalOpen(true);
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INvert,
      Table.SELECTION_NONE,
    ],
  };

  const getColumns = () => {
    if (screens.xs) {
      return [
        {
          title: "Category",
          dataIndex: "name",
          key: "name",
          render: (_, record) => (
            <div className={`mobile-category-card ${darkMode ? "dark-mobile-card" : ""}`}>
              <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>🏷 {record.name}</strong><br />
              <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>📝 {record.description || 'N/A'}</span><br />
              <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>🗂 {record.category || 'N/A'}</span>
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Button 
                    icon={<EditOutlined />} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(record);
                    }}
                    size="small"
                    className={darkMode ? "dark-button" : ""}
                  />
                  <Popconfirm
                    title="Are you sure to delete this category?"
                    onConfirm={() => handleDelete(record.id)}
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
        render: (name) => <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>🏷 {name}</strong>
      },
      { 
        title: "Description", 
        dataIndex: "description", 
        key: "description", 
        render: (description) => <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>{description || 'N/A'}</span> 
      },
      { 
        title: "Category", 
        dataIndex: "category", 
        key: "category", 
        render: (category) => <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>{category || 'N/A'}</span> 
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
          <Space>
            <Button 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
              className={darkMode ? "dark-button" : ""}
            />
            <Popconfirm
              title="Are you sure to delete this category?"
              onConfirm={() => handleDelete(record.id)}
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
    <div className={`category-container ${darkMode ? "dark-mode" : ""}`} style={{ 
      padding: screens.xs ? "16px" : "24px 24px 24px 120px",
      maxWidth: '1400px',
      margin: '0 auto',
      marginLeft: screens.xs ? '0' : '180px',
      backgroundColor: darkMode ? "#141414" : "#f8f9fa",
      color: darkMode ? "#f1f1f1" : "inherit",
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="category-header" style={{
        display: 'flex',
        flexDirection: screens.xs ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: screens.xs ? 'center' : 'center',
        marginBottom: '24px',
        gap: screens.xs ? '16px' : '24px'
      }}>
        <h2 className="category-title" style={{ 
          margin: 0,
          fontSize: screens.xs ? '1.5rem' : '1.8rem',
          color: darkMode ? "#f1f1f1" : "inherit",
          textAlign: screens.xs ? 'center' : 'left',
          width: screens.xs ? '100%' : 'auto'
        }}>Product Categories</h2>
        <div className="category-actions" style={{
          display: 'flex',
          flexDirection: screens.xs ? 'column' : 'row',
          gap: '12px',
          width: screens.xs ? '100%' : 'auto'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: screens.xs ? 'row' : 'row',
            gap: '8px',
            width: screens.xs ? '100%' : 'auto',
            alignItems: screens.xs ? 'center' : 'stretch'
          }}>
            <Input
              placeholder="Search categories..."
              allowClear
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={darkMode ? "dark-input" : ""}
              style={{ 
                flex: screens.xs ? '1' : 'none',
                width: screens.xs ? '100%' : '250px',
                backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
              className={darkMode ? "dark-button" : ""}
              style={screens.xs ? { flex: '0 0 auto' } : {}}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            flexDirection: screens.xs ? 'column' : 'row',
            width: screens.xs ? '100%' : 'auto'
          }}>
            <Button 
              type="primary" 
              onClick={() => setIsModalOpen(true)}
              style={{
                flex: screens.xs ? 1 : 'none',
                padding: '0 24px',
                backgroundColor: darkMode ? "#177ddc" : "#1890ff",
                borderColor: darkMode ? "#177ddc" : "#1890ff"
              }}
            >
              + Add Category
            </Button>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} selected category(s)?`}
                onConfirm={handleDeleteSelected}
                okText="Yes"
                cancelText="No"
                className={darkMode ? "dark-popconfirm" : ""}
              >
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  style={{
                    flex: screens.xs ? 1 : 'none',
                    padding: '0 24px',
                    backgroundColor: darkMode ? "#d9363e" : "#ff4d4f",
                    borderColor: darkMode ? "#d9363e" : "#ff4d4f",
                    color: '#fff'
                  }}
                >
                  Delete Selected
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="category-table-container" style={{
        overflowX: 'auto',
        borderRadius: '8px',
        boxShadow: darkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginRight: screens.xs ? '0' : '20px'
      }}>
        <Table
          columns={getColumns()}
          dataSource={filteredCategories}
          rowKey="id"
          scroll={{ x: true }}
          pagination={{
            pageSize: screens.xs ? 5 : 10,
            showSizeChanger: false,
          }}
          loading={loading}
          className={darkMode ? "dark-table" : ""}
          style={{ 
            backgroundColor: darkMode ? "#1f1f1f" : "#fff",
            color: darkMode ? "#f1f1f1" : "inherit"
          }}
          rowSelection={screens.xs ? undefined : rowSelection}
          onRow={(record) => ({
            style: { 
              backgroundColor: selectedRowKeys.includes(record.id) 
                ? (darkMode ? "#2a2a2a" : "#fafafa") 
                : (darkMode ? "#1f1f1f" : "#fff")
            },
          })}
        />
      </div>

      {/* Modal */}
      <Modal
        title={editId ? "Edit Category" : "Add New Category"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditId(null);
          setFormData({ name: "", description: "", category: "" });
        }}
        onOk={handleSubmit}
        okText={editId ? "Update" : "Submit"}
        cancelText="Cancel"
        width={screens.xs ? "90%" : "700px"}
        className={darkMode ? "dark-modal" : ""}
        style={{ top: screens.xs ? "16px" : "50px" }}
        confirmLoading={loading}
        bodyStyle={{
          backgroundColor: darkMode ? "#1f1f1f" : "#fff",
          color: darkMode ? "#f1f1f1" : "inherit"
        }}
        headerStyle={{
          backgroundColor: darkMode ? "#1f1f1f" : "#fff",
          color: darkMode ? "#f1f1f1" : "inherit",
          borderBottomColor: darkMode ? "#444" : "#f0f0f0"
        }}
        footerStyle={{
          borderTopColor: darkMode ? "#444" : "#f0f0f0"
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: "Name", name: "name", required: true },
            { label: "Description", name: "description" },
            { label: "Category", name: "category" }
          ].map(({ label, name, required = false }) => (
            <div key={name}>
              <label style={{ 
                color: darkMode ? "#f1f1f1" : "inherit", 
                display: 'block', 
                marginBottom: '8px' 
              }}>
                {label} {required && <span style={{ color: 'red' }}>*</span>}
              </label>
              <Input
                name={name}
                placeholder={`Enter ${label}`}
                value={formData[name]}
                onChange={handleChange}
                required={required}
                className={darkMode ? "dark-input" : ""}
                style={{
                  backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                  color: darkMode ? "#f1f1f1" : "inherit",
                  borderColor: darkMode ? "#555" : "#d9d9d9"
                }}
              />
            </div>
          ))}
        </div>
      </Modal>

      


      <style>{`
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
        
        .dark-button {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-button:hover {
          color: #177ddc !important;
          border-color: #177ddc !important;
        }
        
        .dark-mobile-card {
          background-color: #1f1f1f !important;
          border-color: #444 !important;
        }
        
        .mobile-category-card {
          padding: 8px;
          border-radius: 4px;
          margin: 4px 0;
        }
        
        @media (max-width: 576px) {
          .category-container {
            padding: 16px !important;
            margin-left: 0 !important;
          }
          
          .category-header {
            align-items: center !important;
          }
          
          .category-title {
            text-align: center !important;
            width: 100% !important;
          }
          
          .category-actions {
            width: 100% !important;
          }
          
          .category-table-container {
            margin-right: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductsCategory;