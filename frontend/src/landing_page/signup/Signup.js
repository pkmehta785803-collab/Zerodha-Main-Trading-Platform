import React, { useState } from "react";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

function Signup() {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSubmitted(false);
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("http://localhost:3001/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Signup failed.");
      }

      localStorage.setItem("zerodha-token", data.token);
      localStorage.setItem("zerodha-user", JSON.stringify(data.user));
      setStatusMessage(data.message || "Account created successfully.");
      setErrorMessage("");
      setSubmitted(true);
      setForm(initialForm);
    } catch (error) {
      setSubmitted(false);
      setErrorMessage(
        error instanceof TypeError
          ? "Cannot reach the signup API at http://localhost:3001. Start the backend from the backend folder (npm start) and check http://localhost:3001/health."
          : error.message || "Could not create account. Please try again."
      );
    }
  };

  return (
    <main className="container py-5" style={{ maxWidth: "560px", minHeight: "60vh" }}>
      <h1 className="mb-3">Open your Zerodha account</h1>
      <p className="text-muted mb-4">Create a real account using your name, email, phone number, and password.</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label" htmlFor="signup-name">Full name</label>
          <input id="signup-name" className="form-control" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="signup-email">Email</label>
          <input id="signup-email" className="form-control" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="signup-phone">Mobile number</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
            <input
              id="signup-phone"
              className="form-control"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              name="phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))}
              placeholder="10-digit mobile number"
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="signup-password">Password</label>
          <input id="signup-password" className="form-control" type="password" name="password" value={form.password} onChange={handleChange} minLength={6} placeholder="At least 6 characters" required />
        </div>

        <button className="btn btn-primary w-100" type="submit">Create account</button>
      </form>

      {errorMessage && <p className="alert alert-danger mt-3" role="alert">{errorMessage}</p>}
      {submitted && <p className="alert alert-success mt-3" role="status">{statusMessage}</p>}
      {submitted && (
        <a className="btn btn-primary w-100 mt-3" href="http://localhost:3004/">
          Continue to dashboard
        </a>
      )}
    </main>
  );
}

export default Signup;
