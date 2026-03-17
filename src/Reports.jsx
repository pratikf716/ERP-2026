import { onValue, ref, remove } from "firebase/database";
import { useContext, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DarkModeContext } from "./DarkModeContext";
import { db } from "./firebase";
import "./Reports.css";

const Reports = () => {
  const { darkMode } = useContext(DarkModeContext);
  const [invoiceData, setInvoiceData] = useState({
    paid: 0,
    pending: 0,
    totalAmount: 0,
    loading: true
  });

  const [leadsData, setLeadsData] = useState({
    count: 0,
    loading: true
  });

  const [customersData, setCustomersData] = useState({
    count: 0,
    loading: true
  });

  const [chartData, setChartData] = useState([]);
  const [paymentData, setPaymentData] = useState({
    totalPayments: 0,
    totalAmount: 0,
    monthlyPayments: Array(12).fill(0).map((_, i) => ({
      month: new Date(0, i).toLocaleString("en-US", { month: "short" }),
      amount: 0,
      count: 0
    })),
    loading: true
  });

  const handleDelete = (type) => {
    let path = "";
    const userId = localStorage.getItem('userId');
    
    switch(type) {
      case "paid":
      case "pending":
        path = userId ? `users/${userId}/invoices` : "invoices";
        break;
      case "leads":
        path = userId ? `users/${userId}/leads` : "leads";
        break;
      case "customers":
        path = userId ? `users/${userId}/customers` : "customers";
        break;
      case "payments":
        path = userId ? `users/${userId}/payments` : "payments";
        break;
      default:
        return;
    }

    if (window.confirm(`Are you sure you want to delete all ${type} records?`)) {
      const dbRef = ref(db, path);
      remove(dbRef)
        .then(() => {
          alert(`All ${type} records deleted successfully`);
        })
        .catch((error) => {
          alert(`Error deleting ${type} records: ${error.message}`);
        });
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    // Fetch invoices from user-specific path
    const invoicesPath = userId ? `users/${userId}/invoices` : "invoices";
    const invoicesRef = ref(db, invoicesPath);
    const unsubscribeInvoices = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const invoices = Object.values(data);
        const paidInvoices = invoices.filter(
          (invoice) => invoice.status === "Paid"
        );
        const pendingInvoices = invoices.filter(
          (invoice) => invoice.status === "Pending"
        );

        let totalPaidAmount = 0;
        const monthlyData = Array(12)
          .fill(0)
          .map((_, index) => ({
            name: new Date(0, index).toLocaleString("en-US", {
              month: "short"
            }),
            payment: 0
          }));

        paidInvoices.forEach((invoice) => {
          const amount = parseFloat(invoice.total) || 0;
          totalPaidAmount += amount;

          const month = new Date(invoice.date).getMonth();
          monthlyData[month].payment += amount;
        });

        setInvoiceData({
          paid: paidInvoices.length,
          pending: pendingInvoices.length,
          totalAmount: totalPaidAmount,
          loading: false
        });

        setChartData(monthlyData);
      } else {
        setInvoiceData({
          paid: 0,
          pending: 0,
          totalAmount: 0,
          loading: false
        });
        setChartData([]);
      }
    });

    // Fetch leads from user-specific path
    const leadsPath = userId ? `users/${userId}/leads` : "leads";
    const leadsRef = ref(db, leadsPath);
    const unsubscribeLeads = onValue(leadsRef, (snapshot) => {
      const data = snapshot.val();
      setLeadsData({
        count: data ? Object.keys(data).length : 0,
        loading: false
      });
    });

    // Fetch customers from user-specific path
    const customersPath = userId ? `users/${userId}/customers` : "customers";
    const customersRef = ref(db, customersPath);
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      setCustomersData({
        count: data ? Object.keys(data).length : 0,
        loading: false
      });
    });

    // Fetch payments from user-specific path
    if (userId) {
      const paymentsRef = ref(db, `users/${userId}/payments`);
      const unsubscribePayments = onValue(paymentsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const payments = Object.values(data);
          let totalAmount = 0;
          
          // Initialize monthly data
          const monthlyPayments = Array(12)
            .fill(0)
            .map((_, index) => ({
              month: new Date(0, index).toLocaleString("en-US", { month: "short" }),
              amount: 0,
              count: 0
            }));

          payments.forEach((payment) => {
            const amount = parseFloat(payment.amount) || 0;
            totalAmount += amount;

            // Extract month from payment date (assuming format MM/DD/YYYY)
            if (payment.date) {
              const dateParts = payment.date.split('/');
              if (dateParts.length === 3) {
                const month = parseInt(dateParts[0]) - 1; // Convert to 0-indexed month
                if (month >= 0 && month <= 11) {
                  monthlyPayments[month].amount += amount;
                  monthlyPayments[month].count += 1;
                }
              }
            }
          });

          setPaymentData({
            totalPayments: payments.length,
            totalAmount: totalAmount,
            monthlyPayments: monthlyPayments,
            loading: false
          });
        } else {
          setPaymentData({
            totalPayments: 0,
            totalAmount: 0,
            monthlyPayments: Array(12).fill(0).map((_, i) => ({
              month: new Date(0, i).toLocaleString("en-US", { month: "short" }),
              amount: 0,
              count: 0
            })),
            loading: false
          });
        }
      });

      // Cleanup on unmount
      return () => {
        unsubscribeInvoices();
        unsubscribeLeads();
        unsubscribeCustomers();
        unsubscribePayments();
      };
    } else {
      // Cleanup on unmount (without payments)
      return () => {
        unsubscribeInvoices();
        unsubscribeLeads();
        unsubscribeCustomers();
      };
    }
  }, []);

  // Custom chart colors based on dark mode
  const chartColors = {
    barFill: darkMode ? '#6c63ff' : '#007bff',
    textColor: darkMode ? '#ffffff' : '#333333',
    background: darkMode ? '#2a2a3a' : '#ffffff',
    tooltipBg: darkMode ? '#1a1a2e' : '#ffffff',
    axisColor: darkMode ? '#e0e0e0' : '#666666',
    gridColor: darkMode ? '#3a3a4a' : '#e0e0e0'
  };

  // Prepare chart data with both invoice payments and payment records
  const combinedChartData = Array(12)
    .fill(0)
    .map((_, index) => {
      const monthName = new Date(0, index).toLocaleString("en-US", { month: "short" });
      
      // Find invoice payment for this month
      const invoiceMonth = chartData.find(item => item.name === monthName);
      
      return {
        name: monthName,
        invoicePayments: invoiceMonth ? invoiceMonth.payment : 0,
        directPayments: paymentData.monthlyPayments[index]?.amount || 0,
        totalPayments: (invoiceMonth ? invoiceMonth.payment : 0) + (paymentData.monthlyPayments[index]?.amount || 0)
      };
    });

  return (
    <div className={`main-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="report-container">
        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-12">
            <div className="summary-cards-container">
              {[
                { title: "Paid Invoices", amount: invoiceData.paid, color: "success", type: "paid" },
                { title: "Pending Invoices", amount: invoiceData.pending, color: "danger", type: "pending" },
                { title: "Total Leads", amount: leadsData.count, color: "primary", type: "leads" },
                { title: "Total Clients", amount: customersData.count, color: "dark", type: "customers" },
                { title: "Total Payments", amount: paymentData.totalPayments, color: "info", type: "payments" }
              ].map((item, index) => (
                <div className="summary-card" key={index}>
                  <div className={`card shadow p-3 ${darkMode ? 'dark-card' : ''}`}>
                    <h6 className={`fw-bold ${darkMode ? 'text-light' : ''}`}>{item.title}</h6>
                    <div className="d-flex justify-content-between align-items-center">
                      <span
                        className={`badge bg-${item.color}`}
                        style={{ fontSize: "14px" }}
                      >
                        {item.amount}
                      </span>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(item.type)}
                        disabled={item.amount === 0}
                      >
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className={`card shadow p-4 ${darkMode ? 'dark-card' : ''}`}>
          <h5 className={`fw-bold mb-3 ${darkMode ? 'text-light' : ''}`}>Monthly Payments</h5>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={combinedChartData}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: chartColors.textColor }}
                stroke={chartColors.axisColor}
              />
              <YAxis 
                tick={{ fill: chartColors.textColor }}
                stroke={chartColors.axisColor}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: chartColors.tooltipBg,
                  borderColor: chartColors.axisColor,
                  color: chartColors.textColor
                }}
              />
              <Legend />
              <Bar 
                dataKey="invoicePayments" 
                fill={chartColors.barFill}
                name="Invoice Payments"
              />
              <Bar 
                dataKey="directPayments" 
                fill={darkMode ? '#4ecdc4' : '#28a745'}
                name="Direct Payments"
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3">
            <h6 className={darkMode ? 'text-light' : ''}>
              Total Paid Invoice Amount:{" "}
              <span className="text-success">
                ₹{invoiceData.totalAmount.toFixed(2)}
              </span>
            </h6>
            <h6 className={darkMode ? 'text-light' : ''}>
              Total Direct Payment Amount:{" "}
              <span className="text-success">
                ₹{paymentData.totalAmount.toFixed(2)}
              </span>
            </h6>
            <h6 className={darkMode ? 'text-light' : ''}>
              Combined Total:{" "}
              <span className="text-success">
                ₹{(invoiceData.totalAmount + paymentData.totalAmount).toFixed(2)}
              </span>
            </h6>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;