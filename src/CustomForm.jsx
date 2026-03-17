import CryptoJS from "crypto-js";
import { onValue, push, ref, remove } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { DarkModeContext } from "./DarkModeContext";
import "./custom.css";
import { db } from "./firebase";

const SECRET_KEY = "your-strong-secret-key-32-chars"; // Must match other components

const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

const availableFields = [
  { name: "name", label: "Name", type: "text", icon: "user" },
  { name: "phone", label: "Phone", type: "tel", icon: "phone" },
  { name: "email", label: "Email", type: "email", icon: "envelope" },
  { name: "address", label: "Address", type: "text", icon: "map-marker" },
  { name: "pincode", label: "Pincode", type: "text", icon: "map-pin" },
  { name: "city", label: "City", type: "text", icon: "building" },
  { name: "id", label: "ID", type: "text", icon: "id-card" },
  { 
    name: "leadstatus", 
    label: "Lead Status", 
    type: "dropdown", 
    options: ["OnProcess", "Complete", "Cancelled"],
    icon: "chart-line" 
  }
];

const CustomForm = () => {
  const { darkMode } = useContext(DarkModeContext);
  const [selectedFields, setSelectedFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
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

    const userCustomFormRef = ref(db, `users/${userId}/customform`);
    const unsubscribe = onValue(userCustomFormRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const leadsArray = Object.keys(data).map((key) => {
          try {
            const bytes = CryptoJS.AES.decrypt(data[key].encryptedData, SECRET_KEY);
            const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            return { id: key, ...decrypted };
          } catch (error) {
            console.error("Decryption failed for lead:", key, error);
            return { id: key, error: "Invalid data" };
          }
        });
        setLeads(leadsArray);
      } else {
        setLeads([]);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const handleAddField = (field) => {
    if (!selectedFields.some((f) => f.name === field.name)) {
      setSelectedFields((prevFields) => [...prevFields, field]);
      setFormData((prevData) => ({ 
        ...prevData, 
        [field.name]: field.type === "dropdown" ? field.options[0] : "" 
      }));
    }
  };

  const handleRemoveField = (fieldName) => {
    setSelectedFields((prevFields) => prevFields.filter((field) => field.name !== fieldName));
    setFormData((prevData) => {
      const newData = { ...prevData };
      delete newData[fieldName];
      return newData;
    });
  };

  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      Swal.fire({
        title: "Error!",
        text: "User not authenticated. Please log in again.",
        icon: "error",
        background: darkMode ? "#2a2a3a" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000"
      });
      return;
    }

    try {
      const submissionData = {
        ...formData,
        leadstatus: formData.leadstatus || "OnProcess",
        createdAt: new Date().toISOString()
      };
      
      const encryptedData = encryptData(submissionData);
      await push(ref(db, `users/${userId}/customform`), { encryptedData });
      
      Swal.fire({
        title: "Success!",
        text: "Custom Lead added successfully!",
        icon: "success",
        background: darkMode ? "#2a2a3a" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000"
      });
      setFormData({});
    } catch (error) {
      console.error("Submission error:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to add custom lead.",
        icon: "error",
        background: darkMode ? "#2a2a3a" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000"
      });
    }
  };

  const handleDeleteAllLeads = () => {
    if (!userId) {
      Swal.fire({
        title: "Error!",
        text: "User not authenticated. Please log in again.",
        icon: "error",
        background: darkMode ? "#2a2a3a" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000"
      });
      return;
    }

    if (leads.length === 0) {
      Swal.fire({
        title: "No Leads",
        text: "There are no leads to delete.",
        icon: "info",
        background: darkMode ? "#2a2a3a" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000"
      });
      return;
    }

    Swal.fire({
      title: "Delete All Leads?",
      text: `This will permanently delete all ${leads.length} leads. This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete all!",
      background: darkMode ? "#2a2a3a" : "#ffffff",
      color: darkMode ? "#ffffff" : "#000000"
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          await remove(ref(db, `users/${userId}/customform`));
          Swal.fire({
            title: "Deleted!",
            text: `All ${leads.length} leads have been deleted.`,
            icon: "success",
            background: darkMode ? "#2a2a3a" : "#ffffff",
            color: darkMode ? "#ffffff" : "#000000"
          });
        } catch (error) {
          console.error("Error deleting leads:", error);
          Swal.fire({
            title: "Error!",
            text: "Failed to delete leads. Please try again.",
            icon: "error",
            background: darkMode ? "#2a2a3a" : "#ffffff",
            color: darkMode ? "#ffffff" : "#000000"
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className={`content-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Left Side - Form Builder */}
      <div className={`form-container ${darkMode ? 'dark-form' : ''}`}>
        <h2 className={`form-title ${darkMode ? 'text-light' : ''}`}>
          <i className={`fas fa-pencil-alt me-2 ${darkMode ? 'text-light' : ''}`}></i>
          Custom Lead Form Builder
        </h2>
        
        <div className="field-selection">
          <label className={`form-section-label ${darkMode ? 'text-light' : ''}`}>
            <i className={`fas fa-plus-circle me-2 ${darkMode ? 'text-light' : ''}`}></i>
            Available Fields
          </label>
          <div className="field-buttons">
            {availableFields.map((field) => (
              <button
                key={field.name}
                className={`btn btn-add-field ${darkMode ? 'dark-btn' : ''}`}
                onClick={() => handleAddField(field)}
                type="button"
                disabled={selectedFields.some(f => f.name === field.name)}
              >
                <i className={`fas fa-${field.icon} me-2 ${darkMode ? 'text-dark' : ''}`}></i>
                {field.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-scroll-container">
          <form onSubmit={handleSubmit} className="form-content">
            {selectedFields.length > 0 ? (
              <div className="form-group">
                {selectedFields.map((field) => (
                  <div key={field.name} className={`field-container ${darkMode ? 'dark-field' : ''}`}>
                    <label className={`input-label ${darkMode ? 'text-light' : ''}`}>
                      <i className={`fas fa-${field.icon} me-2 ${darkMode ? 'text-light' : ''}`}></i>
                      {field.label}
                    </label>
                    <div className="input-group">
                      {field.type === "dropdown" ? (
                        <select
                          name={field.name}
                          className={`form-input ${darkMode ? 'dark-input' : ''}`}
                          value={formData[field.name] || field.options[0]}
                          onChange={handleChange}
                          required
                        >
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          className={`form-input ${darkMode ? 'dark-input' : ''}`}
                          value={formData[field.name] || ""}
                          onChange={handleChange}
                          required
                        />
                      )}
                      <button
                        type="button"
                        className={`btn-remove-field ${darkMode ? 'dark-btn' : ''}`}
                        onClick={() => handleRemoveField(field.name)}
                      >
                        <i className={`fas fa-trash-alt ${darkMode ? 'text-dark' : ''}`}></i>
                      </button>
                    </div>
                  </div>
                ))}
                <button type="submit" className={`btn-submit ${darkMode ? 'dark-btn' : ''}`}>
                  <i className={`fas fa-paper-plane me-2 ${darkMode ? 'text-dark' : ''}`}></i>
                  Submit Lead
                </button>
              </div>
            ) : (
              <div className="empty-form-message">
                <i className={`fas fa-magic ${darkMode ? 'text-light' : ''}`}></i>
                <p className={darkMode ? 'text-light' : ''}>Add fields to build your custom form</p>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Right Side - Leads Data */}
      <div className={`data-container ${darkMode ? 'dark-data' : ''}`}>
        <div className="data-header">
          <h2 className={`data-title ${darkMode ? 'text-light' : ''}`}>
            <i className={`fas fa-database me-2 ${darkMode ? 'text-light' : ''}`}></i>
            Leads Data
          </h2>
          <div className="data-header-actions">
            <div className="data-count-container">
              <div className={`data-count ${darkMode ? 'dark-btn' : ''}`}>
                {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
              </div>
              <button
                onClick={handleDeleteAllLeads}
                disabled={leads.length === 0 || loading || !userId}
                className="btn-delete-all1"
              >
                <i className="fas fa-trash-alt me-2"></i>
                {loading ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
        
        <div className={`leads-list ${darkMode ? 'dark-leads' : ''}`}>
          {leads.length > 0 ? (
            leads.map((lead) => (
              <div key={lead.id} className={`lead-item ${darkMode ? 'dark-lead-item' : ''}`}>
                <div className="lead-header">
                  <span className="lead-id">#{lead.id.substring(0, 6)}</span>
                  {lead.leadstatus && (
                    <span className={`lead-status ${lead.leadstatus.toLowerCase()}`}>
                      {lead.leadstatus}
                    </span>
                  )}
                </div>
                <div className="lead-content">
                  {Object.entries(lead).filter(([key]) => key !== 'id').map(([key, value]) => (
                    <div key={key} className="lead-field">
                      <span className={`field-name ${darkMode ? 'text-light' : ''}`}>{key}:</span>
                      <span className={`field-value ${darkMode ? 'text-light' : ''}`}>
                        {value || <em className="text-muted">Not set</em>}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="lead-footer">
                  {lead.createdAt && (
                    <span className={`lead-date ${darkMode ? 'text-light' : ''}`}>
                      <i className={`fas fa-calendar-alt me-1 ${darkMode ? 'text-light' : ''}`}></i>
                      {new Date(lead.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-data-message">
              <i className={`fas fa-inbox ${darkMode ? 'text-light' : ''}`}></i>
              <p className={darkMode ? 'text-light' : ''}>No leads found. Create your first lead!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomForm;