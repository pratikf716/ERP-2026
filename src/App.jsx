import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import Navbar from "./navbar";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Invoices from "./Invoices";
import Payments from "./Payments";
import QuotesForCustomers from "./QuotesForCustomers";
import Customers from "./Customers";
import Peoples from "./Peoples";
import Companies from "./Companies";
import Leads from "./Leads";
import QuotesForLeads from "./QuotesForLeads";
import Products from "./Products";
import ProductsCategory from "./ProductsCategory";
import Expenses from "./Expenses";
import ExpensesCategory from "./ExpensesCategory";
import Reports from "./Reports";
import Settings from "./Settings";
import CustomForm from "./CustomForm";
import { DarkModeProvider } from "./DarkModeContext";

import Orders from "./orders/Orders";
import Ordermodal from "./orders/OrderModal";
import Chatbox from "./Chatbox";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <DarkModeProvider>
      <Router>
        {/* Main app structure */}
        {user ? (
          <>
            <div className="app-container" style={{ display: "flex" }}>
              <Navbar />
              <div style={{ 
                flexGrow: 1, 
                padding: "20px",
                minHeight: "100vh",
                position: "relative" 
              }}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/quotes-for-customers" element={<QuotesForCustomers />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/peoples" element={<Peoples />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/quotes-for-leads" element={<QuotesForLeads />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products-category" element={<ProductsCategory />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/expenses-category" element={<ExpensesCategory />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/customform" element={<CustomForm />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orderDetails" element={<Ordermodal />} />
                  <Route path="/settings" element={<Settings logout={signOut} />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </div>
            </div>
            <Chatbox />

          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </Router>
    </DarkModeProvider>
  );
}

export default App;