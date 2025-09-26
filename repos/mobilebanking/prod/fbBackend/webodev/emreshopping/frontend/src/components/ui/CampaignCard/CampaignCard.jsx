import React from 'react';
import './CampaignCard.css';

const CampaignCard = ({ campaign }) => {
  if (!campaign) return null;
  
  return (
    <div className="campaign-card">
      <div className="campaign-image">
        <img src={campaign.image} alt={campaign.title} />
      </div>
      <div className="campaign-content">
        <h3 className="campaign-title">{campaign.title}</h3>
      </div>
    </div>
  );
};

export default CampaignCard; 