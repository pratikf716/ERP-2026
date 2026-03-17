import { getDatabase, onValue, ref, remove, update } from "firebase/database";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import OrderModal from "./OrderModal";
import "./Orders.css";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });
  const [todayOrders, setTodayOrders] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const db = getDatabase();
    const ordersRef = ref(db, "orders");

    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedOrders = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
          lastUpdatedBy: value.lastUpdatedBy || "System"
        }));

        const newTodayOrders = loadedOrders.filter(order => {
          const orderDate = new Date(order.timestamp);
          const today = new Date();
          return (
            orderDate.getDate() === today.getDate() &&
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getFullYear() === today.getFullYear()
          );
        });

        if (newTodayOrders.length > todayOrders.length) {
          showNewOrderNotification(newTodayOrders.length);
        }

        setTodayOrders(newTodayOrders);
        setOrders(loadedOrders);
      }
    });
  }, []);

  const showNewOrderNotification = (count) => {
    Swal.fire({
      title: 'New Order!',
      text: `You have ${count} new order(s) today!`,
      icon: 'success',
      confirmButtonText: 'View Orders',
      timer: 3000,
      timerProgressBar: true,
      toast: true,
      showConfirmButton: true
    });
  };

  const handleDeleteAllOrders = async () => {
    const confirmDelete = await Swal.fire({
      title: 'Are you sure?',
      text: "This will delete ALL orders permanently.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete all',
      cancelButtonText: 'Cancel'
    });

    if (confirmDelete.isConfirmed) {
      const db = getDatabase();
      const ordersRef = ref(db, "orders");
      try {
        await remove(ordersRef);
        Swal.fire('Deleted!', 'All orders have been deleted.', 'success');
      } catch (error) {
        Swal.fire('Error!', 'Something went wrong while deleting.', 'error');
      }
    }
  };

  const filteredOrders = orders
    .filter(order => {
      if (filter === "all") return true;
      return order.status === filter;
    })
    .filter(order => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        order.id.toLowerCase().includes(searchLower) ||
        order.shipping.firstName.toLowerCase().includes(searchLower) ||
        order.shipping.lastName.toLowerCase().includes(searchLower) ||
        order.shipping.email.toLowerCase().includes(searchLower) ||
        order.status.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

  const totalRevenue = orders.reduce((sum, order) => {
    const orderTotal = order.orderSummary?.total || 0;
    return sum + orderTotal;
  }, 0);

  const pendingOrders = orders.filter(order => order.status === "pending").length;
  const shippedOrders = orders.filter(order => order.status === "shipped").length;
  const deliveredOrders = orders.filter(order => order.status === "delivered").length;

  const handleStatusChange = async (orderId, newStatus) => {
    const { value: person } = await Swal.fire({
      title: 'Update Status',
      text: 'Enter your name to record who changed this status:',
      input: 'text',
      inputPlaceholder: 'Your name',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to enter your name!';
        }
      }
    });

    if (person) {
      const db = getDatabase();
      const orderRef = ref(db, `orders/${orderId}`);
      update(orderRef, {
        status: newStatus,
        lastUpdatedBy: person,
        lastUpdatedAt: new Date().toISOString()
      });

      Swal.fire({
        title: 'Status Updated!',
        text: `Order status changed to ${newStatus} by ${person}`,
        icon: 'success',
        timer: 3000,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#FFC107";
      case "shipped": return "#2196F3";
      case "delivered": return "#4CAF50";
      default: return "#9E9E9E";
    }
  };

  // Mobile Order Card Component
  const MobileOrderCard = ({ order }) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <div className={`mobile-order-card ${order.status}`} onClick={() => setExpanded(!expanded)}>
        <div className="mobile-order-header">
          <div className="order-id">#{order.id.slice(0, 8)}</div>
          <div className="order-date">{new Date(order.timestamp || Date.now()).toLocaleDateString()}</div>
          <div className="order-amount">${order.orderSummary?.total?.toFixed(2) || "0.00"}</div>
        </div>
        
        <div className="mobile-order-customer">
          <div className="customer-avatar">
            {order.shipping.firstName.charAt(0)}{order.shipping.lastName.charAt(0)}
          </div>
          <div className="customer-info">
            <div className="customer-name">
              {order.shipping.firstName} {order.shipping.lastName}
            </div>
            <div className="customer-email">{order.shipping.email}</div>
          </div>
        </div>

        {expanded && (
          <div className="mobile-order-details">
            <div className="detail-row">
              <span>Status:</span>
              <select
                value={order.status || "pending"}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                className="status-select"
                style={{ borderColor: getStatusColor(order.status || "pending") }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="pending">⏳ Pending</option>
                <option value="shipped">🚚 Shipped</option>
                <option value="delivered">✅ Delivered</option>
              </select>
            </div>
            <div className="detail-row">
              <span>Updated By:</span>
              <span>{order.lastUpdatedBy}</span>
            </div>
            <button
              className="view-details-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(order);
                setIsModalOpen(true);
              }}
            >
              View Details
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="orders-dashboard">
      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>Order Management</h1>
          <div className="header-actions">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button>🔍</button>
            </div>
            {!isMobile && (
              <>
                <button className="notification-btn">🔔</button>
                <div className="user-profile">
                  <div className="avatar">AD</div>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="dashboard-content">
          <div className={`stats-grid ${isMobile ? 'mobile-stats' : ''}`}>
            <div className="stat-card revenue">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>Total Revenue</h3>
                <p>${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
            <div className="stat-card total">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h3>Total Orders</h3>
                <p>{orders.length}</p>
              </div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <h3>Pending</h3>
                <p>{pendingOrders}</p>
              </div>
            </div>
            <div className="stat-card shipped">
              <div className="stat-icon">🚚</div>
              <div className="stat-info">
                <h3>Shipped</h3>
                <p>{shippedOrders}</p>
              </div>
            </div>
            <div className="stat-card delivered">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>Delivered</h3>
                <p>{deliveredOrders}</p>
              </div>
            </div>
          </div>

          <div className="orders-controls">
            <div className="filter-tabs">
              <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
                {isMobile ? 'All' : 'All Orders'}
              </button>
              <button className={`filter-tab ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>
                {isMobile ? '⏳' : 'Pending'}
              </button>
              <button className={`filter-tab ${filter === "shipped" ? "active" : ""}`} onClick={() => setFilter("shipped")}>
                {isMobile ? '🚚' : 'Shipped'}
              </button>
              <button className={`filter-tab ${filter === "delivered" ? "active" : ""}`} onClick={() => setFilter("delivered")}>
                {isMobile ? '✅' : 'Delivered'}
              </button>
              {!isMobile && <button>SHOW STATUS 💹📈</button>}
            </div>
            <div className="sort-controls">
              <select value={sortConfig.key} onChange={(e) => requestSort(e.target.value)} className="sort-select">
                <option value="timestamp">Order Date</option>
                <option value="orderSummary.total">Total Amount</option>
                <option value="shipping.firstName">Customer Name</option>
              </select>
              <button onClick={() => requestSort(sortConfig.key)} className="sort-direction">
                {sortConfig.direction === "asc" ? "↑" : "↓"}
              </button>
              <button
                onClick={handleDeleteAllOrders}
                className="delete-all-btn"
              >
                {isMobile ? '🗑️' : '🗑️ Delete All'}
              </button>
            </div>
          </div>

          {isMobile ? (
            <div className="mobile-orders-list">
              {filteredOrders.map((order) => (
                <MobileOrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th onClick={() => requestSort("id")}>Order ID</th>
                    <th onClick={() => requestSort("shipping.firstName")}>Customer</th>
                    <th onClick={() => requestSort("timestamp")}>Date</th>
                    <th onClick={() => requestSort("orderSummary.total")}>Amount</th>
                    <th>Status</th>
                    <th>Updated By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="order-id">#{order.id.slice(0, 8)}</td>
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {order.shipping.firstName.charAt(0)}{order.shipping.lastName.charAt(0)}
                          </div>
                          <div className="customer-info">
                            <div className="customer-name">
                              {order.shipping.firstName} {order.shipping.lastName}
                            </div>
                            <div className="customer-email">{order.shipping.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{new Date(order.timestamp || Date.now()).toLocaleDateString()}</td>
                      <td className="order-amount">${order.orderSummary?.total?.toFixed(2) || "0.00"}</td>
                      <td>
                        <div className="status-cell">
                          <select
                            value={order.status || "pending"}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="status-select"
                            style={{ borderColor: getStatusColor(order.status || "pending") }}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="shipped">🚚 Shipped</option>
                            <option value="delivered">✅ Delivered</option>
                          </select>
                        </div>
                      </td>
                      <td className="updated-by">
                        <div className="person-badge">
                          <span className="person-icon">👤</span>
                          {order.lastUpdatedBy}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsModalOpen(true);
                          }}
                          className="view-details-btn"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setIsModalOpen(false)} isMobile={isMobile} />
      )}
    </div>
  );
}