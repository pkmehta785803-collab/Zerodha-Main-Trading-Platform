import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    axios
      .get("http://localhost:3001/allOrders")
      .then((response) => {
        if (isMounted) {
          setOrders(response.data);
          setError("");
        }
      })
      .catch((requestError) => {
        console.error("Orders fetch error:", requestError);
        if (isMounted) {
          setError(
            requestError.response?.data?.error ||
              "Could not load orders from MySQL. Check that the backend is running."
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
    return <p role="status">Loading orders from MySQL...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="orders">
        <div className="no-orders">
          <p>You haven't placed any orders today</p>
          <Link to="/" className="btn">
            Get started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="orders">
      <h3 className="title">Orders ({orders.length})</h3>
      <div className="order-table">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Type</th>
              <th>Qty.</th>
              <th>Price</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>{order.name}</td>
                <td>{order.mode}</td>
                <td>{order.qty}</td>
                <td>{Number(order.price).toFixed(2)}</td>
                <td>{new Date(order.placedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
