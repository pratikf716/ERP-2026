import React, { useState, useEffect, useContext } from "react";
import { Table, Button, Modal, Input, Dropdown, Menu, notification, Card, Row, Col, Tooltip, Upload, Popover } from "antd";
import { SearchOutlined, DownOutlined, ShoppingOutlined, DeleteOutlined, UploadOutlined, FileExcelOutlined, EyeOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import NewInvoiceForm from "./NewInvoiceForm";
import { ref, onValue, remove, push, set } from "firebase/database";
import { db } from "./firebase";
import { DarkModeContext } from "./DarkModeContext";
import "./invoice-list.css";
import CryptoJS from "crypto-js";
import * as XLSX from "xlsx";

const SECRET_KEY = "your-strong-secret-key-32-chars";

const decryptData = (ciphertext) => {
    if (!ciphertext) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decrypted);
    } catch (error) {
        console.error("Decryption failed:", error);
        return null;
    }
};

// Validation function for Created By field
const validateCreatedBy = (value) => {
    if (!value) return false;
    return /^[A-Za-z\s]+$/.test(value);
};

// Validate file type before processing
const validateFileType = (file) => {
    // Allowed Excel file extensions and MIME types
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const allowedMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ];
    
    // Get file extension
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    // Check if extension is allowed
    const isExtensionValid = allowedExtensions.includes(fileExtension);
    
    // Check if MIME type is allowed
    const isMimeTypeValid = allowedMimeTypes.includes(file.type);
    
    return isExtensionValid || isMimeTypeValid;
};

const InvoiceList = () => {
    const { darkMode } = useContext(DarkModeContext);
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [uploadedInvoiceData, setUploadedInvoiceData] = useState(null);
    const [customers, setCustomers] = useState({});
    const [products, setProducts] = useState({});
    const [companies, setCompanies] = useState({});
    const [people, setPeople] = useState({});
    const [customerOptions, setCustomerOptions] = useState([]);
    const [companyOptions, setCompanyOptions] = useState([]);
    const [peopleOptions, setPeopleOptions] = useState([]);
    const [userId, setUserId] = useState(null);

    // Get user ID from localStorage
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => setScreenWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchData = (path, setState, setOptions, labelField = "name", isEncrypted = false) => {
        if (!userId) return;
        
        const dataRef = ref(db, `users/${userId}/${path}`);
        onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const processedData = {};
                const options = [];

                Object.keys(data).forEach((id) => {
                    try {
                        const entry = data[id];
                        let label;

                        if (isEncrypted && entry.encryptedData) {
                            const decrypted = decryptData(entry.encryptedData);
                            label = decrypted?.[labelField] || "Unknown";
                            processedData[id] = { ...decrypted, id };
                        } else {
                            label = entry[labelField] || "Unknown";
                            processedData[id] = { ...entry, id };
                        }

                        options.push({ value: id, label });
                    } catch (error) {
                        console.error(`Error processing ${path}/${id}:`, error);
                    }
                });

                setState(processedData);
                setOptions(options);
            } else {
                setState({});
                setOptions([]);
            }
            setLoading(false);
        }, (error) => {
            console.error(`Firebase read failed for ${path}:`, error);
            notification.error({
                message: 'Data Load Error',
                description: `Failed to load data from ${path}`,
            });
            setLoading(false);
        });
    };

    useEffect(() => {
        if (!userId) return;
        
        setLoading(true);
        fetchData("customers", setCustomers, setCustomerOptions);
        fetchData("products", setProducts, () => {});
        fetchData("companies", setCompanies, setCompanyOptions, "name", true);
        fetchData("peoples", setPeople, setPeopleOptions);
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        // Fetch invoices from users/{userId}/invoicelist
        const invoicesRef = ref(db, `users/${userId}/invoices`);
        onValue(invoicesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const invoiceList = Object.keys(data).map((key) => {
                    const invoice = data[key];
                    return {
                        id: key,
                        client: customers[invoice.clientId]?.name || "Unknown Client",
                        company: companies[invoice.companyId]?.name || "Unknown Company",
                        products: invoice.productIds?.map(id => ({
                            id,
                            name: products[id]?.name || "Unknown Product"
                        })) || [{ id: 'unknown', name: "Unknown Product" }],
                        person: people[invoice.personId]?.name || "Unknown Person",
                        ...invoice
                    };
                });
                setInvoices(invoiceList);
                setFilteredInvoices(invoiceList);
            } else {
                setInvoices([]);
                setFilteredInvoices([]);
            }
        });
    }, [customers, products, companies, people, userId]);

    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearchText(value);
        setFilteredInvoices(
            value
                ? invoices.filter(
                    (invoice) =>
                        (invoice.client && invoice.client.toLowerCase().includes(value)) ||
                        (invoice.products && invoice.products.some(p => p.name.toLowerCase().includes(value))) ||
                        (invoice.company && invoice.company.toLowerCase().includes(value)) ||
                        (invoice.person && invoice.person.toLowerCase().includes(value))
                )
                : invoices
        );
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.text("Invoice List", 14, 10);

        const tableConfig = {
            startY: 20,
            head: [["Number", "Client", "Company", "Products", "Person", "Date", "Invoice Date", "Total", "Status", "Created By"]],
            body: filteredInvoices.map((invoice) => [
                invoice.number || "N/A",
                invoice.client || "N/A",
                invoice.company || "N/A",
                invoice.products?.map(p => p.name).join(", ") || "N/A",
                invoice.person || "N/A",
                invoice.date || "N/A",
                invoice.expireDate || "N/A",
                invoice.total || "N/A",
                invoice.status || "N/A",
                invoice.createdBy || "N/A",
            ]),
        };

        autoTable(doc, tableConfig);
        doc.save("invoices.pdf");
    };

    const onSelectChange = (newSelectedRowKeys) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    const handleDelete = () => {
        setDeleteConfirmVisible(true);
    };

    const confirmDelete = async () => {
        if (!userId) {
            notification.error({
                message: 'Delete Failed',
                description: 'User not authenticated. Please log in again.',
            });
            return;
        }

        try {
            setLoading(true);
            const deletePromises = selectedRowKeys.map(id =>
                remove(ref(db, `users/${userId}/invoices/${id}`))
            );

            await Promise.all(deletePromises);

            notification.success({
                message: 'Invoices Deleted',
                description: `Successfully deleted ${selectedRowKeys.length} invoice(s)`,
            });

            setSelectedRowKeys([]);
            setDeleteConfirmVisible(false);
        } catch (error) {
            console.error("Error deleting invoices:", error);
            notification.error({
                message: 'Delete Failed',
                description: 'There was an error deleting the selected invoices',
            });
        } finally {
            setLoading(false);
        }
    };

    // Helper function to save a single invoice to Firebase
    const saveInvoice = async (invoiceData) => {
        if (!userId) {
            notification.error({
                message: 'Save Failed',
                description: 'User not authenticated. Please log in again.',
            });
            return false;
        }

        // Validate Created By field
        if (!validateCreatedBy(invoiceData.createdBy)) {
            notification.error({
                message: 'Validation Failed',
                description: 'Created By field can only contain letters and spaces',
            });
            return false;
        }

        try {
            // Find or create customer, company, person, and product IDs based on names
            const clientId = await findOrCreateId("customers", invoiceData.client, customers, setCustomers, "name");
            const companyId = await findOrCreateId("companies", invoiceData.company, companies, setCompanies, "name", true);
            const personId = await findOrCreateId("people", invoiceData.person, people, setPeople, "name");

            // Handle products which is an array
            const productIds = Array.isArray(invoiceData.products) 
                ? await Promise.all(invoiceData.products.map(productName => 
                    findOrCreateId("products", productName, products, setProducts, "name")))
                : [await findOrCreateId("products", invoiceData.products, products, setProducts, "name")];

            // Save to users/{userId}/invoicelist
            const invoiceRef = push(ref(db, `users/${userId}/invoices`));
            await set(invoiceRef, {
                ...invoiceData,
                clientId: clientId,
                companyId: companyId,
                personId: personId,
                productIds: productIds,
            });

            return true;
        } catch (error) {
            console.error("Error saving invoice:", error);
            return false;
        }
    };

    // Helper function to find or create an ID in a Firebase list
    const findOrCreateId = async (path, name, data, setData, labelField, isEncrypted = false) => {
        const existingEntry = Object.values(data).find(entry => entry[labelField] === name);
        if (existingEntry) {
            return existingEntry.id;
        } else {
            const newEntryRef = push(ref(db, `users/${userId}/${path}`));
            let newEntryData = { [labelField]: name };
            if (isEncrypted) {
                const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(newEntryData), SECRET_KEY).toString();
                newEntryData = { encryptedData };
            }
            await set(newEntryRef, newEntryData);
            const newId = newEntryRef.key;
            setData(prevData => ({ ...prevData, [newId]: { ...newEntryData, id: newId } }));
            return newId;
        }
    };
    
    // Function to handle Excel file upload and data parsing
    const handleExcelUpload = (file) => {
        if (!userId) {
            notification.error({
                message: 'Upload Failed',
                description: 'User not authenticated. Please log in again.',
            });
            return;
        }

        // Validate file type before processing
        if (!validateFileType(file)) {
            notification.error({
                message: 'Invalid File Type',
                description: 'Please upload only Excel files (.xlsx, .xls, .csv)',
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (excelData.length < 2) {
                notification.error({
                    message: 'Import Failed',
                    description: 'The Excel file is empty or has no data.',
                });
                return;
            }

            const headers = excelData[0];
            
            // Check if the Excel file has the required columns
            const requiredColumns = ['Number', 'Client', 'Company', 'Products', 'Person', 'Date', 'Invoice Date', 'Total', 'Status', 'Created By'];
            const hasRequiredColumns = requiredColumns.every(col => headers.includes(col));
            
            if (!hasRequiredColumns) {
                notification.error({
                    message: 'Invalid File Format',
                    description: 'The Excel file must contain these columns: Number, Client, Company, Products, Person, Date, Invoice Date, Total, Status, Created By',
                });
                return;
            }

            const mappedInvoices = excelData.slice(1).map(row => {
                const invoice = {};
                row.forEach((cell, index) => {
                    const header = headers[index];
                    // Map Excel column names to your data model keys
                    switch (header) {
                        case 'Number': invoice.number = cell; break;
                        case 'Client': invoice.client = cell; break;
                        case 'Company': invoice.company = cell; break;
                        case 'Products': 
                            // Assuming products are a comma-separated string in Excel
                            invoice.products = cell ? cell.split(',').map(p => p.trim()) : []; 
                            break;
                        case 'Person': invoice.person = cell; break;
                        case 'Date': invoice.date = cell; break;
                        case 'Invoice Date': invoice.expireDate = cell; break;
                        case 'Total': invoice.total = parseFloat(cell); break;
                        case 'Status': invoice.status = cell; break;
                        case 'Created By': 
                            // Validate Created By field from Excel
                            if (validateCreatedBy(cell)) {
                                invoice.createdBy = cell; 
                            } else {
                                notification.error({
                                    message: 'Validation Failed',
                                    description: `Row ${excelData.indexOf(row) + 1}: Created By field can only contain letters and spaces`,
                                });
                                return null;
                            }
                            break;
                        default: break;
                    }
                });
                return invoice;
            }).filter(invoice => invoice !== null); // Filter out invalid invoices

            if (mappedInvoices.length === 0) {
                notification.error({
                    message: 'Import Failed',
                    description: 'No valid invoices found in the Excel file.',
                });
                return;
            }

            const hideLoadingNotification = notification.info({
                message: 'Importing Invoices',
                description: 'Saving data from your Excel file...',
                duration: 0,
            });

            try {
                const savePromises = mappedInvoices.map(saveInvoice);
                const results = await Promise.all(savePromises);
                
                const successfulSaves = results.filter(r => r).length;

                if (successfulSaves > 0) {
                    notification.success({
                        message: 'Excel Import Successful',
                        description: `Successfully imported and saved ${successfulSaves} invoice(s).`,
                    });
                } else {
                    notification.error({
                        message: 'Import Failed',
                        description: 'Could not save any invoices from the Excel file.',
                    });
                }
                
                setIsExcelModalOpen(false);
            } catch (error) {
                console.error("Error importing from Excel:", error);
                notification.error({
                    message: 'Import Error',
                    description: 'An unexpected error occurred during import.',
                });
            } finally {
                hideLoadingNotification();
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const renderProductsCell = (products) => {
        if (!products || products.length === 0) {
            return <span>No products</span>;
        }

        const productList = (
            <div className={`product-popover-content ${darkMode ? 'dark-popover' : ''}`}>
                <ul className="product-list">
                    {products.map((product, index) => (
                        <li key={index} className="product-item">
                            <span className="product-name">{product.name}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );

        return (
            <Popover 
                content={productList} 
                title="Products" 
                trigger="click"
                className={darkMode ? 'dark-popover' : ''}
            >
                <Button 
                    type="text" 
                    className={`product-cell ${darkMode ? 'dark-button' : ''}`}
                >
                    <ShoppingOutlined className={`product-icon ${darkMode ? 'dark-icon' : ''}`} />
                    <span className="product-count">{products.length}</span>
                    <EyeOutlined style={{ marginLeft: '8px' }} />
                </Button>
            </Popover>
        );
    };

    const columns = [
        { 
            title: "Number", 
            dataIndex: "number", 
            key: "number",
            responsive: ['md']
        },
        { 
            title: "Client", 
            dataIndex: "client", 
            key: "client",
            responsive: ['md']
        },
        { 
            title: "Company", 
            dataIndex: "company", 
            key: "company",
            responsive: ['md']
        },
        {
            title: "Products",
            dataIndex: "products",
            key: "products",
            render: renderProductsCell,
            responsive: ['md']
        },
        { 
            title: "Person", 
            dataIndex: "person", 
            key: "person",
            responsive: ['md']
        },
        { 
            title: "Date", 
            dataIndex: "date", 
            key: "date",
            responsive: ['lg']
        },
        { 
            title: "Invoice Date", 
            dataIndex: "expireDate", 
            key: "expireDate",
            responsive: ['lg']
        },
        { 
            title: "Total", 
            dataIndex: "total", 
            key: "total",
            responsive: ['sm']
        },
        { 
            title: "Status", 
            dataIndex: "status", 
            key: "status",
            responsive: ['sm']
        },
        { 
            title: "Created By", 
            dataIndex: "createdBy", 
            key: "createdBy",
            responsive: ['lg']
        },
    ];

    const renderMobileCard = (invoice) => (
        <Card
            key={invoice.id}
            className={`invoice-card ${darkMode ? 'dark-card' : ''}`}
            style={{ marginBottom: 16 }}
            actions={[
                <Tooltip title="View Products">
                    <div onClick={() => renderProductsCell(invoice.products)}>
                        <ShoppingOutlined key="products" />
                    </div>
                </Tooltip>,
                <Tooltip title="Delete">
                    <DeleteOutlined 
                        key="delete" 
                        onClick={() => {
                            setSelectedRowKeys([invoice.id]);
                            setDeleteConfirmVisible(true);
                        }} 
                    />
                </Tooltip>
            ]}
        >
            <Row gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                    <div className="mobile-field">
                        <div className="field-label">Number</div>
                        <div className="field-value">{invoice.number || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={24} sm={12}>
                    <div className="mobile-field">
                        <div className="field-label">Client</div>
                        <div className="field-value">{invoice.client || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={24} sm={12}>
                    <div className="mobile-field">
                        <div className="field-label">Company</div>
                        <div className="field-value">{invoice.company || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={24} sm={12}>
                    <div className="mobile-field">
                        <div className="field-label">Person</div>
                        <div className="field-value">{invoice.person || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={24}>
                    <div className="mobile-field">
                        <div className="field-label">Products</div>
                        <div className="field-value">
                            {invoice.products?.map(p => p.name).join(", ") || "N/A"}
                        </div>
                    </div>
                </Col>
                <Col xs={12} sm={8}>
                    <div className="mobile-field">
                        <div className="field-label">Date</div>
                        <div className="field-value">{invoice.date || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={12} sm={8}>
                    <div className="mobile-field">
                        <div className="field-label">Invoice Date</div>
                        <div className="field-value">{invoice.expireDate || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={12} sm={8}>
                    <div className="mobile-field">
                        <div className="field-label">Total</div>
                        <div className="field-value">{invoice.total || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={12} sm={8}>
                    <div className="mobile-field">
                        <div className="field-label">Status</div>
                        <div className="field-value">{invoice.status || "N/A"}</div>
                    </div>
                </Col>
                <Col xs={24} sm={16}>
                    <div className="mobile-field">
                        <div className="field-label">Created By</div>
                        <div className="field-value">{invoice.createdBy || "N/A"}</div>
                    </div>
                </Col>
            </Row>
        </Card>
    );

    return (
        <div className={`invoice-container ${darkMode ? 'dark-mode' : ''}`}>
            <div className="invoice-header">
                <h2 className={darkMode ? 'dark-text' : ''}>Invoice List</h2>
                <div className="invoice-controls">
                    <Input
                        placeholder="Search invoices..."
                        allowClear
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={handleSearch}
                        className={darkMode ? 'dark-search' : ''}
                        style={{ marginBottom: '10px' }}
                    />
                    <div className="button-group">
                        {selectedRowKeys.length > 0 && (
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleDelete}
                                className={darkMode ? 'dark-delete-btn' : ''}
                                size={screenWidth < 576 ? 'small' : 'middle'}
                            >
                                {screenWidth > 400 ? `Delete (${selectedRowKeys.length})` : <DeleteOutlined />}
                            </Button>
                        )}
                        <Button
                            type="primary"
                            onClick={generatePDF}
                            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                            size={screenWidth < 576 ? 'small' : 'middle'}
                            icon={screenWidth < 400 ? null : <FileExcelOutlined />}
                        >
                            {screenWidth > 400 ? 'Export to PDF' : 'PDF'}
                        </Button>
                        <Button
                            type="primary"
                            icon={screenWidth < 400 ? null : <FileExcelOutlined />}
                            onClick={() => setIsExcelModalOpen(true)}
                            size={screenWidth < 576 ? 'small' : 'middle'}
                            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                        >
                            {screenWidth > 400 ? 'Import Excel' : 'Excel'}
                        </Button>
                        <Button
                            type="primary"
                            onClick={() => setIsModalOpen(true)}
                            className={darkMode ? 'dark-add-btn' : ''}
                            size={screenWidth < 576 ? 'small' : 'middle'}
                        >
                            {screenWidth > 400 ? '+ Add Invoice' : '+ Add'}
                        </Button>
                    </div>
                </div>
            </div>

            {screenWidth > 992 ? (
                <Table
                    columns={columns}
                    dataSource={filteredInvoices}
                    rowKey="id"
                    scroll={{ x: true }}
                    pagination={{ pageSize: 10 }}
                    loading={loading}
                    className={darkMode ? 'dark-table' : ''}
                    rowSelection={rowSelection}
                />
            ) : (
                <div className="mobile-invoice-list">
                    {filteredInvoices.map(renderMobileCard)}
                    {loading && <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>}
                    {filteredInvoices.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            No invoices found. {searchText && 'Try a different search term.'}
                        </div>
                    )}
                </div>
            )}

            <Modal
                title="New Invoice"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={Math.min(800, screenWidth - 32)}
                className={darkMode ? 'dark-modal' : ''}
                destroyOnClose
                style={{ top: 20 }}
            >
                <NewInvoiceForm
                    onSave={() => {
                        setIsModalOpen(false);
                        notification.success({
                            message: 'Invoice Created',
                            description: 'The new invoice was successfully created',
                        });
                    }}
                    onClose={() => setIsModalOpen(false)}
                    customers={customerOptions}
                    companies={companyOptions}
                    people={peopleOptions}
                    darkMode={darkMode}
                />
            </Modal>

            <Modal
                title="Import Invoices from Excel"
                open={isExcelModalOpen}
                onCancel={() => setIsExcelModalOpen(false)}
                footer={null}
                className={darkMode ? 'dark-modal' : ''}
                destroyOnClose
                width={Math.min(600, screenWidth - 32)}
            >
                <p>Upload an Excel (.xlsx, .xls) file to automatically add invoices to the table. Make sure the headers match the column names (e.g., "Number", "Client", "Total").</p>
                <p><strong>Note:</strong> The "Created By" field can only contain letters and spaces.</p>
                <p><strong>Required columns:</strong> Number, Client, Company, Products, Person, Date, Invoice Date, Total, Status, Created By</p>
                <Upload
                    name="excelFile"
                    accept=".xlsx,.xls,.csv"
                    showUploadList={false}
                    customRequest={({ file, onSuccess }) => {
                        handleExcelUpload(file);
                        onSuccess();
                    }}
                    beforeUpload={(file) => {
                        // Validate file type before upload
                        if (!validateFileType(file)) {
                            notification.error({
                                message: 'Invalid File Type',
                                description: 'Please upload only Excel files (.xlsx, .xls, .csv)',
                            });
                            return Upload.LIST_IGNORE; // Prevent upload
                        }
                        return true; // Allow upload
                    }}
                >
                    <Button icon={<UploadOutlined />}>Click to Upload</Button>
                </Upload>
            </Modal>

            <Modal
                title="Confirm Delete"
                open={deleteConfirmVisible}
                onOk={confirmDelete}
                onCancel={() => setDeleteConfirmVisible(false)}
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                className={darkMode ? 'dark-modal' : ''}
                width={Math.min(500, screenWidth - 32)}
            >
                <p>Are you sure you want to delete {selectedRowKeys.length} selected invoice(s)? This action cannot be undone.</p>
            </Modal>
        </div>
    );
};

export default InvoiceList;