import React from 'react';

function AppFlow() {
  return (
    <div className="app-flow">
      <h1>RP Exotics App Flow</h1>
      <div className="flow-container">
        <div className="flow-step">
          <h3>Step 1: Welcome</h3>
          <p>Welcome to RP Exotics - Your premium exotic car experience</p>
        </div>
        <div className="flow-step">
          <h3>Step 2: Browse</h3>
          <p>Explore our collection of exotic vehicles</p>
        </div>
        <div className="flow-step">
          <h3>Step 3: Contact</h3>
          <p>Get in touch with our team for inquiries</p>
        </div>
      </div>
    </div>
  );
}

export default AppFlow; 