import React from "react";
import { Link } from "react-router-dom";

function Team() {
  return (
    <div className="container">
      <div className="row p-3 mt-5 border-top">
        <h1 className="text-center ">People</h1>
      </div>

      <div
        className="row p-3 text-muted people-profile"
        style={{ lineHeight: "1.8", fontSize: "1.2em" }}
      >
        <div className="col-12 col-md-6 p-3 text-center">
          <img
            className="people-profile-image"
            src="/media/images/pankaj-kumar.png"
            alt="Pankaj Kumar"
          />
          <h4 className="mt-5">Pankaj Kumar</h4>
          <h6>MCA Student</h6>
        </div>
        <div className="col-12 col-md-6 p-3 people-profile-description">
          <p>
            I am Pankaj Kumar, an MCA student with an interest in web development
            and financial technology. I enjoy learning how modern applications
            are designed and built, and I created this project to strengthen my
            skills in frontend and backend development.
          </p>
          <p>
            I am continually exploring new technologies and working to improve
            my problem-solving skills through practical projects.
          </p>
          <p>
            <Link
              to="/"
              style={{ textDecoration: "none", fontSize: "1.1em", fontWeight: 600 }}
            >
              Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Team;
