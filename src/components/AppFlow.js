import React from 'react';

function AppFlow() {
  return (
    <div className="app-flow" style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{
        textAlign: 'center',
        color: '#333',
        marginBottom: '40px',
        fontSize: '2.5rem'
      }}>
        RP Exotics App Flow
      </h1>
      
      <div className="flow-container" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '30px'
      }}>
        <div className="flow-step" style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #007bff'
        }}>
          <h3 style={{
            color: '#007bff',
            marginBottom: '15px',
            fontSize: '1.5rem'
          }}>
            Step 1: Welcome
          </h3>
          <p style={{
            color: '#666',
            lineHeight: '1.6',
            fontSize: '1.1rem'
          }}>
            Welcome to RP Exotics - Your premium exotic car experience. 
            We specialize in high-end vehicles and exceptional service.
          </p>
        </div>
        
        <div className="flow-step" style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #28a745'
        }}>
          <h3 style={{
            color: '#28a745',
            marginBottom: '15px',
            fontSize: '1.5rem'
          }}>
            Step 2: Browse
          </h3>
          <p style={{
            color: '#666',
            lineHeight: '1.6',
            fontSize: '1.1rem'
          }}>
            Explore our collection of exotic vehicles. From luxury sports cars 
            to rare classics, find your perfect match.
          </p>
        </div>
        
        <div className="flow-step" style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #dc3545'
        }}>
          <h3 style={{
            color: '#dc3545',
            marginBottom: '15px',
            fontSize: '1.5rem'
          }}>
            Step 3: Contact
          </h3>
          <p style={{
            color: '#666',
            lineHeight: '1.6',
            fontSize: '1.1rem'
          }}>
            Get in touch with our team for inquiries, test drives, 
            and personalized service. Your dream car awaits.
          </p>
        </div>
      </div>
      
      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <p style={{
          color: '#333',
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}>
          Ready to experience luxury? Contact us today!
        </p>
      </div>
    </div>
  );
}

export default AppFlow; 