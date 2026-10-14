import React, { useEffect, useState } from "react";
import axios from "axios";

const Positions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    axios
      .get("http://localhost:3001/allPositions")
      .then((response) => {
        if (isMounted) {
          setPositions(response.data);
          setError("");
        }
      })
      .catch((requestError) => {
        console.error("Positions fetch error:", requestError);
        if (isMounted) {
          setError(
            requestError.response?.data?.error ||
              "Could not load positions from MySQL. Check that the backend is running."
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
    return <p role="status">Loading positions from MySQL...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <>
      <h3 className="title">Positions ({positions.length})</h3>
      {positions.length === 0 ? (
        <p>No positions are available in MySQL.</p>
      ) : (
        <div className="order-table">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Instrument</th>
                <th>Qty.</th>
                <th>Avg.</th>
                <th>LTP</th>
                <th>P&amp;L</th>
                <th>Chg.</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((stock) => {
                const quantity = Number(stock.qty);
                const average = Number(stock.avg);
                const price = Number(stock.price);
                const currentValue = price * quantity;
                const profitLoss = currentValue - average * quantity;

                return (
                  <tr key={stock._id}>
                    <td>{stock.product}</td>
                    <td>{stock.name}</td>
                    <td>{quantity}</td>
                    <td>{average.toFixed(2)}</td>
                    <td>{price.toFixed(2)}</td>
                    <td className={profitLoss >= 0 ? "profit" : "loss"}>
                      {profitLoss.toFixed(2)}
                    </td>
                    <td className={stock.isLoss ? "loss" : "profit"}>{stock.day}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default Positions;
