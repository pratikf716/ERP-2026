import React, { useState } from "react";
import { Table, Input, Button, Modal, Tag } from "antd";
import { SearchOutlined, SyncOutlined, PlusOutlined } from "@ant-design/icons";
import NewInvoiceForm from "./NewInvoiceForm";

const { Search } = Input;

const columns = [
  { 
    title: <span style={{ fontWeight: 'bold' }}>Number</span>, 
    dataIndex: "number",
    render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Client</span>, 
    dataIndex: "client" 
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Date</span>, 
    dataIndex: "date",
    render: (text) => <span style={{ color: '#666' }}>{text}</span>
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Expired Date</span>, 
    dataIndex: "expiredDate",
    render: (text) => <span style={{ color: '#666' }}>{text}</span>
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Total</span>, 
    dataIndex: "total",
    render: (text) => <span style={{ fontWeight: 600 }}>${text}</span>
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Paid</span>, 
    dataIndex: "paid",
    render: (text) => <Tag color={text === 'Yes' ? 'success' : 'error'}>{text}</Tag>
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Status</span>, 
    dataIndex: "status",
    render: (text) => (
      <Tag 
        color={text === 'Paid' ? 'success' : text === 'Pending' ? 'warning' : 'error'}
      >
        {text}
      </Tag>
    )
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Payment</span>, 
    dataIndex: "payment" 
  },
  { 
    title: <span style={{ fontWeight: 'bold' }}>Created By</span>, 
    dataIndex: "createdBy" 
  },
];

const dataSource = [];

function InvoiceList() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onSearch = (value) => {
    console.log("Search value:", value);
  };

  const onRefresh = () => {
    console.log("Refresh clicked");
  };

  const onAddNewInvoice = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <div style={{ 
      padding: "24px", 
      maxWidth: "1200px", 
      margin: "0 auto",
      backgroundColor: "#fff",
      border: "1px solid #e8e8e8",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
    }}>
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid #f0f0f0",
          paddingBottom: "16px"
        }}
      >
        <h2 style={{ 
          margin: 0,
          color: "#000",
          fontSize: "20px",
          fontWeight: 600
        }}>
          Invoice List
        </h2>
        <div style={{ 
          display: "flex", 
          gap: "12px",
          flexWrap: "wrap"
        }}>
          <Search
            placeholder="Search invoices..."
            onSearch={onSearch}
            style={{ width: 200 }}
            allowClear
            enterButton={<SearchOutlined style={{ color: "#fff" }} />}
          />
          <Button 
            onClick={onRefresh}
            icon={<SyncOutlined />}
            style={{ 
              borderColor: "#d9d9d9",
              color: "#000"
            }}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            onClick={onAddNewInvoice}
            icon={<PlusOutlined />}
            style={{ 
              backgroundColor: "#000",
              borderColor: "#000",
              fontWeight: 500
            }}
          >
            Add New Invoice
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={(record, index) => index}
        locale={{ 
          emptyText: (
            <div style={{ 
              padding: "40px 0",
              color: "#000",
              textAlign: "center"
            }}>
              No invoices found
            </div>
          ) 
        }}
        style={{
          border: "1px solid #f0f0f0",
          borderRadius: "8px"
        }}
        pagination={{
          style: {
            marginRight: "16px",
            marginBottom: 0,
            padding: "16px 0",
            borderTop: "1px solid #f0f0f0"
          }
        }}
      />

      {/* Modal for New Invoice Form */}
      <Modal
        title={<span style={{ color: "#000", fontWeight: 600 }}>New Invoice</span>}
        open={isModalOpen}
        onCancel={handleClose}
        footer={null}
        width={800}
        bodyStyle={{
          padding: "24px",
          borderTop: "1px solid #f0f0f0",
          borderBottom: "1px solid #f0f0f0"
        }}
        style={{
          borderRadius: "8px"
        }}
      >
        <NewInvoiceForm />
      </Modal>
    </div>
  );
}

export default InvoiceList;