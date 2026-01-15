// frontend/src/App.js
import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { FileText, Users, BarChart3, Plus } from "lucide-react";
import "./App.css";

// Pages
import Dashboard from "./pages/Dashboard";
import CreateRFP from "./pages/CreateRFP";
import RFPList from "./pages/RFPList";
import RFPDetail from "./pages/RFPDetail";
import VendorList from "./pages/VendorList";
import CompareProposals from "./pages/CompareProposals";

function Navigation() {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <FileText size={32} />
        <h2>RFP System</h2>
      </div>

      <div className="nav-links">
        <Link to="/" className={isActive("/")}>
          <BarChart3 size={20} />
          <span>Dashboard</span>
        </Link>

        <Link to="/rfps" className={isActive("/rfps")}>
          <FileText size={20} />
          <span>RFPs</span>
        </Link>

        <Link to="/rfps/create" className={isActive("/rfps/create")}>
          <Plus size={20} />
          <span>Create RFP</span>
        </Link>

        <Link to="/vendors" className={isActive("/vendors")}>
          <Users size={20} />
          <span>Vendors</span>
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <div className="app">
      <Navigation />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rfps" element={<RFPList />} />
          <Route path="/rfps/create" element={<CreateRFP />} />
          <Route path="/rfps/:id" element={<RFPDetail />} />
          <Route path="/rfps/:id/compare" element={<CompareProposals />} />
          <Route path="/vendors" element={<VendorList />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
