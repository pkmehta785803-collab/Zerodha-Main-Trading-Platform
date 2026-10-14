import React, { useState, useEffect } from "react";
import axios from "axios";
import { VerticalGraph } from "./VerticalGraph";

const Holdings = () => {
  const [allHoldings, setAllHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    axios
      .get("http://localhost:3001/allHoldings")
      .then((response) => {
        if (isMounted) {
          setAllHoldings(
            response.data.map((stock) => ({
              ...stock,
              qty: Number(stock.qty),
              avg: Number(stock.avg),
              price: Number(stock.price),
              isLoss: stock.isLoss === true || Number(stock.isLoss) === 1,
            }))
          );
          setError("");
        }
      })
      .catch((requestError) => {
        console.error("Holdings fetch error:", requestError);
        if (isMounted) {
          setError(
            requestError.response?.data?.error ||
              "Could not load holdings from MySQL. Check that the backend is running."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p role="status">Loading holdings from MySQL...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  const totalInvestment = allHoldings.reduce(
    (total, stock) => total + stock.qty * stock.avg,
    0
  );
  const currentValue = allHoldings.reduce(
    (total, stock) => total + stock.qty * stock.price,
    0
  );
  const profitLoss = currentValue - totalInvestment;
  const profitLossPercent = totalInvestment
    ? (profitLoss / totalInvestment) * 100
    : 0;
  const formatAmount = (amount) =>
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const labels = allHoldings.map((subArray) => subArray["name"]);

  const data = {
    labels,
    datasets: [
      {
        label: "Stock Price",
        data: allHoldings.map((stock) => stock.price),
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  return (
    <>
      <h3 className="title">Holdings ({allHoldings.length})</h3>

      {allHoldings.length === 0 ? (
        <p>No holdings are available in MySQL.</p>
      ) : (
        <>
          <div className="order-table">
            <table>
              <thead>
                <tr>
                  <th>Instrument</th>
                  <th>Qty.</th>
                  <th>Avg. cost</th>
                  <th>LTP</th>
                  <th>Cur. val</th>
                  <th>P&amp;L</th>
                  <th>Net chg.</th>
                  <th>Day chg.</th>
                </tr>
              </thead>
              <tbody>
                {allHoldings.map((stock) => {
                  const stockValue = stock.price * stock.qty;
                  const stockProfitLoss = stockValue - stock.avg * stock.qty;
                  const profitClass = stockProfitLoss >= 0 ? "profit" : "loss";
                  const dayClass = stock.isLoss ? "loss" : "profit";

                  return (
                    <tr key={stock._id || stock.name}>
                      <td>{stock.name}</td>
                      <td>{stock.qty}</td>
                      <td>{stock.avg.toFixed(2)}</td>
                      <td>{stock.price.toFixed(2)}</td>
                      <td>{stockValue.toFixed(2)}</td>
                      <td className={profitClass}>{stockProfitLoss.toFixed(2)}</td>
                      <td className={profitClass}>{stock.net}</td>
                      <td className={dayClass}>{stock.day}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="row">
            <div className="col">
              <h5>₹{formatAmount(totalInvestment)}</h5>
              <p>Total investment</p>
            </div>
            <div className="col">
              <h5>₹{formatAmount(currentValue)}</h5>
              <p>Current value</p>
            </div>
            <div className="col">
              <h5>
                ₹{formatAmount(profitLoss)} ({profitLossPercent.toFixed(2)}%)
              </h5>
              <p>P&amp;L</p>
            </div>
          </div>
          <VerticalGraph data={data} />
        </>
      )}
    </>
  );
};

export default Holdings;
