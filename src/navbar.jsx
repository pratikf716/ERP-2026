import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useEffect, useState } from "react";
import {
  FaBars,
  FaBox,
  FaBuilding,
  FaChartPie,
  FaChevronLeft, FaChevronRight,
  FaClipboardList,
  FaCog, FaComments,
  FaFileInvoiceDollar, FaMoneyBillWave,
  FaTachometerAlt,
  FaTags
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import darkToggleAnim from "./assets/animations/dark-toggle.lottie";
import logo from './assets/erp_logo.png';
import logo2 from './assets/logo/erp.png'
import { DarkModeContext } from "./DarkModeContext";
import "./navbar.css";

const Navbar = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const handleNavLinkClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' }
  };

  const overlayVariants = {
    open: { opacity: 1, pointerEvents: 'auto' },
    closed: { opacity: 0, pointerEvents: 'none' }
  };

  return (
    <>
      {/* Animated Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div 
            className="overlay"
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            transition={{ duration: 0.3 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Hamburger Menu for Mobile */}
      {isMobile && (
        <div 
          className={`hamburger ${darkMode ? 'dark' : ''}`}
          onClick={toggleSidebar}
        >
          <FaBars />
        </div>
      )}

      {/* Animated Sidebar */}
      <motion.div 
        className={`sidebar ${darkMode ? "dark-mode" : ""} ${collapsed ? "collapsed" : ""}`}
        initial={isMobile ? "closed" : "open"}
        animate={sidebarOpen || !isMobile ? "open" : "closed"}
        variants={sidebarVariants}
        transition={{ type: 'tween', duration: 0.3 }}
      >
        <div className="sidebar-header">
          {!collapsed && <img src={logo2} alt="ERP Logo" className="logo-img" />}
          <div 
            className="nav-item" 
            onClick={toggleDarkMode} 
            style={{ cursor: "pointer", width: collapsed ? 40 : 60 }}
          >
            <DotLottieReact
              src={darkToggleAnim}
              loop={true}
              autoplay
            />
          </div>
        </div>

        <ul className="nav-links">
          <motion.li 
            className={location.pathname === "/" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaTachometerAlt size={18} /> 
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/leads" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/leads" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaClipboardList size={18} /> 
              {!collapsed && <span>Leads</span>}
            </Link>
          </motion.li>

          
          <motion.li 
            className={location.pathname === "/customform" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/customform" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaCog size={18} /> 
              {!collapsed && <span>Custom Leads</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/invoices" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/invoices" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaFileInvoiceDollar size={18} /> 
              {!collapsed && <span>Invoices</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/customers" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/customers" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaCog size={18} /> 
              {!collapsed && <span>Clients</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/peoples" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/peoples" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaCog size={18} /> 
              {!collapsed && <span>Peoples</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/payments" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/payments" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaMoneyBillWave size={18} /> 
              {!collapsed && <span>Payments</span>}
            </Link>
          </motion.li>

          {/* <motion.li 
            className={location.pathname === "/orders" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/orders" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaMoneyBillWave size={18} /> 
              {!collapsed && <span>Orders</span>}
            </Link>
          </motion.li> */}

          <motion.li 
            className={location.pathname === "/companies" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/companies" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaBuilding size={18} /> 
              {!collapsed && <span>Companies</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/products" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/products" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaBox size={18} /> 
              {!collapsed && <span>Products</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/products-category" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/products-category" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaTags size={18} /> 
              {!collapsed && <span>Products Category</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/report" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/reports" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaChartPie size={18} /> 
              {!collapsed && <span>Report</span>}
            </Link>
          </motion.li>

          <motion.li 
            className={location.pathname === "/settings" ? "active" : ""}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link 
              to="/settings" 
              className="nav-item"
              onClick={handleNavLinkClick}
            >
              <FaCog size={18} /> 
              {!collapsed && <span>Settings</span>}
            </Link>
          </motion.li>
        </ul>

        {/* Collapse/Expand Button */}
        {!isMobile && (
          <div 
            className={`toggle-sidebar ${darkMode ? 'dark' : ''}`}
            onClick={toggleSidebar}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </div>
        )}
      </motion.div>
    </>
  );
};

export default Navbar;