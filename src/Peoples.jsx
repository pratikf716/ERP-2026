import { AudioOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Grid, Input, message, Modal, Popconfirm, Space, Table, Select } from "antd";
import { onValue, push, ref, remove, update } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import { DarkModeContext } from "./DarkModeContext";
import { db } from "./firebase";

const { useBreakpoint } = Grid;
const { TextArea } = Input;
const { Option } = Select;

// Country data for dropdown
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", 
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", 
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", 
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", 
  "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", 
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", 
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", 
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", 
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", 
  "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", 
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", 
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", 
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", 
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", 
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", 
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", 
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", 
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", 
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", 
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", 
  "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", 
  "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const Peoples = () => {
  const { darkMode } = useContext(DarkModeContext);
  const screens = useBreakpoint();
  const [people, setPeople] = useState([]);
  const [filteredPeople, setFilteredPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    company: "", 
    country: "", 
    phone: "", 
    email: "" 
  });
  const [formErrors, setFormErrors] = useState({});
  const [aiCommand, setAiCommand] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [editId, setEditId] = useState(null);
  const [listening, setListening] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [userId, setUserId] = useState(null);
  let recognition;

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Fetch from Firebase under user's path
  useEffect(() => {
    if (!userId) {
      setPeople([]);
      setFilteredPeople([]);
      return;
    }
    
    const userPeoplesRef = ref(db, `users/${userId}/peoples`);
    const unsubscribe = onValue(userPeoplesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        : [];
      setPeople(list);
      setFilteredPeople(list);
    });
    return () => unsubscribe();
  }, [userId]);

  // Search filter
  useEffect(() => {
    const filtered = people.filter(person =>
      Object.values(person).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      ));
    setFilteredPeople(filtered);
  }, [searchTerm, people]);

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    const nameRegex = /^[A-Za-z\s]+$/;

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (!nameRegex.test(formData.name)) {
      errors.name = "Name can only contain letters and spaces";
    }
    
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    } else if (formData.email && formData.email !== formData.email.toLowerCase()) {
      errors.email = "Email must be in lowercase letters";
    }
    
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      errors.phone = "Phone number must be exactly 10 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Convert email to lowercase as user types
    if (name === 'email') {
      setFormData(prev => ({ ...prev, [name]: value.toLowerCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleCountryChange = (value) => {
    setFormData(prev => ({ ...prev, country: value }));
    
    // Clear error when user selects a country
    if (formErrors.country) {
      setFormErrors(prev => ({ ...prev, country: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !userId) {
      message.error("Name is required");
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      if (editId) {
        await update(ref(db, `users/${userId}/peoples/${editId}`), formData);
        message.success("Person updated successfully");
      } else {
        await push(ref(db, `users/${userId}/peoples`), formData);
        message.success("Person added successfully");
      }
      setFormData({ name: "", company: "", country: "", phone: "", email: "" });
      setFormErrors({});
      setEditId(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving person:", error);
      message.error("Error saving person");
    }
  };

  const handleEdit = (person) => {
    setEditId(person.id);
    setFormData({ 
      name: person.name, 
      company: person.company, 
      country: person.country, 
      phone: person.phone, 
      email: person.email 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!userId) return;
    
    try {
      await remove(ref(db, `users/${userId}/peoples/${id}`));
      message.success("Person deleted successfully");
    } catch (error) {
      console.error("Error deleting person:", error);
      message.error("Error deleting person");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRowKeys.length === 0 || !userId) {
      message.warning("Please select at least one person to delete");
      return;
    }
    
    try {
      const deletePromises = selectedRowKeys.map(id => remove(ref(db, `users/${userId}/peoples/${id}`)));
      await Promise.all(deletePromises);
      message.success(`Deleted ${selectedRowKeys.length} person(s)`);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error("Error deleting people:", error);
      message.error("Error deleting selected people");
    }
  };

  const handleDeleteAllPeoples = async () => {
    if (!userId) return;
    
    if (people.length === 0) {
      message.info("No people to delete");
      return;
    }

    try {
      await remove(ref(db, `users/${userId}/peoples`));
      message.success("All people deleted successfully");
    } catch (error) {
      console.error("Error deleting all people:", error);
      message.error("Error deleting all people");
    }
  };

  const handleAICommand = () => {
    if (!userId) {
      message.error("User not authenticated");
      return;
    }
    
    const command = aiCommand.toLowerCase();
    if (command.includes("name is") && command.includes("submit")) {
      const name = command.match(/name is (.*?),/i)?.[1]?.trim();
      const company = command.match(/company is (.*?),/i)?.[1]?.trim();
      const country = command.match(/country is (.*?),/i)?.[1]?.trim();
      const phone = command.match(/phone is (.*?),/i)?.[1]?.trim();
      const email = command.match(/email is (.*?)(,|submit)/i)?.[1]?.trim();
      if (name && company && country && phone && email) {
        push(ref(db, `users/${userId}/peoples`), { name, company, country, phone, email });
        setAiResponse("✔️ Person added successfully via command!");
        setAiCommand("");
        message.success("Person added via AI command");
      } else {
        setAiResponse("❌ Incomplete command. Please follow format: name is ..., company is ..., etc.");
        message.error("Incomplete AI command");
      }
    } else if (command.includes("delete") && command.includes("name is")) {
      const nameToDelete = command.match(/name is (.*)/i)?.[1]?.trim();
      const person = people.find(p => p.name.toLowerCase() === nameToDelete.toLowerCase());
      if (person) {
        remove(ref(db, `users/${userId}/peoples/${person.id}`));
        setAiResponse(`🗑️ Deleted person with name '${nameToDelete}'`);
        message.success(`Deleted ${nameToDelete}`);
      } else {
        setAiResponse("❌ Person not found to delete.");
        message.error("Person not found");
      }
    } else if (command.includes("edit") && command.includes("name is")) {
      const nameToEdit = command.match(/name is (.*?),/i)?.[1]?.trim();
      const updates = {};
      if (command.includes("company is")) updates.company = command.match(/company is (.*?),/i)?.[1]?.trim();
      if (command.includes("country is")) updates.country = command.match(/country is (.*?),/i)?.[1]?.trim();
      if (command.includes("phone is")) updates.phone = command.match(/phone is (.*?),/i)?.[1]?.trim();
      if (command.includes("email is")) updates.email = command.match(/email is (.*?)(,|submit)/i)?.[1]?.trim();
      const person = people.find(p => p.name.toLowerCase() === nameToEdit.toLowerCase());
      if (person) {
        update(ref(db, `users/${userId}/peoples/${person.id}`), updates);
        setAiResponse(`✏️ Updated person '${nameToEdit}'`);
        message.success(`Updated ${nameToEdit}`);
      } else {
        setAiResponse("❌ Person not found to edit.");
        message.error("Person not found");
      }
    } else if (command.includes("export")) {
      const csvData = people.map(p => `${p.name},${p.company},${p.country},${p.phone},${p.email}`).join("\n");
      const blob = new Blob(["Name,Company,Country,Phone,Email\n" + csvData], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'people_export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setAiResponse("📤 Data exported successfully.");
      message.success("Data exported");
    } else {
      setAiResponse("❓ Unknown command. Try: name is ..., submit | delete name is ... | export");
      message.info("Unknown AI command");
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      message.error("Your browser doesn't support Speech Recognition");
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAiCommand(transcript);
    };

    recognition.start();
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
          title: "People",
          dataIndex: "name",
          key: "name",
          render: (_, record) => (
            <div className={`mobile-person-card ${darkMode ? "dark-mobile-card" : ""}`}>
              <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>👤 {record.name}</strong><br />
              <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>🏢 {record.company || 'N/A'}</span><br />
              <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>🌎 {record.country || 'N/A'}</span><br />
              <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>📞 {record.phone || 'N/A'}</span><br />
              <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>✉️ {record.email || 'N/A'}</span>
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
                    title="Are you sure to delete this person?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="Yes"
                    cancelText="No"
                    className={darkMode ? "dark-popconfirm" : ""}
                  >
                    <Button 
                      icon={<DeleteOutlined />} 
                      size="small" 
                      danger
                      className="delete-button"
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
        render: (name) => <strong style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>👤 {name}</strong>
      },
      { 
        title: "Company", 
        dataIndex: "company", 
        key: "company", 
        render: (company) => <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>{company || 'N/A'}</span> 
      },
      { 
        title: "Country", 
        dataIndex: "country", 
        key: "country", 
        render: (country) => <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>{country || 'N/A'}</span> 
      },
      { 
        title: "Phone", 
        dataIndex: "phone", 
        key: "phone", 
        render: (phone) => <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>{phone || 'N/A'}</span> 
      },
      { 
        title: "Email", 
        dataIndex: "email", 
        key: "email", 
        render: (email) => <span style={{ color: darkMode ? "#d9d9d9" : "#666" }}>{email || 'N/A'}</span> 
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
              title="Are you sure to delete this person?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              className={darkMode ? "dark-popconfirm" : ""}
            >
              <Button 
                icon={<DeleteOutlined />} 
                danger
                className="delete-button"
              />
            </Popconfirm>
          </Space>
        ),
      },
    ];
  };

  if (!userId) {
    return (
      <div className={`people-container ${darkMode ? "dark-mode" : ""}`} style={{ 
        padding: screens.xs ? "16px" : "24px 24px 24px 120px",
        maxWidth: '1400px',
        margin: '0 auto',
        marginLeft: screens.xs ? '0' : '180px',
        backgroundColor: darkMode ? "#141414" : "#f8f9fa",
        color: darkMode ? "#f1f1f1" : "inherit",
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <p style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>Please sign in to access your people</p>
      </div>
    );
  }

  return (
    <div className={`people-container ${darkMode ? "dark-mode" : ""}`} style={{ 
      padding: screens.xs ? "16px" : "24px 24px 24px 120px",
      maxWidth: '1400px',
      margin: '0 auto',
      marginLeft: screens.xs ? '0' : '180px',
      backgroundColor: darkMode ? "#141414" : "#f8f9fa",
      color: darkMode ? "#f1f1f1" : "inherit",
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="people-header" style={{
        display: 'flex',
        flexDirection: screens.xs ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: screens.xs ? 'flex-start' : 'center',
        marginBottom: '24px',
        gap: screens.xs ? '16px' : '24px'
      }}>
        <h2 className="people-title" style={{ 
          margin: 0,
          fontSize: screens.xs ? '1.5rem' : '1.8rem',
          color: darkMode ? "#f1f1f1" : "inherit",
          textAlign: screens.xs ? 'center' : 'left',
          width: screens.xs ? '100%' : 'auto'
        }}>People List</h2>
        <div className="people-actions" style={{
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
              placeholder="Search people..."
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
            flexDirection: screens.xs ? 'row' : 'row',
            width: screens.xs ? '100%' : 'auto',
            flexWrap: screens.xs ? 'wrap' : 'nowrap'
          }}>
            <Button 
              type="primary" 
              onClick={() => setIsModalOpen(true)}
              style={{
                flex: screens.xs ? '1 1 45%' : 'none',
                padding: '0 24px',
                backgroundColor: darkMode ? "#177ddc" : "#1890ff",
                borderColor: darkMode ? "#177ddc" : "#1890ff"
              }}
            >
              + Add Person
            </Button>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} selected person(s)?`}
                onConfirm={handleDeleteSelected}
                okText="Yes"
                cancelText="No"
                className={darkMode ? "dark-popconfirm" : ""}
              >
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  style={{
                    flex: screens.xs ? '1 1 45%' : 'none',
                    padding: '0 24px',
                    backgroundColor: darkMode ? "#d9363e" : "#ff4d4f",
                    borderColor: darkMode ? "#d9363e" : "#ff4d4f"
                  }}
                >
                  Delete Selected
                </Button>
              </Popconfirm>
            )}
            <Popconfirm
              title={`Delete all ${people.length} people?`}
              onConfirm={handleDeleteAllPeoples}
              okText="Yes"
              cancelText="No"
              className={darkMode ? "dark-popconfirm" : ""}
            >
              <Button 
                danger
                icon={<DeleteOutlined />}
                style={{
                  flex: screens.xs ? '1 1 45%' : 'none',
                  padding: '0 24px',
                  backgroundColor: darkMode ? "#d9363e" : "#ff4d4f",
                  borderColor: darkMode ? "#d9363e" : "#ff4d4f"
                }}
              >
                Delete All
              </Button>
            </Popconfirm>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="people-table-container" style={{
        overflowX: 'auto',
        borderRadius: '8px',
        boxShadow: darkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginRight: screens.xs ? '0' : '20px'
      }}>
        <Table
          columns={getColumns()}
          dataSource={filteredPeople}
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

      {/* AI Command Box */}
      <div className="ai-command-container" style={{ 
        marginTop: '24px',
        padding: screens.xs ? '8px' : '16px',
        backgroundColor: darkMode ? "#1f1f1f" : "#fff",
        borderRadius: '8px',
        boxShadow: darkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        color: darkMode ? "#f1f1f1" : "inherit"
      }}>
        <h3 style={{ 
          marginBottom: '16px',
          color: darkMode ? "#f1f1f1" : "inherit",
          textAlign: screens.xs ? 'center' : 'left'
        }}>AI Command Input</h3>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={aiCommand}
            onChange={(e) => setAiCommand(e.target.value)}
            placeholder="e.g. name is John, company is XYZ, country is US, phone is 123456, email is j@j.com, submit"
            className={darkMode ? "dark-input" : ""}
            style={{
              backgroundColor: darkMode ? "#2d2d2d" : "#fff",
              color: darkMode ? "#f1f1f1" : "inherit",
              borderColor: darkMode ? "#555" : "#d9d9d9"
            }}
          />
          <Button 
            type="primary" 
            onClick={handleAICommand}
            style={{
              backgroundColor: darkMode ? "#177ddc" : "#1890ff",
              borderColor: darkMode ? "#177ddc" : "#1890ff"
            }}
          >
            Execute
          </Button>
          <Button 
            icon={<AudioOutlined />} 
            onClick={startVoiceRecognition}
            type={listening ? "primary" : "default"}
            style={{
              backgroundColor: listening ? (darkMode ? "#177ddc" : "#1890ff") : (darkMode ? "#2d2d2d" : "#fff"),
              borderColor: listening ? (darkMode ? "#177ddc" : "#1890ff") : (darkMode ? "#555" : "#d9d9d9"),
              color: listening ? "#fff" : (darkMode ? "#f1f1f1" : "inherit")
            }}
          >
            {listening ? "Listening..." : "Voice"}
          </Button>
        </Space.Compact>
        {aiResponse && (
          <div style={{ 
            marginTop: '16px',
            padding: '8px',
            background: darkMode ? '#2d2d2d' : '#f0f0f0',
            borderRadius: '4px',
            color: darkMode ? "#f1f1f1" : "inherit",
            textAlign: 'center'
          }}>
            {aiResponse}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        title={editId ? "Edit Person" : "Add New Person"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditId(null);
          setFormData({ name: "", company: "", country: "", phone: "", email: "" });
          setFormErrors({});
        }}
        onOk={handleSubmit}
        okText={editId ? "Update" : "Submit"}
        cancelText="Cancel"
        width={screens.xs ? "90%" : "700px"}
        className={darkMode ? "dark-modal" : ""}
        style={{ top: screens.xs ? "16px" : "50px" }}
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
            { label: "Company", name: "company" }
          ].map(({ label, name, required = false, type = "text" }) => (
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
                  borderColor: formErrors[name] ? '#ff4d4f' : (darkMode ? "#555" : "#d9d9d9")
                }}
              />
              {formErrors[name] && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                  {formErrors[name]}
                </div>
              )}
            </div>
          ))}
          
          {/* Country Dropdown */}
          <div>
            <label style={{ 
              color: darkMode ? "#f1f1f1" : "inherit", 
              display: 'block', 
              marginBottom: '8px' 
            }}>
              Country
            </label>
            <Select
              showSearch
              placeholder="Select a country"
              value={formData.country || undefined}
              onChange={handleCountryChange}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              className={darkMode ? "dark-select" : ""}
              style={{
                width: '100%',
                backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                color: darkMode ? "#f1f1f1" : "inherit",
                borderColor: formErrors.country ? '#ff4d4f' : (darkMode ? "#555" : "#d9d9d9")
              }}
              dropdownStyle={{
                backgroundColor: darkMode ? "#2d2d2d" : "#fff",
                color: darkMode ? "#f1f1f1" : "inherit"
              }}
            >
              {countries.map(country => (
                <Option key={country} value={country} style={{ color: darkMode ? "#f1f1f1" : "inherit" }}>
                  {country}
                </Option>
              ))}
            </Select>
            {formErrors.country && (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                {formErrors.country}
              </div>
            )}
          </div>
          
          {[
            { label: "Phone", name: "phone", type: "phone" },
            { label: "Email", name: "email", type: "email" }
          ].map(({ label, name, required = false, type = "text" }) => (
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
                  borderColor: formErrors[name] ? '#ff4d4f' : (darkMode ? "#555" : "#d9d9d9")
                }}
              />
              {formErrors[name] && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                  {formErrors[name]}
                </div>
              )}
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
        
        .dark-select .ant-select-selector {
          background-color: #2d2d2d !important;
          color: #f1f1f1 !important;
          border-color: #555 !important;
        }
        
        .dark-select .ant-select-arrow {
          color: #f1f1f1 !important;
        }
        
        .dark-select .ant-select-selection-placeholder {
          color: #8c8c8c !important;
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
        
        .delete-button {
          background-color: #ff4d4f !important;
          border-color: #ff4d4f !important;
          color: white !important;
        }
        
        .delete-button:hover, .delete-button:focus {
          background-color: #d9363e !important;
          border-color: #d9363e !important;
          color: white !important;
        }
        
        .dark-mobile-card {
          background-color: #1f1f1f !important;
          border-color: #444 !important;
        }
        
        .mobile-person-card {
          padding: 8px;
          border-radius: 4px;
          margin: 4px 0;
        }
        
        @media (max-width: 576px) {
          .people-container {
            padding: 16px !important;
            margin-left: 0 !important;
          }
          
          .people-header {
            align-items: center !important;
          }
          
          .people-title {
            text-align: center !important;
            width: 100% !important;
          }
          
          .people-actions {
            width: 100% !important;
          }
          
          .ai-command-container h3 {
            text-align: center !important;
          }
          
          .ai-command-container .ant-space-compact {
            flex-direction: column;
          }
          
          .ai-command-container .ant-space-compact > * {
            width: 100% !important;
            margin-bottom: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default Peoples;