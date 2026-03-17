import { SearchOutlined, DeleteOutlined, ExclamationCircleFilled, CheckCircleFilled, WarningFilled } from "@ant-design/icons";
import { Button, Col, DatePicker, Form, Grid, Input, Modal, notification, Row, Select, Table, Tag, Tooltip, Popover, Badge, Divider } from "antd";
import { onValue, push, ref, remove } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import { DarkModeContext } from "./DarkModeContext";
import { db } from "./firebase";
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

const Payments = ({ onSelectPayment }) => {
  const { darkMode } = useContext(DarkModeContext);
  const screens = useBreakpoint();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();
  const [userId, setUserId] = useState(null);

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  
  // AI Detection function with enhanced rules
  const getAIDetection = (payment) => {
    const amount = parseFloat(payment.amount);
    const currentYear = new Date().getFullYear();
    const paymentYear = parseInt(payment.year);
    const paymentDate = payment.date;
    const paymentMode = payment.paymentMode;
    
    // Initialize detection results
    const anomalies = [];
    let severity = "low";
    let riskScore = 0;
    
    // Amount-based detection
    if (amount < 100) {
      anomalies.push({
        type: "Very Small Payment",
        description: `Amount ($${amount}) is below $100 threshold`,
        impact: "Potential test transaction or error",
        recommendation: "Verify with client"
      });
      riskScore += 30;
      severity = "medium";
    } else if (amount < 500) {
      anomalies.push({
        type: "Small Payment",
        description: `Amount ($${amount}) is below $500 average`,
        impact: "Lower than typical transaction",
        recommendation: "Review client history"
      });
      riskScore += 10;
    } else if (amount > 5000 && amount <= 20000) {
      anomalies.push({
        type: "Large Payment",
        description: `Amount ($${amount}) exceeds $5,000 threshold`,
        impact: "Higher than average transaction",
        recommendation: "Verify source of funds"
      });
      riskScore += 40;
      severity = "medium";
    } else if (amount > 20000) {
      anomalies.push({
        type: "Very Large Payment",
        description: `Amount ($${amount}) exceeds $20,000 threshold`,
        impact: "Potential high-risk transaction",
        recommendation: "Requires manual approval"
      });
      riskScore += 70;
      severity = "high";
    }
    
    // Date-based detection
    if (paymentYear > currentYear) {
      anomalies.push({
        type: "Future Payment",
        description: `Year (${paymentYear}) is in the future`,
        impact: "Potential data entry error or fraud",
        recommendation: "Verify payment date"
      });
      riskScore += 80;
      severity = "high";
    } else if (paymentYear < currentYear - 5) {
      anomalies.push({
        type: "Old Payment",
        description: `Year (${paymentYear}) is over 5 years old`,
        impact: "Potential outdated record",
        recommendation: "Confirm if this is correct"
      });
      riskScore += 30;
      severity = severity === "low" ? "medium" : severity;
    }
    
    // Payment mode detection
    const suspiciousModes = ["Cash", "Other"];
    if (suspiciousModes.includes(paymentMode)) {
      anomalies.push({
        type: "Suspicious Payment Mode",
        description: `Mode (${paymentMode}) is considered higher risk`,
        impact: "Harder to trace and verify",
        recommendation: "Document additional details"
      });
      riskScore += 50;
      severity = severity === "low" ? "medium" : severity;
    }
    
    // Date format validation
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(paymentDate)) {
      anomalies.push({
        type: "Invalid Date Format",
        description: `Format (${paymentDate}) doesn't match MM/DD/YYYY`,
        impact: "May cause reporting issues",
        recommendation: "Correct the date format"
      });
      riskScore += 20;
      severity = severity === "low" ? "medium" : severity;
    }
    
    // Round number detection
    if (amount % 1000 === 0 && amount >= 1000) {
      anomalies.push({
        type: "Round Number Payment",
        description: `Amount ($${amount}) is an exact thousand`,
        impact: "May indicate estimation",
        recommendation: "Verify if expected"
      });
      riskScore += 15;
    }
    
    // Determine overall status
    const status = anomalies.length > 0 ? 
      (severity === "high" ? "danger" : 
       severity === "medium" ? "warning" : "notice") : "normal";
    
    return {
      anomalies,
      severity,
      status,
      riskScore: Math.min(100, riskScore),
      amountLevel: amount < 500 ? "low" : amount <= 5000 ? "medium" : "high",
      lastChecked: new Date().toLocaleString()
    };
  };
  

  // Enhanced AI Detection display component
  const renderAIDetection = (payment) => {
    const detection = getAIDetection(payment);
    
    const popoverContent = (
      <div style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h4 style={{ margin: 0 }}>AI Payment Analysis</h4>
            <small style={{ color: darkMode ? "#aaa" : "#666" }}>
              Last checked: {detection.lastChecked}
            </small>
          </div>
          <Tag color={
            detection.status === "danger" ? "red" : 
            detection.status === "warning" ? "orange" : 
            detection.status === "notice" ? "blue" : "green"
          }>
            Risk: {detection.riskScore}/100
          </Tag>
        </div>
        
        <Divider style={{ margin: '12px 0' }} />
        
        {detection.anomalies.length > 0 ? (
          <>
            <h4 style={{ marginBottom: 12 }}>Detected Anomalies ({detection.anomalies.length})</h4>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {detection.anomalies.map((anomaly, i) => (
                <div key={i} style={{ 
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 4,
                  backgroundColor: darkMode ? '#2a2a2a' : '#f5f5f5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    {anomaly.type.includes('Suspicious') || anomaly.type.includes('Future') ? (
                      <ExclamationCircleFilled style={{ color: '#ff4d4f', fontSize: 16, marginRight: 8 }} />
                    ) : (
                      <WarningFilled style={{ color: '#faad14', fontSize: 16, marginRight: 8 }} />
                    )}
                    <strong>{anomaly.type}</strong>
                  </div>
                  <p style={{ marginBottom: 4 }}>{anomaly.description}</p>
                  <p style={{ marginBottom: 4, color: darkMode ? '#ccc' : '#666' }}>
                    <strong>Impact:</strong> {anomaly.impact}
                  </p>
                  <p style={{ marginBottom: 0, color: darkMode ? '#69c0ff' : '#1890ff' }}>
                    <strong>Recommendation:</strong> {anomaly.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <CheckCircleFilled style={{ color: '#52c41a', fontSize: 24, marginBottom: 8 }} />
            <h4 style={{ margin: 0 }}>No Anomalies Detected</h4>
            <p style={{ color: darkMode ? "#aaa" : "#666", marginTop: 4 }}>
              This payment appears normal based on AI analysis
            </p>
          </div>
        )}
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: darkMode ? "#aaa" : "#666" }}>
          <span>Payment ID: {payment.number}</span>
          <span>Amount: ${payment.amount}</span>
        </div>
      </div>
    );
    
    const getStatusIcon = () => {
      switch (detection.status) {
        case "danger": return <ExclamationCircleFilled style={{ color: "#ff4d4f", fontSize: 18 }} />;
        case "warning": return <WarningFilled style={{ color: "#faad14", fontSize: 18 }} />;
        case "notice": return <ExclamationCircleFilled style={{ color: "#1890ff", fontSize: 18 }} />;
        default: return <CheckCircleFilled style={{ color: "#52c41a", fontSize: 18 }} />;
      }
    };
    
    const getAmountTag = () => {
      const amountLevel = detection.amountLevel;
      const color = amountLevel === "low" ? "green" : amountLevel === "medium" ? "orange" : "red";
      const text = amountLevel === "low" ? "Low" : amountLevel === "medium" ? "Medium" : "High";
      
      return (
        <Tooltip title={`Amount classification: ${text}`}>
          <Tag color={color}>{text}</Tag>
        </Tooltip>
      );
    };
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Popover 
          content={popoverContent} 
          title={null}
          overlayStyle={{ maxWidth: 450 }}
          placement="right"
          trigger="click"
        >
          <Badge 
            dot 
            status={
              detection.status === "danger" ? "error" : 
              detection.status === "warning" ? "warning" : 
              detection.status === "notice" ? "processing" : "success"
            }
          >
            {getStatusIcon()}
          </Badge>
        </Popover>
        {getAmountTag()}
      </div>
    );
  };

  // Fetch payments from Firebase
  useEffect(() => {
    if (!userId) return;

    const paymentsRef = ref(db, `users/${userId}/payments`);
    const unsubscribe = onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      setPayments(list);
      setFilteredPayments(list);
      setSelectedRowKeys([]);
    });
    return () => unsubscribe();
  }, [userId]);

  // Filter payments based on search term
  useEffect(() => {
    const filtered = payments.filter(
      (payment) =>
        payment.number?.toString().includes(searchTerm) ||
        payment.client?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPayments(filtered);
  }, [searchTerm, payments]);

  const handleSubmit = async (values) => {
    if (!userId) {
      notification.error({
        message: 'Error',
        description: 'User not authenticated. Please log in again.',
      });
      return;
    }

    try {
      // Format the date to MM/DD/YYYY format
      const formattedValues = {
        ...values,
        date: dayjs(values.date).format('MM/DD/YYYY'),
        year: dayjs(values.date).format('YYYY')
      };
      
      await push(ref(db, `users/${userId}/payments`), formattedValues);
      form.resetFields();
      setIsModalOpen(false);
      notification.success({
        message: 'Success',
        description: 'Payment added successfully',
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      notification.error({
        message: 'Error',
        description: 'Failed to add payment',
      });
    }
  };

  const handleDelete = async () => {
    if (!userId) {
      notification.error({
        message: 'Error',
        description: 'User not authenticated. Please log in again.',
      });
      return;
    }

    if (selectedRowKeys.length === 0) {
      notification.warning({
        message: 'Warning',
        description: 'Please select at least one payment to delete',
      });
      return;
    }

    try {
      const deletePromises = selectedRowKeys.map(id => 
        remove(ref(db, `users/${userId}/payments/${id}`))
      );
      
      await Promise.all(deletePromises);
      
      notification.success({
        message: 'Success',
        description: `Deleted ${selectedRowKeys.length} payment(s) successfully`,
      });
      
      setSelectedRowKeys([]);
    } catch (error) {
      console.error("Error deleting payments:", error);
      notification.error({
        message: 'Error',
        description: 'Failed to delete payments',
      });
    }
  };

  const getColumns = () => {
    if (screens.xs) {
      return [
        {
          title: "Payment Details",
          dataIndex: "number",
          key: "number",
          render: (_, record) => (
            <div 
              className={`mobile-payment-card ${darkMode ? "dark-mobile-card" : ""}`}
              onClick={() => onSelectPayment?.(record)}
              style={{ padding: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="payment-number" style={{ color: darkMode ? "#f1f1f1" : "inherit", fontWeight: 'bold' }}>
                  #{record.number}
                </div>
                {renderAIDetection(record)}
              </div>
              <div className="payment-client" style={{ color: darkMode ? "#d9d9d9" : "#666" }}>
                <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Client:</strong> {record.client}
              </div>
              <div className="payment-amount" style={{ color: darkMode ? "#d9d9d9" : "#666" }}>
                <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Amount:</strong> ${record.amount}
              </div>
              <div className="payment-date" style={{ color: darkMode ? "#d9d9d9" : "#666" }}>
                <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Date:</strong> {record.date} ({record.year})
              </div>
              <div className="payment-mode" style={{ color: darkMode ? "#d9d9d9" : "#666" }}>
                <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Mode:</strong> {record.paymentMode}
              </div>
            </div>
          ),
        },
      ];
    }

    return [
      { 
        title: "Number", 
        dataIndex: "number", 
        key: "number",
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>#{text}</span>
      },
      { 
        title: "Client", 
        dataIndex: "client", 
        key: "client",
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text}</span>
      },
      { 
        title: "Amount", 
        dataIndex: "amount", 
        key: "amount",
        render: (amount) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>${amount}</span>
      },
      { 
        title: "Date", 
        dataIndex: "date", 
        key: "date",
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text}</span>
      },
      { 
        title: "Year", 
        dataIndex: "year", 
        key: "year",
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text}</span>
      },
      { 
        title: "Payment Mode", 
        dataIndex: "paymentMode", 
        key: "paymentMode",
        render: (text) => <span style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>{text}</span>
      },
      {
        title: "AI Detection",
        dataIndex: "aiDetection",
        key: "aiDetection",
        render: (_, record) => renderAIDetection(record)
      },
    ];
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    getCheckboxProps: (record) => ({
      disabled: false,
    }),
  };

  return (
    <div className={`payments-container ${darkMode ? "dark-mode" : ""}`} style={{ 
      padding: screens.xs ? "16px" : "24px 24px 24px 120px",
      maxWidth: '1400px',
      margin: '0 auto',
      marginLeft: screens.xs ? '0' : '180px',
      backgroundColor: darkMode ? "#141414" : "#f8f9fa",
      color: darkMode ? "#f1f1f1" : "inherit",
      minHeight: '100vh',
      width: screens.xs ? '100%' : 'auto'
    }}>
      <div className="payments-header" style={{
        display: 'flex',
        flexDirection: screens.xs ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: screens.xs ? 'flex-start' : 'center',
        marginBottom: '24px',
        gap: screens.xs ? '16px' : '24px'
      }}>
      <h2 
  className="payments-title" 
  style={{ 
    margin: 0,
    fontSize: screens.xs ? '1.5rem' : '1.8rem',
    color: darkMode ? "#f1f1f1" : "inherit"
  }}
>
  Payments List
</h2>

<div 
  className="payments-actions" 
  style={{
    display: 'flex',
    flexDirection: screens.xs ? 'column' : 'row',
    gap: '12px',
    width: screens.xs ? '100%' : 'auto'
  }}
>

          <Input
            placeholder="Search payments"
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={darkMode ? "dark-input" : ""}
            style={{ 
              width: screens.xs ? '100%' : '250px',
              backgroundColor: darkMode ? "#2d2d2d" : "#fff",
              color: darkMode ? "#f1f1f1" : "inherit",
              borderColor: darkMode ? "#555" : "#d9d9d9"
            }}
          />
          {selectedRowKeys.length > 0 && (
            <Button 
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              style={{
                flex: screens.xs ? 1 : 'none',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              disabled={!userId}
            >
              {!screens.xs && 'Delete Selected'}
            </Button>
          )}
          <Button 
            type="primary" 
            onClick={() => setIsModalOpen(true)}
            style={{
              flex: screens.xs ? 1 : 'none',
              padding: '0 24px',
              backgroundColor: darkMode ? "#177ddc" : "#1890ff",
              borderColor: darkMode ? "#177ddc" : "#1890ff"
            }}
            disabled={!userId}
          >
            + Add Payment
          </Button>
        </div>
      </div>

      <div className="payments-table-container" style={{
        overflowX: 'auto',
        borderRadius: '8px',
        boxShadow: darkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginRight: screens.xs ? '0' : '20px'
      }}>
        <Table
          columns={getColumns()}
          dataSource={filteredPayments}
          rowKey="id"
          scroll={{ x: true }}
          pagination={{
            pageSize: screens.xs ? 5 : 10,
            showSizeChanger: false,
          }}
         className={darkMode ? "dark-table" : ""}
style={{ 
  backgroundColor: darkMode ? "#1f1f1f" : "#fff",
  color: darkMode ? "#f1f1f1" : "inherit"
}}
onRow={(record) => ({
  onClick: () => onSelectPayment?.(record),
  style: { 
    cursor: "pointer",
    backgroundColor: darkMode ? "#1f1f1f" : "#fff"
  },
})}
rowSelection={
  !screens.xs
    ? {
        type: 'checkbox',
        ...rowSelection,
      }
    : null
}
/>

        
      </div>

      <Modal
        title="Add New Payment"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={screens.xs ? '90%' : '50%'}
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
                name="number"
                label="Payment Number"
                rules={[{ required: true, message: 'Please enter payment number' }]}
              >
                <Input 
                  placeholder="Enter payment number" 
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
                name="client"
                label="Client Name"
                rules={[{ required: true, message: 'Please enter client name' }]}
              >
                <Input 
  placeholder="Enter client name" 
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
                name="amount"
                label="Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <Input 
                  type="number"
                  placeholder="Enter amount" 
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
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker
                  format="MM/DD/YYYY"
                  style={{ 
                    width: '100%',
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                  className={darkMode ? "dark-datepicker" : ""}
                  popupClassName={darkMode ? "dark-datepicker-dropdown" : ""}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="paymentMode"
                label="Payment Mode"
                rules={[{ required: true, message: 'Please select payment mode' }]}
              >
                <Select
                  placeholder="Select payment mode"
                  className={darkMode ? "dark-select" : ""}
                  style={{
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                  dropdownStyle={{
                    backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                    color: darkMode ? "#f1f1f1" : "inherit",
                    borderColor: darkMode ? "#555" : "#d9d9d9"
                  }}
                >
                  <Select.Option value="Cash">Cash</Select.Option>
                  <Select.Option value="Credit Card">Credit Card</Select.Option>
                  <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                  <Select.Option value="Check">Check</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Button 
                onClick={() => { setIsModalOpen(false); form.resetFields(); }} 
                style={{ marginRight: 8 }}
                className={darkMode ? "dark-button" : ""}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{
                  backgroundColor: darkMode ? "#177ddc" : "#1890ff",
                  borderColor: darkMode ? "#177ddc" : "#1890ff"
                }}
                disabled={!userId}
              >
                Add Payment
              </Button>
            </Col>
          </Row>
        </Form>
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
        
        .dark-select .ant-select-selector {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-select .ant-select-arrow {
          color: #8c8c8c !important;
        }
        
        .dark-select-dropdown {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-select-dropdown .ant-select-item {
          color: #f1f1f1 !important;
        }
        
        .dark-select-dropdown .ant-select-item-option-selected {
          background-color: #177ddc !important;
        }
        
        .dark-select-dropdown .ant-select-item-option-active {
          background-color: #2a2a2a !important;
        }
        
        .dark-datepicker .ant-picker-input > input {
          color: #f1f1f1 !important;
        }
        
        .dark-datepicker .ant-picker-suffix {
          color: #8c8c8c !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-panel {
          background-color: #2d2d2d !important;
          border-color: #555 !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-cell {
          color: #f1f1f1 !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-cell-in-view {
          color: #f1f1f1 !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-cell-disabled {
          color: #666 !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-header {
          color: #f1f1f1 !important;
          border-bottom-color: #555 !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-header button {
          color: #f1f1f1 !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-content th {
          color: #f1f1f1 !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-today-btn {
          color: #177ddc !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner {
          background-color: #177dd极速赛车开奖结果记录官网
c !important;
        }
        
        .dark-datepicker-dropdown .ant极速赛车开奖结果记录官网
-picker-cell-in-view.ant-picker-cell-range-start .ant-picker-cell-inner,
        .dark-datepicker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-end .ant-picker-cell-inner {
          background-color: #177ddc !important;
        }
        
        .dark-datepicker-dropdown .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before {
          border-color: #177ddc !important;
        }
        
        .dark-table .ant-table {
          background-color: #1f1f1f !important;
          color: #f1f1f1 !important;
        }
        
        .dark-table .ant-table-thead > tr >极速赛车开奖结果记录官网
 th {
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
        
        .dark-table .ant-checkbox-inner {
          background-color: #2d2d2d !important;
          border-color: #555 !important;
        }
        
        .dark-table .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #177ddc !important;
          border-color: #177ddc !important;
        }
        
        .dark-table .ant-table-row-selected > td {
          background-color: #2a2a2a !important;
        }
        
        .dark-modal .ant-modal-content {
          background-color: #1f1f1f !important;
          color: #f1f1f1 !important;
          border: 1px solid #444 !important;
        }
        
        .极速赛车开奖结果记录官网
dark-modal .ant-modal-title {
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
          background-color: #2d2极速赛车开奖结果记录官网
d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-button:hover {
          color: #177ddc !important;
          border-color: #177ddc !important;
        }
        
        .mobile-payment-card {
          padding: 12px;
          border-radius: 8px;
          background-color: #f9f9f9;
          margin: 8px 0;
        }
        
        .payment-number {
          font-size: 16px;
          margin-bottom: 4px;
        }
        
        .payment-client, .payment-amount, 
        .payment-date, .payment-mode {
          font-size: 14px;
          margin: 4px 0;
        }
        
        .ant-badge-status-dot {
          width: 12px;
          height: 12px;
        }
        
        .ant-popover-inner {
          background-color: ${darkMode ? '#1f1f1f' : '#fff'} !important;
          color: ${darkMode ? '#f1f1f1' : 'inherit'} !important;
          border-color: ${darkMode ? '#444' : '#d9d9d9'} !important;
        }
        
        .ant-popover-title {
          color: ${darkMode ? '#f1f1f1' : 'inherit'} !important;
          border-bottom-color: ${darkMode ? '#444' : '#f0f0f0'} !important;
        }
        
        .ant-popover-arrow-content {
          background-color: ${darkMode ? '#1f1f1f' : '#fff'} !important;
        }
        
        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .payments-container {
            padding: 16px !important;
            margin-left: 0 !important;
            width: 100% !important;
          }
          
          .payments-header {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center;
          }
          
          .payments-title {
            text-align: center;
            width: 100%;
          }
          
          .payments-actions {
            width: 100% !important;
            flex-direction: column !important;
          }
          
          .payments-table-container {
            margin-right: 0 !important;
            width: 100%;
          }
          
          .ant-table {
            width: 100% !important;
          }
          
          .ant-table-cell {
            padding: 8px !important;
          }
          
          .mobile-payment-card {
            margin: 8px 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Payments;