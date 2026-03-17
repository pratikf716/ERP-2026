import { onValue, ref, set, get } from 'firebase/database';
import { useContext, useEffect, useState } from 'react';
import { BsArrowDownRight, BsArrowUpRight } from 'react-icons/bs';
import { FiDollarSign, FiFileText, FiUsers, FiPackage, FiTruck, FiX } from 'react-icons/fi';
import { DarkModeContext } from './DarkModeContext';
import './Dashboard.css';
import { db, auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';

// PlanModal Component - Cannot be closed without selecting a plan
const PlanModal = ({ show, onSelectPlan, userEmail, userUid }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();
  const { darkMode } = useContext(DarkModeContext);

  useEffect(() => {
    // Automatically sign out when modal appears
    if (show) {
      const autoSignOut = async () => {
        try {
          await signOut(auth);
          localStorage.removeItem('user');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('sessionStart');
          navigate('/login');
        } catch (error) {
          console.error('Error signing out:', error);
        }
      };
      // Don't auto sign out immediately, wait for user interaction
    }
  }, [show, navigate]);

  if (!show) return null;

  const plans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: '₹699/month',
      features: ['Up to 10 projects', '5GB storage', 'Basic support']
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: '₹1,399/month',
      features: ['Unlimited projects', '50GB storage', 'Priority support', 'Advanced analytics']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: '₹3,499/month',
      features: ['Unlimited projects', '500GB storage', '24/7 support', 'Dedicated account manager', 'Custom integrations']
    }
  ];

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    
    try {
      // Update user subscription in database
      const userRef = ref(db, `users/${userUid}/subscription`);
      await set(userRef, {
        status: 'active',
        plan: selectedPlan,
        subscribedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });
      
      // Call the parent handler
      onSelectPlan(selectedPlan);
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  // Handle attempt to close modal - sign out user
  const handleCloseAttempt = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('sessionStart');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className={`modal-overlay ${darkMode ? 'dark-modal-overlay' : ''}`} onClick={handleCloseAttempt}>
      <div className={`modal-content no-close ${darkMode ? 'dark-modal-content' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${darkMode ? 'dark-modal-header' : ''}`}>
          <h2 className={darkMode ? 'text-light' : ''}>Choose Your Plan</h2>
          <div className={`subscription-required ${darkMode ? 'dark-subscription-required' : ''}`}>
            Subscription Required
          </div>
          <button className={`modal-close-btn ${darkMode ? 'dark-modal-close-btn' : ''}`} onClick={handleCloseAttempt}>
            <FiX size={20} className={darkMode ? 'text-light' : ''} />
          </button>
        </div>
        <div className={`modal-body ${darkMode ? 'dark-modal-body' : ''}`}>
          <p className={`trial-info ${darkMode ? 'text-light' : ''}`}>
            Your 15-day trial for <strong>{userEmail}</strong> has ended. 
            You must select a subscription plan to continue using our services.
          </p>
          
          <div className="plans-container">
            {plans.map(plan => (
              <div 
                key={plan.id} 
                className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${darkMode ? 'dark-plan-card' : ''}`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                <h3 className={darkMode ? 'text-light' : ''}>{plan.name}</h3>
                <p className={`plan-price ${darkMode ? 'text-light' : ''}`}>{plan.price}</p>
                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index} className={darkMode ? 'text-light' : ''}>{feature}</li>
                  ))}
                </ul>
                <div className={`plan-selection ${darkMode ? 'dark-plan-selection' : ''}`}>
                  {selectedPlan === plan.id ? '✓ Selected' : 'Select'}
                </div>
              </div>
            ))}
          </div>

          <div className="subscription-actions">
            <button 
              className={`subscribe-button ${!selectedPlan ? 'disabled' : ''} ${darkMode ? 'dark-subscribe-button' : ''}`}
              onClick={handleSubscribe}
              disabled={!selectedPlan}
            >
              Subscribe Now
            </button>
            <p className={`subscription-note ${darkMode ? 'text-light' : ''}`}>
              You must select a plan to continue using the application.
            </p>
            <p className={`signout-warning ${darkMode ? 'text-light' : ''}`}>
              Click outside this window or the X button to sign out immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoiceCard = () => {
  const { darkMode } = useContext(DarkModeContext);
  const [invoiceData, setInvoiceData] = useState({
    count: 0,
    totalAmount: 0,
    loading: true,
    statusCounts: {
      paid: 0,
      pending: 0,
      draft: 0
    }
  });

  const [leadsData, setLeadsData] = useState({
    count: 0,
    loading: true
  });

  const [customersData, setCustomersData] = useState({
    count: 0,
    loading: true
  });
  
  const [customLeadsData, setCustomLeadsData] = useState({
    onProcess: 0,
    complete: 0,
    cancelled: 0,
    loading: true
  });

  const [ordersData, setOrdersData] = useState({
    pending: 0,
    shipped: 0,
    delivered: 0,
    loading: true
  });

  // Subscription state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('checking');
  const [trialTimeLeft, setTrialTimeLeft] = useState(1296000); // 15 days in seconds
  const [trialTimer, setTrialTimer] = useState(null);
  const navigate = useNavigate();

  // Secret key for decryption (must match the one in CustomForm component)
  const SECRET_KEY = "your-strong-secret-key-32-chars";

  // Check subscription status and track trial time
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      const user = auth.currentUser;
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUser = user || storedUser;
      
      if (currentUser && currentUser.uid) {
        setUserData(currentUser);
        
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        try {
          const snapshot = await get(userRef);
          const userData = snapshot.val();
          
          if (userData) {
            // Check if user has an active subscription
            if (userData.subscription && userData.subscription.status === 'active') {
              setSubscriptionStatus('active');
              setShowSubscriptionModal(false);
              if (trialTimer) {
                clearInterval(trialTimer);
                setTrialTimer(null);
              }
              return;
            }
            
            // Check if user has already used their trial (even if they sign up again)
            const hasUsedTrialBefore = localStorage.getItem(`trialUsed_${currentUser.uid}`);
            
            if (hasUsedTrialBefore === 'true') {
              // User has already used their trial before, show modal immediately
              setSubscriptionStatus('expired');
              setShowSubscriptionModal(true);
              setTrialTimeLeft(0);
              return;
            }
            
            // Check if user is within trial period (15 days)
            const accountCreatedAt = userData.createdAt ? new Date(userData.createdAt) : new Date();
            const trialEndTime = new Date(accountCreatedAt.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days trial
            const now = new Date();
            
            if (now > trialEndTime) {
              // Trial period has ended - mark as used and show modal
              localStorage.setItem(`trialUsed_${currentUser.uid}`, 'true');
              setSubscriptionStatus('expired');
              setShowSubscriptionModal(true);
              setTrialTimeLeft(0);
            } else {
              // Still in trial period
              setSubscriptionStatus('trial');
              const timeUntilTrialEnds = Math.max(0, trialEndTime.getTime() - now.getTime());
              setTrialTimeLeft(Math.floor(timeUntilTrialEnds / 1000));
              
              // Start countdown timer
              if (!trialTimer) {
                const timer = setInterval(() => {
                  setTrialTimeLeft(prev => {
                    if (prev <= 1) {
                      clearInterval(timer);
                      localStorage.setItem(`trialUsed_${currentUser.uid}`, 'true');
                      setSubscriptionStatus('expired');
                      setShowSubscriptionModal(true);
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 1000);
                setTrialTimer(timer);
              }
            }
          } else {
            // User data not found, show modal as precaution
            setSubscriptionStatus('expired');
            setShowSubscriptionModal(true);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setSubscriptionStatus('expired');
          setShowSubscriptionModal(true);
        }
      } else {
        // No user logged in, redirect to login
        navigate('/login');
      }
    };

    checkSubscriptionStatus();

    // Cleanup timer on unmount
    return () => {
      if (trialTimer) {
        clearInterval(trialTimer);
      }
    };
  }, [trialTimer, navigate]);

  // Fetch orders data
  useEffect(() => {
    const fetchOrders = () => {
      const ordersRef = ref(db, 'orders');
      const unsubscribe = onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const ordersList = Object.values(data);
          setOrdersData({
            pending: ordersList.filter(order => 
              order.status && order.status.toLowerCase() === 'pending'
            ).length,
            shipped: ordersList.filter(order => 
              order.status && order.status.toLowerCase() === 'shipped'
            ).length,
            delivered: ordersList.filter(order => 
              order.status && order.status.toLowerCase() === 'delivered'
            ).length,
            loading: false
          });
        } else {
          setOrdersData({
            pending: 0,
            shipped: 0,
            delivered: 0,
            loading: false
          });
        }
      });
      return () => unsubscribe();
    };
    fetchOrders();
  }, []);

  // Fetch custom leads data from users/{uid}/customform
  useEffect(() => {
    const fetchCustomLeads = () => {
      const user = auth.currentUser;
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUser = user || storedUser;
      
      if (currentUser && currentUser.uid) {
        const customLeadsRef = ref(db, `users/${currentUser.uid}/customform`);
        const unsubscribe = onValue(customLeadsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            // Extract leads from the encrypted data structure
            const leadsList = Object.values(data).map(item => {
              try {
                // Decrypt the encrypted data
                if (item.encryptedData) {
                  const bytes = CryptoJS.AES.decrypt(item.encryptedData, SECRET_KEY);
                  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                  return {
                    leadstatus: decryptedData.leadstatus || 'OnProcess'
                  };
                }
                // Fallback to direct data if encryption is not used
                return {
                    leadstatus: item.leadstatus || 'OnProcess'
                };
              } catch (error) {
                console.error('Error processing lead data:', error);
                return { leadstatus: 'OnProcess' };
              }
            });
            
            setCustomLeadsData({
              onProcess: leadsList.filter(lead => 
                lead.leadstatus && (
                  lead.leadstatus.toLowerCase().includes('process') || 
                  lead.leadstatus.toLowerCase() === 'onprocess'
                )
              ).length,
              complete: leadsList.filter(lead => 
                lead.leadstatus && lead.leadstatus.toLowerCase() === 'complete'
              ).length,
              cancelled: leadsList.filter(lead => 
                lead.leadstatus && lead.leadstatus.toLowerCase() === 'cancelled'
              ).length,
              loading: false
            });
          } else {
            setCustomLeadsData({
              onProcess: 0,
              complete: 0,
              cancelled: 0,
              loading: false
            });
          }
        });
        return () => unsubscribe();
      } else {
        setCustomLeadsData({
          onProcess: 0,
          complete: 0,
          cancelled: 0,
          loading: false
        });
      }
    };
    fetchCustomLeads();
  }, []);

  // Fetch invoices and calculate status counts from users/{uid}/invoices
  useEffect(() => {
    const fetchInvoices = () => {
      const user = auth.currentUser;
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUser = user || storedUser;
      
      if (currentUser && currentUser.uid) {
        const invoicesRef = ref(db, `users/${currentUser.uid}/invoices`);
        onValue(invoicesRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const invoiceList = Object.values(data);
            const total = invoiceList.reduce((sum, invoice) => {
              return sum + (parseFloat(invoice.total) || 0);
            }, 0);
            
            const statusCounts = {
              paid: invoiceList.filter(invoice => invoice.status === 'Paid').length,
              pending: invoiceList.filter(invoice => invoice.status === 'Pending').length,
              draft: invoiceList.filter(invoice => invoice.status === 'Draft').length
            };
    
            setInvoiceData({
              count: invoiceList.length,
              totalAmount: total,
              loading: false,
              statusCounts
            });
          } else {
            setInvoiceData({
              count: 0,
              totalAmount: 0,
              loading: false,
              statusCounts: {
                paid: 0,
                pending: 0,
                draft: 0
              }
            });
          }
        });
      } else {
        setInvoiceData({
          count: 0,
          totalAmount: 0,
          loading: false,
          statusCounts: {
            paid: 0,
            pending: 0,
            draft: 0
          }
        });
      }
    };
    fetchInvoices();
  }, []);

  // Fetch leads from users/{uid}/leads path
  useEffect(() => {
    const fetchLeads = () => {
      const user = auth.currentUser;
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUser = user || storedUser;
      
      if (currentUser && currentUser.uid) {
        const leadsRef = ref(db, `users/${currentUser.uid}/leads`);
        onValue(leadsRef, (snapshot) => {
          const data = snapshot.val();
          setLeadsData({
            count: data ? Object.keys(data).length : 0,
            loading: false
          });
        });
      } else {
        setLeadsData({
          count: 0,
          loading: false
        });
      }
    };
    fetchLeads();
  }, []);

  // Fetch customers from users/{uid}/customers path
  useEffect(() => {
    const fetchCustomers = () => {
      const user = auth.currentUser;
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUser = user || storedUser;
      
      if (currentUser && currentUser.uid) {
        const customersRef = ref(db, `users/${currentUser.uid}/customers`);
        onValue(customersRef, (snapshot) => {
          const data = snapshot.val();
          setCustomersData({
            count: data ? Object.keys(data).length : 0,
            loading: false
          });
        });
      } else {
        setCustomersData({
          count: 0,
          loading: 0
        });
      }
    };
    fetchCustomers();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Handle subscription plan selection
  const handleSubscriptionSelect = (plan) => {
    console.log('Selected plan:', plan);
    setShowSubscriptionModal(false);
    // Refresh the page or update UI as needed
    window.location.reload();
  };

  // Format time for trial countdown
  const formatTime = (seconds) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else {
      return `${mins}m ${secs}s`;
    }
  };

  // Custom Rupee icon component
  const RupeeIcon = () => (
    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>₹</span>
  );

  // Cash Flow Pipeline Data
  const cashFlowStages = [
    { name: 'Draft', value: invoiceData.statusCounts.draft, color: '#080808ff', icon: <FiFileText /> },
    { name: 'Pending', value: invoiceData.statusCounts.pending, color: '#83a6ed', icon: <FiFileText /> },
    { name: 'Paid', value: invoiceData.statusCounts.paid, color: '#8dd1e1', icon: <RupeeIcon /> }, // Replaced FiDollarSign with RupeeIcon
    { name: 'Overdue', value: 0, color: '#82ca9d', icon: <FiFileText /> },
    { name: 'Cancelled', value: customLeadsData.cancelled, color: '#a4de6c', icon: <FiFileText /> }
  ];

  // Order Fulfillment Pipeline Data
  const orderStages = [
    { name: 'Pending', value: ordersData.pending, color: '#FFA500', icon: <FiPackage /> },
    { name: 'Shipped', value: ordersData.shipped, color: '#1E90FF', icon: <FiTruck /> },
    { name: 'Delivered', value: ordersData.delivered, color: '#32CD32', icon: <FiPackage /> }
  ];

  const totalOrders = ordersData.pending + ordersData.shipped + ordersData.delivered;

  // Handle click anywhere on dashboard for users without subscription
  useEffect(() => {
    const handleDashboardClick = () => {
      if (subscriptionStatus === 'expired' && !showSubscriptionModal) {
        setShowSubscriptionModal(true);
      }
    };

    if (subscriptionStatus === 'expired') {
      // Add click event listener to the whole document
      document.addEventListener('click', handleDashboardClick);
      
      // Cleanup
      return () => {
        document.removeEventListener('click', handleDashboardClick);
      };
    }
  }, [subscriptionStatus, showSubscriptionModal]);

  return (
    <div className={`dashboard-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Subscription Modal - Cannot be closed without selection */}
      <PlanModal 
        show={showSubscriptionModal}
        onSelectPlan={handleSubscriptionSelect}
        userEmail={userData?.email}
        userUid={userData?.uid}
      />
      
      {/* Trial Countdown Banner */}
      {subscriptionStatus === 'trial' && (
        <div className={`trial-banner ${darkMode ? 'dark-trial-banner' : ''}`}>
          <div className="trial-content">
            <span className={`trial-text ${darkMode ? 'text-light' : ''}`}>
              Your 15-day free trial ends in: <strong>{formatTime(trialTimeLeft)}</strong>
            </span>
            <div className={`trial-progress ${darkMode ? 'dark-trial-progress' : ''}`}>
              <div 
                className={`trial-progress-bar ${darkMode ? 'dark-trial-progress-bar' : ''}`} 
                style={{ width: `${((1296000 - trialTimeLeft) / 1296000) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Card Grid Section */}
      <div className="card-grid">
        {/* Invoice Count Card */}
        <div className={`dashboard-card ${darkMode ? 'dark-card' : ''}`}>
          <div className="card-header">
            <span className={`card-title ${darkMode ? 'text-light' : ''}`}>Total Invoices</span>
            <div className={`card-icon ${darkMode ? 'dark-icon' : ''}`}>
              <FiFileText size={18} className={darkMode ? 'text-light' : ''} />
            </div>
          </div>
          <div className={`card-value ${darkMode ? 'text-light' : ''}`}>
            {invoiceData.loading ? '...' : invoiceData.count}
          </div>
          <div className={`card-footer ${darkMode ? 'text-light' : ''}`}>
            <BsArrowUpRight className="trend-up" />
            <span style={{ marginLeft: 4 }}>This Month</span>
          </div>
        </div>

        {/* Invoice Total Card */}
        <div className={`dashboard-card ${darkMode ? 'dark-card' : ''}`}>
          <div className="card-header">
            <span className={`card-title ${darkMode ? 'text-light' : ''}`}>Total Amount</span>
            <div className={`card-icon ${darkMode ? 'dark-icon' : ''}`}>
              <span className={darkMode ? 'text-light' : ''}>₹</span>
            </div>
          </div>
          <div className={`card-value ${darkMode ? 'text-light' : ''}`}>
            {invoiceData.loading ? '...' : (
              <span>
                ₹{invoiceData.totalAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            )}
          </div>
          <div className={`card-footer ${darkMode ? 'text-light' : ''}`}>
            <BsArrowUpRight className="trend-up" />
            <span style={{ marginLeft: 4 }}>This Month</span>
          </div>
        </div>

        {/* Leads Count Card */}
        <div className={`dashboard-card ${darkMode ? 'dark-card' : ''}`}>
          <div className="card-header">
            <span className={`card-title ${darkMode ? 'text-light' : ''}`}>Total Leads</span>
            <div className={`card-icon ${darkMode ? 'dark-icon' : ''}`}>
              <FiUsers size={18} className={darkMode ? 'text-light' : ''} />
            </div>
          </div>
          <div className={`card-value ${darkMode ? 'text-light' : ''}`}>
            {leadsData.loading ? '...' : leadsData.count}
          </div>
          <div className={`card-footer ${darkMode ? 'text-light' : ''}`}>
            <BsArrowDownRight className="trend-down" />
            <span style={{ marginLeft: 4 }}>This Month</span>
          </div>
        </div>

        {/* Customers Count Card */}
        <div className={`dashboard-card ${darkMode ? 'dark-card' : ''}`}>
          <div className="card-header">
            <span className={`card-title ${darkMode ? 'text-light' : ''}`}>Total Clients</span>
            <div className={`card-icon ${darkMode ? 'dark-icon' : ''}`}>
              <FiUsers size={18} className={darkMode ? 'text-light' : ''} />
            </div>
          </div>
          <div className={`card-value ${darkMode ? 'text-light' : ''}`}>
            {customersData.loading ? '...' : customersData.count}
          </div>
          <div className={`card-footer ${darkMode ? 'text-light' : ''}`}>
            <BsArrowUpRight className="trend-up" />
            <span style={{ marginLeft: 4 }}>Active</span>
          </div>
        </div>
      </div>

      {/* Cash Flow Pipeline Section */}
      <div className={`pipeline-section ${darkMode ? 'dark-section' : ''}`}>
        <h3 className={`section-title ${darkMode ? 'text-light' : ''}`}>Cash Flow Pipeline</h3>
        <div className="pipeline-container">
          {cashFlowStages.map((stage, index) => (
            <div key={index} className={`pipeline-stage ${darkMode ? 'dark-pipeline-stage' : ''}`}>
              <div className="stage-header">
                <div className={`stage-icon ${darkMode ? 'dark-stage-icon' : ''}`}>
                  {stage.icon}
                </div>
                <span className={`stage-name ${darkMode ? 'text-light' : ''}`}>{stage.name}</span>
                <span className={`stage-value ${darkMode ? 'text-light' : ''}`}>{stage.value}</span>
              </div>
              <div className={`stage-bar-container ${darkMode ? 'dark-stage-bar-container' : ''}`}>
                <div 
                  className="stage-bar" 
                  style={{
                    width: `${(stage.value / Math.max(1, invoiceData.count)) * 100}%`,
                    backgroundColor: stage.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Fulfillment Pipeline Section */}
      {/* <div className={`pipeline-section ${darkMode ? 'dark-section' : ''}`}>
        <h3 className={`section-title ${darkMode ? 'text-light' : ''}`}>Order Fulfillment Pipeline</h3>
        <div className="pipeline-container">
          {orderStages.map((stage, index) => (
            <div key={index} className={`pipeline-stage ${darkMode ? 'dark-pipeline-stage' : ''}`}>
              <div className="stage-header">
                <div className={`stage-icon ${darkMode ? 'dark-stage-icon' : ''}`}>
                  {stage.icon}
                </div>
                <span className={`stage-name ${darkMode ? 'text-light' : ''}`}>{stage.name}</span>
                <span className={`stage-value ${darkMode ? 'text-light' : ''}`}>
                  {stage.value} ({totalOrders > 0 ? Math.round((stage.value / totalOrders) * 100) : 0}%)
                </span>
              </div>
              <div className={`stage-bar-container ${darkMode ? 'dark-stage-bar-container' : ''}`}>
                <div 
                  className="stage-bar" 
                  style={{
                    width: `${(stage.value / Math.max(1, totalOrders)) * 100}%`,
                    backgroundColor: stage.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div> */}

      {/* Table Section with Real-time Invoice Status */}
      <div className={`table-section ${darkMode ? 'dark-section' : ''}`}>
        <h3 className={`section-title ${darkMode ? 'text-light' : 'text-dark'}`}>Quotes Overview</h3>
        <table className={`data-table ${darkMode ? 'dark-table' : ''}`}>
          <thead>
            <tr>
              <th className={darkMode ? 'text-light' : 'text-dark'}>Invoices</th>
              <th className={darkMode ? 'text-light' : 'text-dark'}>Custom Leads</th>
              {/* <th className={darkMode ? 'text-light' : 'text-dark'}>Orders</th> */}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Draft ({invoiceData.statusCounts.draft})
                </span>
              </td>
              <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  On Process ({customLeadsData.onProcess || 0})
                </span>
              </td>
              {/* <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Pending ({ordersData.pending || 0})
                </span>
              </td> */}
            </tr>
            <tr>
              <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Pending ({invoiceData.statusCounts.pending})
                </span>
              </td>
              <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Complete ({customLeadsData.complete || 0})
                </span>
              </td>
              {/* <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Shipped ({ordersData.shipped || 0})
                </span>
              </td> */}
            </tr>
            <tr>
              <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Paid ({invoiceData.statusCounts.paid})
                </span>
              </td>
              <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Cancelled ({customLeadsData.cancelled || 0})
                </span>
              </td>
              {/* <td>
                <span className={`status-badge1 ${darkMode ? 'dark-badge' : ''}`}>
                  Delivered ({ordersData.delivered || 0})
                </span>
              </td> */}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Progress Section */}
      <div className={`progress-section ${darkMode ? 'dark-section' : ''}`}>
        <h3 className={`section-title ${darkMode ? 'text-light' : 'text-dark'}`}>Clients Analytics</h3>
        <div className="progress-container">
          <div className="circular-progress">
            <svg className="progress-circle" viewBox="0 0 100 100">
              <circle className={`progress-bg ${darkMode ? 'dark-progress-bg' : ''}`} cx="50" cy="50" r="45" />
              <circle className={`progress-fill ${darkMode ? 'dark-progress-fill' : ''}`} cx="50" cy="50" r="45" strokeDasharray="450" strokeDashoffset="300" />
            </svg>
            <div className={`progress-text ${darkMode ? 'text-light' : 'text-dark'}`}>50%</div>
          </div>
          <p className={`progress-label ${darkMode ? 'text-light' : 'text-dark'}`}>New Clients This Month</p>
          <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
            <div className="stats-item">
              <div className={`stats-value ${darkMode ? 'text-light' : 'text-dark'}`}>
                {customersData.loading ? '...' : customersData.count}
              </div>
              <div className={`stats-label ${darkMode ? 'text-light' : 'text-dark'}`}>Total Clients</div>
            </div>
            <div className="stats-item">
              <div className={`stats-value ${darkMode ? 'text-light' : 'text-dark'}`}>50%</div>
              <div className={`stats-label ${darkMode ? 'text-light' : 'text-dark'}`}>Conversion Rate</div>
            </div>
            <div className="stats-item">
              <div className={`stats-value ${darkMode ? 'text-light' : 'text-dark'}`}>
                ₹{invoiceData.totalAmount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <div className={`stats-label ${darkMode ? 'text-light' : 'text-dark'}`}>Total Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;