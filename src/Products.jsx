import { DeleteOutlined, EditOutlined, EyeOutlined, LinkOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Grid, Input, message, Modal, Popconfirm, Radio, Select, Space, Table, Tag, Upload } from "antd";
import { onValue, push, ref, remove, update } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import { DarkModeContext } from "./DarkModeContext";
import { db } from "./firebase";

const { useBreakpoint } = Grid;

// Reusable Delete Button Component
const DeleteButton = ({ 
  onConfirm, 
  disabled = false, 
  size = 'middle',
  type = 'default', // use default instead of text for better styling
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

const Products = () => {
  const { darkMode } = useContext(DarkModeContext);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState("upload");
  const [editingId, setEditingId] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [userId, setUserId] = useState(null);
  const [form] = Form.useForm();

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Fetch products from Firebase under user's path
  useEffect(() => {
    if (!userId) return;

    const userProductsRef = ref(db, `users/${userId}/products`);
    const unsubscribe = onValue(userProductsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map((key) => ({ 
        id: key, 
        ...data[key] 
      })) : [];
      setProducts(list);
      setFilteredProducts(list);
    }, (error) => {
      console.error("Error fetching products:", error);
      message.error("Failed to load products");
    });
    return () => unsubscribe();
  }, [userId]);

  // Filter by search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter((product) =>
      Object.values(product).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Upload image to Cloudinary
  const handleImageUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ml_default");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dzixkdxa0/image/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || "Upload failed");
      }

      setImageUrl(data.secure_url);
      message.success("Image uploaded successfully");
      onSuccess(data.secure_url);
    } catch (err) {
      console.error("Upload Error:", err);
      message.error("Image upload failed");
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  // Submit form
  const handleSubmit = async (values) => {
    if (!userId) {
      message.error("User not authenticated. Please log in again.");
      return;
    }

    if (!imageUrl) {
      message.error("Please select or enter an image.");
      return;
    }

    setSubmitting(true);
    const productData = {
      ...values,
      image: imageUrl,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await update(ref(db, `users/${userId}/products/${editingId}`), productData);
        message.success("Product updated successfully");
      } else {
        await push(ref(db, `users/${userId}/products`), productData);
        message.success("Product added successfully");
      }
      
      form.resetFields();
      setImageUrl("");
      setImageMode("upload");
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Submit error:", err);
      message.error(err.message || (editingId ? 
        "Error updating product" : "Error adding product"));
    } finally {
      setSubmitting(false);
    }
  };

  // Edit product
  const handleEdit = (product) => {
    setEditingId(product.id);
    setImageUrl(product.image || "");
    setImageMode(product.image?.startsWith("http") ? "url" : "upload");
    form.setFieldsValue({
      name: product.name,
      category: product.category,
      price: product.price,
      ref: product.ref,
      currency: product.currency,
      description: product.description,
    });
    setIsModalOpen(true);
  };

  // View product details
  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  // Delete product
  const handleDelete = async (id) => {
    if (!userId) {
      message.error("User not authenticated. Please log in again.");
      return;
    }

    try {
      await remove(ref(db, `users/${userId}/products/${id}`));
      message.success("Product deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      message.error("Error deleting product");
    }
  };

  // Delete all products
  const handleDeleteAll = async () => {
    if (!userId) {
      message.error("User not authenticated. Please log in again.");
      return;
    }

    if (products.length === 0) {
      message.info("No products to delete");
      return;
    }

    Modal.confirm({
      title: 'Delete All Products',
      content: 'Are you sure you want to delete ALL products? This action cannot be undone.',
      okText: 'Delete All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const productsRef = ref(db, `users/${userId}/products`);
          await remove(productsRef);
          message.success("All products have been deleted successfully");
        } catch (err) {
          console.error("Error deleting all products:", err);
          message.error("Failed to delete all products");
        }
      },
      maskClosable: true,
      centered: true,
      className: darkMode ? "dark-modal" : "",
    });
  };

  // Delete selected products
  const handleDeleteSelected = async () => {
    if (!userId) {
      message.error("User not authenticated. Please log in again.");
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.warning("Please select at least one product to delete");
      return;
    }

    try {
      const deletePromises = selectedRowKeys.map(id => 
        remove(ref(db, `users/${userId}/products/${id}`))
      );
      await Promise.all(deletePromises);
      message.success(`Deleted ${selectedRowKeys.length} product(s)`);
      setSelectedRowKeys([]);
    } catch (err) {
      console.error("Error deleting selected products:", err);
      message.error("Failed to delete selected products");
    }
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

  // Responsive table columns
  const getColumns = () => {
    const columns = [
      {
        title: "Image",
        dataIndex: "image",
        responsive: ['md'],
        render: (img) => img ? (
          <img 
            src={img} 
            alt="product" 
            style={{ 
              width: 40, 
              height: 40, 
              objectFit: 'cover',
              borderRadius: 4 
            }} 
          />
        ) : "N/A",
      },
      { 
        title: "Name", 
        dataIndex: "name",
        ellipsis: true,
        render: (text, record) => (
          <Button 
            type="text" 
            onClick={() => handleViewDetails(record)}
            className={darkMode ? "dark-button" : ""}
            style={{ 
              padding: 0,
              fontWeight: 500,
              color: darkMode ? "#f1f1f1" : "inherit",
              border: 'none',
              boxShadow: 'none'
            }}
          >
            {text}
          </Button>
        ),
      },
      { 
        title: "Category", 
        dataIndex: "category",
        responsive: ['md'],
        render: (text) => <Tag color="blue">{text}</Tag>,
      },
      {
        title: "Price",
        dataIndex: "price",
        responsive: ['sm'],
        render: (val, record) => (
          <span style={{ whiteSpace: 'nowrap', fontWeight: 500, color: darkMode ? "#f1f1f1" : "inherit" }}>
            {val} {record.currency || ""}
          </span>
        ),
      },
      { 
        title: "Ref", 
        dataIndex: "ref",
        responsive: ['lg'],
        render: (text) => <Tag>{text}</Tag>,
      },
      {
        title: "Actions",
        dataIndex: "actions",
        fixed: isMobile ? 'right' : false,
        width: isMobile ? 100 : undefined,
        render: (_, record) => (
          <Space size="small">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
              type="text"
              className={darkMode ? "dark-button" : ""}
            />
            <DeleteButton 
              onConfirm={() => handleDelete(record.id)}
             icon={<DeleteOutlined />}
                style={{ 
                  color: '#ff4d4f', 
                  borderColor: '#ff4d4f',
                  flex: isMobile ? 1 : 'none',
                  minWidth: isMobile ? 'auto' : 'auto'
                }}
            />
          </Space>
        ),
      },
    ];

    return columns;
  };

  // Mobile card view
  const MobileProductCard = ({ product }) => (
    <Card 
      key={product.id}
      className={darkMode ? "dark-card" : ""}
      style={{ 
        marginBottom: 16,
        backgroundColor: darkMode ? "#1f1f1f" : "#fff",
        borderColor: darkMode ? "#444" : "#f0f0f0"
      }}
      cover={
        product.image && (
          <img 
            src={product.image} 
            alt={product.name}
            style={{
              height: 160,
              objectFit: 'cover'
            }}
          />
        )
      }
      actions={[
        <Button 
          icon={<EyeOutlined />} 
          onClick={() => handleViewDetails(product)}
          type="text"
          className={darkMode ? "dark-button" : ""}
        />,
        <Button 
          icon={<EditOutlined />} 
          onClick={() => handleEdit(product)}
          type="text"
          className={darkMode ? "dark-button" : ""}
        />,
        <DeleteButton 
          onConfirm={() => handleDelete(product.id)}
          icon={<DeleteOutlined />}
                style={{ 
                  color: '#ff4d4f', 
                  borderColor: '#ff4d4f',
                  flex: isMobile ? 1 : 'none',
                  minWidth: isMobile ? 'auto' : 'auto'
                }}
        />
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ 
            fontWeight: 600, 
            fontSize: 16, 
            color: darkMode ? "#f1f1f1" : "inherit" 
          }}>
            {product.name}
          </span>
          <span style={{ 
            fontWeight: 600, 
            color: darkMode ? "#f1f1f1" : "inherit" 
          }}>
            {product.price} {product.currency}
          </span>
        </div>
        <Tag color="blue">{product.category}</Tag>
        {product.ref && <Tag>Ref: {product.ref}</Tag>}
      </div>
    </Card>
  );

  return (
    <div
      className={darkMode ? "dark-mode" : ""}
      style={{
        padding: isMobile ? "12px" : "24px", 
        maxWidth: 1100, 
        marginLeft: isMobile ? 0 : 250,
        backgroundColor: darkMode ? "#141414" : "#f8f9fa",
        color: darkMode ? "#f1f1f1" : "inherit",
        minHeight: '100vh'
      }}
    >
      <Space 
        direction="vertical" 
        style={{ width: '100%' }}
        size="middle"
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          width: '100%'
        }}>
          <h2 style={{ 
            margin: 0,
            fontSize: isMobile ? '20px' : '24px',
            color: darkMode ? "#f1f1f1" : "inherit",
            width: isMobile ? '100%' : 'auto',
            textAlign: isMobile ? 'center' : 'left'
          }}>
            Products List
          </h2>
          
          {/* Search row for mobile */}
          <div style={{ 
            width: '100%', 
            display: isMobile ? 'block' : 'none',
            marginBottom: isMobile ? 16 : 0
          }}>
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={darkMode ? "dark-input" : ""}
              style={{ 
                width: '100%',
                backgroundColor: darkMode ? "#2d2d2d" : "white",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
              allowClear
            />
          </div>
          
          {/* Action buttons row for mobile */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'row' : 'row',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            width: isMobile ? '100%' : 'auto',
            gap: isMobile ? 8 : 16,
            flexWrap: 'wrap'
          }}>
            {/* Search for desktop */}
            <div style={{ 
              display: isMobile ? 'none' : 'block'
            }}>
              <Input
                placeholder="Search..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={darkMode ? "dark-input" : ""}
                style={{ 
                  width: 200,
                  backgroundColor: darkMode ? "#2d2d2d" : "white",
                  color: darkMode ? "#f1f1f1" : "inherit",
                  borderColor: darkMode ? "#555" : "#d9d9d9"
                }}
                allowClear
              />
            </div>
            
            <Button 
  type="primary"
  onClick={() => {
    form.resetFields();
    setImageUrl("");
    setImageMode("upload");
    setEditingId(null);
    setIsModalOpen(true);
  }}
  icon={isMobile ? <UploadOutlined /> : null}
  style={{
    flex: isMobile ? 1 : 'none',
    minWidth: isMobile ? 'auto' : 'auto',
    backgroundColor: "#1890ff", // 🔵 Blue background
    borderColor: "#1890ff",     // Match border
    color: "#fff",              // White text
    fontWeight: 500,
  }}
>
  {isMobile ? 'Add' : 'Add Product'}
</Button>

            
            {selectedRowKeys.length > 0 ? (
              <DeleteButton 
                onConfirm={handleDeleteSelected}
                danger
                type="default"
                icon={<DeleteOutlined />}
                style={{
                  flex: isMobile ? 1 : 'none',
                  minWidth: isMobile ? 'auto' : 'auto'
                }}
              >
                {isMobile ? `Delete (${selectedRowKeys.length})` : `Delete Selected (${selectedRowKeys.length})`}
              </DeleteButton>
            ) : (
              <Button 
                danger
                onClick={handleDeleteAll}
                disabled={products.length === 0}
                icon={<DeleteOutlined />}
                style={{ 
                  color: '#ff4d4f', 
                  borderColor: '#ff4d4f',
                  flex: isMobile ? 1 : 'none',
                  minWidth: isMobile ? 'auto' : 'auto'
                }}
              >
                {isMobile ? 'Delete All' : 'Delete All Products'}
              </Button>
            )}
          </div>
        </div>

        {isMobile ? (
          <div>
            {filteredProducts.map(product => (
              <MobileProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Table
            columns={getColumns()}
            dataSource={filteredProducts}
            rowKey="id"
            scroll={{ x: true }}
            size="middle"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              responsive: true
            }}
            className={darkMode ? "dark-table" : ""}
            style={{
              overflowX: 'auto',
              width: '100%',
              backgroundColor: darkMode ? "#1f1f1f" : "white",
              borderColor: darkMode ? "#444" : "#f0f0f0"
            }}
            rowSelection={rowSelection}
            onRow={(record) => ({
              style: { 
                backgroundColor: selectedRowKeys.includes(record.id) 
                  ? (darkMode ? "#2a2a2a" : "#fafafa") 
                  : (darkMode ? "#1f1f1f" : "#fff")
              },
            })}
          />
        )}
      </Space>

      {/* Add/Edit Product Modal */}
      <Modal
        title={editingId ? "Edit Product" : "Add Product"}
        open={isModalOpen}
        onCancel={() => {
          form.resetFields();
          setImageUrl("");
          setImageMode("upload");
          setEditingId(null);
          setIsModalOpen(false);
        }}
        onOk={() => form.submit()}
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        width={isMobile ? '90%' : 700}
        style={{ top: isMobile ? 20 : 50 }}
        className={darkMode ? "dark-modal" : ""}
        bodyStyle={{
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: isMobile ? '16px 8px' : '24px',
          backgroundColor: darkMode ? "#1f1f1f" : "white",
          color: darkMode ? "#f1f1f1" : "inherit"
        }}
        headerStyle={{
          backgroundColor: darkMode ? "#1f1f1f" : "white",
          color: darkMode ? "#f1f1f1" : "inherit",
          borderBottomColor: darkMode ? "#444" : "#f0f0f0"
        }}
        footerStyle={{
          borderTopColor: darkMode ? "#444" : "#f0f0f0"
        }}
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item label="Image Input Mode" style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>
            <Radio.Group
              value={imageMode}
              onChange={(e) => {
                setImageMode(e.target.value);
                setImageUrl("");
              }}
              buttonStyle="solid"
              size={isMobile ? 'small' : 'middle'}
              className={darkMode ? "dark-radio-group" : ""}
            >
              <Radio.Button value="upload">Upload</Radio.Button>
              <Radio.Button value="url">URL</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {imageMode === "upload" ? (
            <Form.Item label="Upload Image" style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>
              <Upload
                name="file"
                customRequest={handleImageUpload}
                showUploadList="false"
                accept="image/*"
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith("image/");
                  const isLt2M = file.size / 1024 / 1024 < 2;
                  if (!isImage) {
                    message.error("Only image files are allowed");
                    return Upload.LIST_IGNORE;
                  }
                  if (!isLt2M) {
                    message.error("Image must be less than 2MB");
                    return Upload.LIST_IGNORE;
                  }
                  return true;
                }}
              >
                <Button 
                  icon={<UploadOutlined />} 
                  loading={uploading}
                  block={isMobile}
                  className={darkMode ? "dark-button" : ""}
                  style={{
                    backgroundColor: darkMode ? "#2d2d2d" : "white",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                >
                  {uploading ? "Uploading..." : "Select Image"}
                </Button>
              </Upload>
            </Form.Item>
          ) : (
            <Form.Item
              label="Image URL"
              name="image"
              style={{ color: darkMode ? "#f1f1f1" : "inherit" }}
              rules={[{ required: true, message: "Please enter an image URL" }]}
            >
              <Input
                placeholder="Enter image URL"
                prefix={<LinkOutlined />}
                onChange={(e) => setImageUrl(e.target.value)}
                value={imageUrl}
                className={darkMode ? "dark-input" : ""}
                style={{
                  backgroundColor: darkMode ? "#2d2d2d" : "white",
                  color: darkMode ? "#f1f1f1" : "inherit",
                  borderColor: darkMode ? "#555" : "#d9d9d9"
                }}
              />
            </Form.Item>
          )}

          {imageUrl && (
            <div style={{ textAlign: 'center', margin: '12px 0' }}>
              <img
                src={imageUrl}
                alt="Preview"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 200,
                  borderRadius: 4
                }}
              />
            </div>
          )}

          <Form.Item 
            label="Name" 
            name="name" 
            style={{ color: darkMode ? "#f1f1f1" : "inherit" }}
            rules={[{ required: true, message: "Please enter product name" }]}
          >
            <Input 
              className={darkMode ? "dark-input" : ""}
              style={{
                backgroundColor: darkMode ? "#2d2d2d" : "white",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
            />
          </Form.Item>

          <Form.Item 
            label="Category" 
            name="category" 
            style={{ color: darkMode ? "#f1f1f1" : "inherit" }}
          >
            <Input 
              className={darkMode ? "dark-input" : ""}
              style={{
                backgroundColor: darkMode ? "#2d2d2d" : "white",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
            />
          </Form.Item>

          <Form.Item 
            label="Price" 
            name="price"
            style={{ color: darkMode ? "#f1f1f1" : "inherit" }}
            rules={[
              { required: true, message: "Please enter price" },
              { pattern: /^\d+(\.\d{1,2})?$/, message: "Please enter a valid price" }
            ]}
          >
            <Input 
              type="number" 
              step="0.01" 
              className={darkMode ? "dark-input" : ""}
              style={{
                backgroundColor: darkMode ? "#2d2d2d" : "white",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
            />
          </Form.Item>

          <Form.Item 
            label="Reference" 
            name="ref" 
            style={{ color: darkMode ? "#f1f1f1" : "inherit" }}
          >
            <Input 
              className={darkMode ? "dark-input" : ""}
              style={{
                backgroundColor: darkMode ? "#2d2d2d" : "white",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
            />
          </Form.Item>

          <Form.Item 
            label="Currency" 
            name="currency" 
            style={{ color: darkMode ? "#f1f1f1" : "inherit" }}
            initialValue="us $ (US Dollar)"
            rules={[{ required: true, message: "Please select currency" }]}
          >
            <Select
              options={[
                { value: "us $ (US Dollar)", label: "US Dollar ($)" },
                { value: "€ (Euro)", label: "Euro (€)" },
                { value: "₹ (INR)", label: "Indian Rupee (₹)" },
              ]}
              className={darkMode ? "dark-select" : ""}
              style={{
                backgroundColor: darkMode ? "#2d2d2d" : "white",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
            />
          </Form.Item>

          <Form.Item 
            label="Description" 
            name="description" 
            style={{ color: darkMode ? "#f1f1f1" : "inherit" }}
  >
            <Input.TextArea 
              rows={3} 
              className={darkMode ? "dark-input" : ""}
              style={{
                backgroundColor: darkMode ? "#2d2d2d" : "white",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: darkMode ? "#555" : "#d9d9d9"
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Product Detail Modal */}
      <Modal
        title="Product Details"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setIsDetailModalOpen(false)}
            type="primary"
          >
            Close
          </Button>
        ]}
        width={isMobile ? '90%' : 600}
        className={darkMode ? "dark-modal" : ""}
        bodyStyle={{
          backgroundColor: darkMode ? "#1f1f1f" : "white",
          color: darkMode ? "#f1f1f1" : "inherit"
        }}
        headerStyle={{
          backgroundColor: darkMode ? "#1f1f1f" : "white",
          color: darkMode ? "#f1f1f1" : "inherit",
          borderBottomColor: darkMode ? "#444" : "#f0f0f0"
        }}
        footerStyle={{
          borderTopColor: darkMode ? "#444" : "#f0f0f0"
        }}
      >
        {selectedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedProduct.image && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    borderRadius: 4
                  }}
                />
              </div>
            )}
            
            <div>
              <h3 style={{ 
                marginBottom: 8, 
                color: darkMode ? "#f1f1f1" : "inherit" 
              }}>
                {selectedProduct.name}
              </h3>
              <Space size={[8, 16]} wrap>
                <Tag color="blue">{selectedProduct.category}</Tag>
                {selectedProduct.ref && <Tag>Ref: {selectedProduct.ref}</Tag>}
                <Tag color="green">
                  {selectedProduct.price} {selectedProduct.currency}
                </Tag>
              </Space>
            </div>
            
            {selectedProduct.description && (
              <div>
                <h4 style={{ 
                  marginBottom: 8, 
                  color: darkMode ? "#f1f1f1" : "inherit" 
                }}>
                  Description
                </h4>
                <p style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>
                  {selectedProduct.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Dark mode CSS classes */}
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
          color: #999 !important;
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
        
        .dark-card {
          background-color: #1f1f1f !important;
          color: #f1f1f1 !important;
        }
        
        .dark-card .ant-card-head {
          color: #f1f1f1 !important;
          border-bottom-color: #444 !important;
        }
        
        .dark-card .ant-card-actions {
          background-color: #1f1f1f !important;
          border-top-color: #444 !important;
        }
        
        .dark-button {
          color: #f1f1f1 !important;
          background-color: transparent !important;
          border-color: #555 !important;
        }
        
        .dark-button:hover, .dark-button:focus {
          color: #177ddc !important;
          border-color: #177ddc !important;
        }
        
        .dark-select .ant-select-selector {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-select .ant-select-arrow {
          color: #f1f1f1 !important;
        }
        
        .dark-select .ant-select-dropdown {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border: 1px solid #555 !important;
        }
        
        .dark-select .ant-select-item {
          color: #f1f1f1 !important;
        }
        
        .dark-select .ant-select-item:hover {
          background-color: #3a3a3a !important;
        }
        
        .dark-select .ant-select-item-option-selected {
          background-color: #177ddc !important;
        }
        
        .dark-radio-group .ant-radio-button-wrapper {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-radio-group .ant-radio-button-wrapper:not(:first-child)::before {
          background-color: #555 !important;
        }
        
        .dark-radio-group .ant-radio-button-wrapper-checked {
          background-color: #177ddc !important;
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
        
        /* Ensure delete button has red color */
        .ant-btn-dangerous {
          color: #ff4d4f !important;
          border-color: #ff4d4f !important;
        }
        
        .ant-btn-dangerous:hover {
          color: #ff7875 !important;
          border-color: #ff7875 !important;
        }
      `}</style>
    </div>
  );
};

export default Products;