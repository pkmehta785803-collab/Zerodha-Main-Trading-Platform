import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(
    () => window.matchMedia("(min-width: 992px)").matches
  );

  return (
    <nav
      className="navbar border-bottom"
      style={{ backgroundColor: "#FFF" }}
    >
      <div className="container p-2">
        <Link className="navbar-brand" to="/">
          <img
            src="https://zerodha.com/static/images/logo.svg"
            style={{ width: "110px" }}
            alt="Logo"
          />
        </Link>
        <button
          className="navbar-toggler navbar-menu-toggle"
          type="button"
          aria-controls="navbarSupportedContent"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        >
          <span className="navbar-toggler-icon" aria-hidden="true"></span>
        </button>
        <div
          className={`collapse navbar-collapse${isMenuOpen ? " show" : ""}`}
          id="navbarSupportedContent"
        >
          <ul className="navbar-nav ms-auto mb-lg-0">
            <li className="nav-item">
              <NavLink className="nav-link" to="/signup">Signup</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/login">Login</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/about">About</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/product">Products</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/pricing">Pricing</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/support">Support</NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
