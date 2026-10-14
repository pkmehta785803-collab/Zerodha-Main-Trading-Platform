import React from "react";

function Universe() {
  return (
    <div className="container mt-5">
      <div className="row text-center">
        <h1>The Zerodha Universe</h1>
        <p>
          Extend your trading and investment experience even further with our
          partner platforms
        </p>

        <div className="col-4 p-3 mt-5">
          <img src="https://zerodha.com/static/images/partners/zerodhafundhouse.png" alt="Zerodha Fund House" />
          <p className="text-small text-muted">Direct mutual funds</p>
        </div>
        <div className="col-4 p-3 mt-5">
          <img src="https://zerodha.com/static/images/products/streak-logo.png" alt="Streak" />
          <p className="text-small text-muted">Strategy building and backtesting</p>
        </div>
        <div className="col-4 p-3 mt-5">
          <img src="https://zerodha.com/static/images/products/sensibull-logo.svg" alt="Sensibull" />
          <p className="text-small text-muted">Options trading platform</p>
        </div>
        <div className="col-4 p-3 mt-5">
          <img src="https://zerodha.com/static/images/products/smallcase-logo.png" alt="smallcase" />
          <p className="text-small text-muted">Thematic investment platform</p>
        </div>
        <div className="col-4 p-3 mt-5">
          <img src="https://zerodha.com/static/images/partners/tijori.svg" alt="Tijori" />
          <p className="text-small text-muted">Investment research platform</p>
        </div>
        <div className="col-4 p-3 mt-5">
          <img src="https://zerodha.com/static/images/products/ditto-logo.png" alt="Ditto" />
          <p className="text-small text-muted">Insurance advisory</p>
        </div>
        <button
          className="p-2 btn btn-primary fs-5 mb-5"
          style={{ width: "20%", margin: "0 auto" }}
        >
          Signup Now
        </button>
      </div>
    </div>
  );
}

export default Universe;
