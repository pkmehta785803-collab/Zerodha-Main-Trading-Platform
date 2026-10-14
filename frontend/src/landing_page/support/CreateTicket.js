import React from "react";

const supportLinks = [
  "Online Account Opening",
  "Offline Account Opening",
  "Company, Partnership and HUF Account",
  "Opening",
  "NRI Account Opening",
  "Charges at Zerodha",
  "Zerodha IDFC FIRST Bank 3-in-1 Account",
  "Getting Started",
];

function CreateTicket() {
  return (
    <div className="container">
      <div className="row p-5 mt-5 mb-5">
        <h1 className="fs-2">To create a ticket, select a relevant topic</h1>

        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="col-4 p-5 mt-2 mb-2">
            <h4 className="">
              <i className="fa fa-plus-circle" aria-hidden="true"></i> Account Opening
            </h4>
            {supportLinks.map((link) => (
              <div key={`${item}-${link}`}>
                <a href="#support-topic" style={{ textDecoration: "none", lineHeight: "2.5" }}>
                  {link}
                </a>
                <br />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CreateTicket;
