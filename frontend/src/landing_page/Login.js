import React, { useState } from "react";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }

      localStorage.setItem("zerodha-token", data.token);
      localStorage.setItem("zerodha-user", JSON.stringify(data.user));
      window.location.assign("http://localhost:3004/");
    } catch (error) {
      setErrorMessage(
        error instanceof TypeError
          ? "Cannot reach the API at http://localhost:3001. Start the backend from the backend folder (npm start) and check http://localhost:3001/health."
          : error.message || "Unable to log in. Please try again."
      );
    }
  };

  return (
    <main className="container py-5" style={{ maxWidth: "480px", minHeight: "60vh" }}>
      <h1 className="mb-3">Login to your account</h1>
      <p className="text-muted mb-4">Use your email and password to access your Zerodha demo account.</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="form-control"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="form-control"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
        </div>

        <button className="btn btn-primary w-100" type="submit">Login</button>
      </form>

      {errorMessage && <p className="alert alert-danger mt-3" role="alert">{errorMessage}</p>}
    </main>
  );
}

export default Login;
