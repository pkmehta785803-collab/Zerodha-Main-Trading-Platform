import React, { useEffect, useState } from "react";

import { Link } from "react-router-dom";

const Menu = () => {
  const [selectedMenu, setSelectedMenu] = useState(0);
  const [user, setUser] = useState(null);
  const [profileStatus, setProfileStatus] = useState("Loading account...");

  const handleMenuClick = (index) => {
    setSelectedMenu(index);
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await fetch("http://localhost:3001/me", {
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status !== 401) {
            throw new Error(data.error || "Could not load account details.");
          }
          localStorage.removeItem("zerodha-user");
          if (isMounted) {
            setUser(null);
            setProfileStatus("Not logged in");
          }
          return;
        }

        localStorage.setItem("zerodha-user", JSON.stringify(data.user));
        if (isMounted) {
          setUser(data.user);
          setProfileStatus("");
        }
      } catch (error) {
        console.error("Dashboard profile error:", error);
        if (isMounted) {
          setProfileStatus("Could not load account");
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const menuClass = "menu";
  const activeMenuClass = "menu selected";

  return (
    <div className="menu-container">
      <img src="https://zerodha.com/static/images/logo.svg" alt="Zerodha" style={{ width: "100px" }} />
      <div className="menus">
        <ul>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/"
              onClick={() => handleMenuClick(0)}
            >
              <p className={selectedMenu === 0 ? activeMenuClass : menuClass}>
                Dashboard
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/orders"
              onClick={() => handleMenuClick(1)}
            >
              <p className={selectedMenu === 1 ? activeMenuClass : menuClass}>
                Orders
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/holdings"
              onClick={() => handleMenuClick(2)}
            >
              <p className={selectedMenu === 2 ? activeMenuClass : menuClass}>
                Holdings
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/positions"
              onClick={() => handleMenuClick(3)}
            >
              <p className={selectedMenu === 3 ? activeMenuClass : menuClass}>
                Positions
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/funds"
              onClick={() => handleMenuClick(4)}
            >
              <p className={selectedMenu === 4 ? activeMenuClass : menuClass}>
                Funds
              </p>
            </Link>
          </li>
          <li>
            <Link
              style={{ textDecoration: "none" }}
              to="/apps"
              onClick={() => handleMenuClick(6)}
            >
              <p className={selectedMenu === 6 ? activeMenuClass : menuClass}>
                Apps
              </p>
            </Link>
          </li>
        </ul>
        <hr />
        <div className="profile" title={user ? `${user.name} (${user.email})` : profileStatus}>
          <div className="avatar">{initials || "ZU"}</div>
          <div className="profile-details">
            {user ? (
              <>
                <p className="username">{user.name}</p>
                <p className="profile-email">{user.email}</p>
              </>
            ) : (
              <a className="username profile-link" href="http://localhost:3003/login">
                {profileStatus}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
