import React, { useContext, useState } from "react";
import axios from "axios";

import GeneralContext from "./GeneralContext";
import notificationSummary from "./notificationSummary";

import "./BuyActionWindow.css";

const BuyActionWindow = ({ uid, mode = "BUY" }) => {
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockPrice, setStockPrice] = useState(0.0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { closeBuyWindow } = useContext(GeneralContext);

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    const quantity = Number(stockQuantity);
    const price = Number(stockPrice);

    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      setError("Enter a quantity and price greater than zero.");
      return;
    }

    setError("");
    setFeedback("");
    setIsSubmitting(true);
    try {
      const response = await axios.post(
        "http://localhost:3001/newOrder",
        {
          name: uid,
          qty: quantity,
          price,
          mode,
        },
        { withCredentials: true }
      );
      setFeedback(
        `${response.data.message || `${mode} order saved to MySQL.`} ${notificationSummary(response.data.notification)}`
      );
      setIsSaved(true);
    } catch (requestError) {
      console.error("Order save error:", requestError);
      setError(
        requestError.response?.data?.error ||
          "Could not save this order to MySQL. Check that the backend is running and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    closeBuyWindow();
  };

  return (
    <form className="container" id="buy-window" onSubmit={handleOrderSubmit}>
      <div className="regular-order">
        <div className="inputs">
          <fieldset>
            <legend>Qty.</legend>
            <input
              type="number"
              name="qty"
              id="qty"
              min="1"
              step="1"
              onChange={(event) => setStockQuantity(event.target.value)}
              value={stockQuantity}
              required
            />
          </fieldset>
          <fieldset>
            <legend>Price</legend>
            <input
              type="number"
              name="price"
              id="price"
              min="0.05"
              step="0.05"
              onChange={(event) => setStockPrice(event.target.value)}
              value={stockPrice}
              required
            />
          </fieldset>
        </div>
      </div>

      <div className="buttons">
        <span>Order value ₹{(Number(stockQuantity) * Number(stockPrice)).toFixed(2)}</span>
        <div>
          <button className="btn btn-blue" type="submit" disabled={isSubmitting || isSaved}>
            {isSubmitting ? "Saving..." : isSaved ? "Saved" : mode}
          </button>
          <button className="btn btn-grey" type="button" onClick={handleCancelClick}>
            {isSaved ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
    </form>
  );
};

export default BuyActionWindow;
