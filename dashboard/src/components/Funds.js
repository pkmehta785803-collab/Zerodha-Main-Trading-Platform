import React, { useState } from "react";
import axios from "axios";
import notificationSummary, { hasNotificationFailure } from "./notificationSummary";
import "./Funds.css";

const STORAGE_KEY = "zerodha-demo-funds";
const INITIAL_FUNDS = {
  openingBalance: 4043.1,
  balance: 4043.1,
  payin: 0,
  payout: 0,
};

const readFunds = () => {
  try {
    const savedFunds = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      savedFunds &&
      Number.isFinite(savedFunds.balance) &&
      savedFunds.balance >= 0 &&
      Number.isFinite(savedFunds.payin) &&
      Number.isFinite(savedFunds.payout)
    ) {
      return { ...INITIAL_FUNDS, ...savedFunds };
    }
  } catch (error) {
    console.error("Could not load demo funds:", error);
  }
  return INITIAL_FUNDS;
};

const formatAmount = (amount) =>
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Funds = () => {
  const [funds, setFunds] = useState(readFunds);
  const [transactionMode, setTransactionMode] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notificationFailed, setNotificationFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openTransaction = (mode) => {
    setTransactionMode(mode);
    setAmount("");
    setError("");
    setMessage("");
    setNotificationFailed(false);
  };

  const closeTransaction = () => {
    setTransactionMode("");
    setError("");
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    const roundedAmount = Math.round(numericAmount * 100) / 100;

    if (
      !Number.isFinite(numericAmount) ||
      !Number.isFinite(roundedAmount) ||
      roundedAmount <= 0
    ) {
      setError("Enter an amount greater than ₹0.");
      return;
    }

    if (transactionMode === "Withdraw" && roundedAmount > funds.balance) {
      setError("Withdrawal amount exceeds your available cash.");
      return;
    }

    const updatedFunds = {
      ...funds,
      balance:
        transactionMode === "Add funds"
          ? funds.balance + roundedAmount
          : funds.balance - roundedAmount,
      payin:
        transactionMode === "Add funds"
          ? funds.payin + roundedAmount
          : funds.payin,
      payout:
        transactionMode === "Withdraw"
          ? funds.payout + roundedAmount
          : funds.payout,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFunds));
    } catch (storageError) {
      console.error("Could not save demo funds:", storageError);
      setError("Could not save this demo transaction. Check browser storage and try again.");
      return;
    }

    setFunds(updatedFunds);
    setIsSubmitting(true);
    try {
      const response = await axios.post(
        "http://localhost:3001/notify-demo-transaction",
        { type: transactionMode, amount: roundedAmount },
        { withCredentials: true }
      );
      setNotificationFailed(hasNotificationFailure(response.data.notification));
      setMessage(
        `${transactionMode} of ₹${formatAmount(roundedAmount)} recorded in demo mode. ${notificationSummary(response.data.notification)}`
      );
    } catch (requestError) {
      console.error("Demo transaction notification error:", requestError);
      const reason =
        requestError.response?.data?.error ||
        "Could not contact the notification service.";
      setNotificationFailed(true);
      setMessage(
        `${transactionMode} of ₹${formatAmount(roundedAmount)} recorded in demo mode. Alerts not sent: ${reason}`
      );
    } finally {
      setIsSubmitting(false);
    }
    closeTransaction();
  };

  return (
    <>
      <div className="funds">
        <p>Demo balance only — no real payment or withdrawal is made.</p>
        <button
          className="btn btn-green"
          type="button"
          onClick={() => openTransaction("Add funds")}
        >
          Add funds
        </button>
        <button
          className="btn btn-blue"
          type="button"
          onClick={() => openTransaction("Withdraw")}
        >
          Withdraw
        </button>
      </div>

      {message && (
        <p
          className={`funds-message${notificationFailed ? " funds-message-warning" : ""}`}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="row">
        <div className="col">
          <span>
            <p>Equity</p>
          </span>

          <div className="table">
            <div className="data">
              <p>Available margin</p>
              <p className="imp colored">{formatAmount(funds.balance)}</p>
            </div>
            <div className="data">
              <p>Used margin</p>
              <p className="imp">3,757.30</p>
            </div>
            <div className="data">
              <p>Available cash</p>
              <p className="imp">{formatAmount(funds.balance)}</p>
            </div>
            <hr />
            <div className="data">
              <p>Opening balance</p>
              <p>{formatAmount(funds.openingBalance)}</p>
            </div>
            <div className="data">
              <p>Current balance</p>
              <p>{formatAmount(funds.balance)}</p>
            </div>
            <div className="data">
              <p>Payin</p>
              <p>{formatAmount(funds.payin)}</p>
            </div>
            <div className="data">
              <p>Payout</p>
              <p>{formatAmount(funds.payout)}</p>
            </div>
            <div className="data">
              <p>SPAN</p>
              <p>0.00</p>
            </div>
            <div className="data">
              <p>Delivery margin</p>
              <p>0.00</p>
            </div>
            <div className="data">
              <p>Exposure</p>
              <p>0.00</p>
            </div>
            <div className="data">
              <p>Options premium</p>
              <p>0.00</p>
            </div>
            <hr />
            <div className="data">
              <p>Collateral (Liquid funds)</p>
              <p>0.00</p>
            </div>
            <div className="data">
              <p>Collateral (Equity)</p>
              <p>0.00</p>
            </div>
            <div className="data">
              <p>Total Collateral</p>
              <p>0.00</p>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="commodity">
            <p>You don't have a commodity account</p>
            <a
              className="btn btn-blue"
              href="http://localhost:3003/signup"
            >
              Open Account
            </a>
          </div>
        </div>
      </div>

      {transactionMode && (
        <div
          className="funds-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTransaction();
            }
          }}
        >
          <section
            className="funds-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="funds-dialog-title"
          >
            <button
              className="funds-dialog-close"
              type="button"
              aria-label="Close"
              onClick={closeTransaction}
            >
              ×
            </button>
            <h2 id="funds-dialog-title">{transactionMode}</h2>
            <p>Available cash: ₹{formatAmount(funds.balance)}</p>
            <form onSubmit={submitTransaction}>
              <label htmlFor="funds-amount">Amount (₹)</label>
              <input
                id="funds-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                autoFocus
              />
              {error && (
                <p className="funds-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className={`btn ${transactionMode === "Add funds" ? "btn-green" : "btn-blue"}`}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending alerts..." : `Confirm ${transactionMode.toLowerCase()}`}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
};

export default Funds;
