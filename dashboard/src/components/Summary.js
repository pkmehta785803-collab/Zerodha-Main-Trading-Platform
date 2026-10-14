import React, { useEffect, useState } from "react";
import axios from "axios";

const Summary = () => {
  const [holdings, setHoldings] = useState([]);
  const [holdingsStatus, setHoldingsStatus] = useState("loading");
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    let isMounted = true;

    axios
      .get("http://localhost:3001/allHoldings")
      .then((response) => {
        if (isMounted) {
          setHoldings(
            response.data.map((stock) => ({
              ...stock,
              qty: Number(stock.qty),
              avg: Number(stock.avg),
              price: Number(stock.price),
            }))
          );
          setHoldingsStatus("loaded");
        }
      })
      .catch((error) => {
        console.error("Dashboard holdings fetch error:", error);
        if (isMounted) {
          setHoldingsStatus("error");
        }
      });

    fetch("http://localhost:3001/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (isMounted && data.user?.name) {
          setUserName(data.user.name);
        }
      })
      .catch((error) => {
        console.error("Dashboard account fetch error:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const investment = holdings.reduce(
    (total, stock) => total + stock.qty * stock.avg,
    0
  );
  const currentValue = holdings.reduce(
    (total, stock) => total + stock.qty * stock.price,
    0
  );
  const profitLoss = currentValue - investment;
  const profitLossPercent = investment ? (profitLoss / investment) * 100 : 0;
  const formatAmount = (amount) =>
    amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  return (
    <>
      <div className="username">
        <h6>Hi, {userName}!</h6>
        <hr className="divider" />
      </div>

      <div className="section">
        <span>
          <p>Equity</p>
        </span>

        <div className="data">
          <div className="first">
            <h3>3.74k</h3>
            <p>Margin available</p>
          </div>
          <hr />

          <div className="second">
            <p>
              Margins used <span>0</span>{" "}
            </p>
            <p>
              Opening balance <span>3.74k</span>{" "}
            </p>
          </div>
        </div>
        <hr className="divider" />
      </div>

      <div className="section">
        <span>
          <p>
            Holdings{" "}
            {holdingsStatus === "loaded" ? `(${holdings.length})` : ""}
          </p>
        </span>

        <div className="data">
          <div className="first">
            {holdingsStatus === "loading" ? (
              <p role="status">Loading holdings...</p>
            ) : holdingsStatus === "error" ? (
              <p role="alert">Could not load holdings from MySQL.</p>
            ) : (
              <h3 className={profitLoss >= 0 ? "profit" : "loss"}>
                ₹{formatAmount(profitLoss)}{" "}
                <small>
                  {profitLossPercent >= 0 ? "+" : ""}
                  {profitLossPercent.toFixed(2)}%
                </small>
              </h3>
            )}
            <p>P&L</p>
          </div>
          <hr />

          <div className="second">
            <p>
              Current Value{" "}
              <span>
                {holdingsStatus === "loaded"
                  ? `₹${formatAmount(currentValue)}`
                  : "—"}
              </span>{" "}
            </p>
            <p>
              Investment{" "}
              <span>
                {holdingsStatus === "loaded"
                  ? `₹${formatAmount(investment)}`
                  : "—"}
              </span>{" "}
            </p>
          </div>
        </div>
        <hr className="divider" />
      </div>
    </>
  );
};

export default Summary;
