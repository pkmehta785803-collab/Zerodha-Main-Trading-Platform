import React from "react";

function Hero() {
  return (
    <section className="container-fluid" id="supportHero">
      <div className="p-5 " id="supportWrapper">
        <h4>Support Portal</h4>
        <a href="#support-tickets">Track Tickets</a>
      </div>
      <div className="row p-5 m-3" id="support-tickets">
        <div className="col-6 p-3">
          <h1 className="fs-3">
            Search for an answer or browse help topics to create a ticket
          </h1>
          <input placeholder="Eg. how do I activate F&O" />
          <br />
          <a href="#support-account-opening">Track account opening</a>
          <a href="#support-segment-activation">Track segment activation</a>
          <a href="#support-intraday-margins">Intraday margins</a>
          <a href="#support-kite-manual">Kite user manual</a>
        </div>
        <div className="col-6 p-3" id="support-faq">
          <h1 className="fs-3">Featured</h1>
          <ol>
            <li>
              <a href="#support-delisting">Current Takeovers and Delisting - January 2024</a>
            </li>
            <li>
              <a href="#support-leverages">Latest Intraday leverages - MIS & CO</a>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

export default Hero;
