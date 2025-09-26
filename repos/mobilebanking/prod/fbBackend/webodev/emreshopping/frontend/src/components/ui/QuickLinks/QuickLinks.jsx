import React from 'react';
import './QuickLinks.css';

const QuickLinks = ({ links }) => {
  return (
    <section className="quick-links-section">
      <div className="quick-links-container">
        {links?.map((link) => (
          <a href={link.url} key={link.id} className="quick-link-card">
            <div className="quick-link-content">
              <h3>{link.title}</h3>
              <p>{link.description}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default QuickLinks; 