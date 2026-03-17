import React, { useState, useEffect, useRef, useContext } from "react";
import { ref, push, set, get, onValue } from "firebase/database";
import { db } from "./firebase";
import Swal from "sweetalert2";
import { DarkModeContext } from "./DarkModeContext";
import "./NewInvoiceForm.css";

const NewInvoiceForm = ({ onSave, onClose, customers = [], companies = [], people = [], darkMode }) => {
  const { darkMode: contextDarkMode } = useContext(DarkModeContext);
  const isDarkMode = darkMode || contextDarkMode;
  const today = new Date().toISOString().split("T")[0];
  const [userId, setUserId] = useState(null);

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const [invoice, setInvoice] = useState({
    number: "",
    clientId: "",
    companyId: "",
    productIds: [],
    personId: "",
    date: today,
    expireDate: today,
    total: "",
    status: "Draft",
    createdBy: "",
  });

  const [products, setProducts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    }, (error) => {
      console.error("Error fetching products:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load products",
        icon: "error",
        background: isDarkMode ? "#2a2a3a" : "#ffffff",
        color: isDarkMode ? "#e0e0e0" : "#000000",
      });
    });
    return () => unsubscribe();
  }, [userId, isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    setInvoice({ ...invoice, [e.target.name]: e.target.value });
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleProductSelection = (productId) => {
    setInvoice((prevInvoice) => {
      const updatedProducts = prevInvoice.productIds.includes(productId)
        ? prevInvoice.productIds.filter((id) => id !== productId)
        : [...prevInvoice.productIds, productId];
      
      // Calculate total based on selected products
      let newTotal = 0;
      updatedProducts.forEach(id => {
        const product = products.find(p => p.id === id);
        if (product && product.price) {
          newTotal += parseFloat(product.price);
        }
      });
      
      return { 
        ...prevInvoice, 
        productIds: updatedProducts,
        total: newTotal.toFixed(2)
      };
    });
  };

  const handleSave = () => {
    if (!userId) {
      Swal.fire({
        title: "Error!",
        text: "User not authenticated. Please log in again.",
        icon: "error",
        background: isDarkMode ? "#2a2a3a" : "#ffffff",
        color: isDarkMode ? "#e0e0e0" : "#000000",
      });
      return;
    }

    if (
      !invoice.number.trim() ||
      !invoice.clientId.trim() ||
      !invoice.companyId.trim() ||
      invoice.productIds.length === 0 ||
      !invoice.personId.trim() ||
      !invoice.date.trim() ||
      !invoice.expireDate.trim() ||
      !invoice.total.trim() ||
      !invoice.createdBy.trim()
    ) {
      Swal.fire({
        title: "Error!",
        text: "All fields are required!",
        icon: "error",
        background: isDarkMode ? "#2a2a3a" : "#ffffff",
        color: isDarkMode ? "#e0e0e0" : "#000000",
      });
      return;
    }

    const totalValue = parseFloat(invoice.total);
    if (isNaN(totalValue) || totalValue <= 0) {
      Swal.fire({
        title: "Error!",
        text: "Total must be a valid number!",
        icon: "error",
        background: isDarkMode ? "#2a2a3a" : "#ffffff",
        color: isDarkMode ? "#e0e0e0" : "#000000",
      });
      return;
    }

    const newInvoiceRef = push(ref(db, `users/${userId}/invoices`));
    set(newInvoiceRef, { ...invoice, total: totalValue })
      .then(() => {
        Swal.fire({
          title: "Success!",
          text: "Invoice added successfully!",
          icon: "success",
          background: isDarkMode ? "#2a2a3a" : "#ffffff",
          color: isDarkMode ? "#e0e0e0" : "#000000",
        });
        onSave();
        onClose();
      })
      .catch((error) => {
        Swal.fire({
          title: "Error!",
          text: "Failed to add invoice. Try again.",
          icon: "error",
          background: isDarkMode ? "#2a2a3a" : "#ffffff",
          color: isDarkMode ? "#e0e0e0" : "#000000",
        });
        console.error("Firebase Error:", error);
      });
  };

  return (
    <div className={`invoice-form ${isDarkMode ? 'dark-mode' : ''}`}>
      <h2 className={isDarkMode ? "dark-text" : ""}>New Invoice</h2>
      <div className={`form-section ${isDarkMode ? 'dark-form-section' : ''}`}>
        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Invoice Number *</label>
          <input
            type="text"
            name="number"
            value={invoice.number}
            onChange={handleChange}
            className={isDarkMode ? "dark-input" : ""}
            placeholder="INV-001"
          />
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Client *</label>
          <select
            name="clientId"
            value={invoice.clientId}
            onChange={handleChange}
            className={isDarkMode ? "dark-select" : ""}
          >
            <option value="">Select Client</option>
            {customers.map((customer) => (
              <option key={customer.value} value={customer.value} className={isDarkMode ? "dark-option" : ""}>
                {customer.label || "Unnamed Client"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Company *</label>
          <select
            name="companyId"
            value={invoice.companyId}
            onChange={handleChange}
            className={isDarkMode ? "dark-select" : ""}
          >
            <option value="">Select Company</option>
            {companies.map((company) => (
              <option key={company.value} value={company.value} className={isDarkMode ? "dark-option" : ""}>
                {company.label || "Unnamed Company"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Products *</label>
          <div className={`dropdown ${isDarkMode ? 'dark-dropdown' : ''}`} ref={dropdownRef}>
            <button
              type="button"
              className={`dropdown-toggle ${isDarkMode ? 'dark-dropdown-toggle' : ''}`}
              onClick={toggleDropdown}
            >
              {invoice.productIds.length > 0 ? `${invoice.productIds.length} selected` : "Select Products"}
            </button>
            <div className={`dropdown-menu ${dropdownOpen ? "show" : ""} ${isDarkMode ? 'dark-dropdown-menu' : ''}`}>
              {products.length > 0 ? (
                products.map((product) => (
                  <label key={product.id} className={`dropdown-item ${isDarkMode ? 'dark-dropdown-item' : ''}`}>
                    <input
                      type="checkbox"
                      checked={invoice.productIds.includes(product.id)}
                      onChange={() => handleProductSelection(product.id)}
                      className={isDarkMode ? "dark-checkbox" : ""}
                    />
                    <span className={isDarkMode ? "dark-product-text" : ""}>
                      {product.name} - {product.price} {product.currency || ""}
                    </span>
                  </label>
                ))
              ) : (
                <div className={`dropdown-item ${isDarkMode ? 'dark-dropdown-item' : ''}`}>
                  No products available. Please add products first.
                </div>
              )}
            </div>
          </div>
          {invoice.productIds.length > 0 && (
            <div className="selected-products">
              <h4>Selected Products:</h4>
              <ul>
                {invoice.productIds.map(id => {
                  const product = products.find(p => p.id === id);
                  return product ? (
                    <li key={id}>
                      {product.name} - {product.price} {product.currency || ""}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Person *</label>
          <select
            name="personId"
            value={invoice.personId}
            onChange={handleChange}
            className={isDarkMode ? "dark-select" : ""}
          >
            <option value="">Select Person</option>
            {people.map((person) => (
              <option key={person.value} value={person.value} className={isDarkMode ? "dark-option" : ""}>
                {person.label || "Unnamed Person"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Date *</label>
          <input
            type="date"
            name="date"
            value={invoice.date}
            onChange={handleChange}
            className={isDarkMode ? "dark-input" : ""}
          />
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Expire Date *</label>
          <input
            type="date"
            name="expireDate"
            value={invoice.expireDate}
            onChange={handleChange}
            className={isDarkMode ? "dark-input" : ""}
          />
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Total Amount *</label>
          <input
            type="text"
            name="total"
            value={invoice.total}
            onChange={handleChange}
            className={isDarkMode ? "dark-input" : ""}
            placeholder="0.00"
            readOnly
          />
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Status *</label>
          <select
            name="status"
            value={invoice.status}
            onChange={handleChange}
            className={isDarkMode ? "dark-select" : ""}
          >
            <option value="Draft" className={isDarkMode ? "dark-option" : ""}>Draft</option>
            <option value="Paid" className={isDarkMode ? "dark-option" : ""}>Paid</option>
            <option value="Pending" className={isDarkMode ? "dark-option" : ""}>Pending</option>
          </select>
        </div>

        <div className="form-group">
          <label className={isDarkMode ? "dark-label" : ""}>Created By *</label>
          <input
            type="text"
            name="createdBy"
            value={invoice.createdBy}
            onChange={handleChange}
            className={isDarkMode ? "dark-input" : ""}
            placeholder="Your name"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className={`cancel-btn ${isDarkMode ? 'dark-cancel-btn' : ''}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`save-btn ${isDarkMode ? 'dark-save-btn' : ''}`}
            onClick={handleSave}
            disabled={products.length === 0}
          >
            Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewInvoiceForm;