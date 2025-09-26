import React from 'react';
import useFetch from '../../hooks/useFetch';
import campaignService from '../../services/campaignService';
import './QuickLinks.css';

const QuickLinks = () => {
  const { data: links, loading, error } = useFetch(campaignService.getAllCampaigns, []);

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!links || links.length === 0) return null;

  return (
    <div className="quick-links-container">
      <h2>Hızlı Linkler</h2>
      <div className="quick-links-grid">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.link}
            className="quick-link-card"
          >
            <img src={link.image} alt={link.title} />
            <h3>{link.title}</h3>
          </a>
        ))}
      </div>
    </div>
  );
};

export default QuickLinks; 