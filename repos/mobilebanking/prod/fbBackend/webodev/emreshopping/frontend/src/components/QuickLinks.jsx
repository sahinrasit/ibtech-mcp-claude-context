import React, { useEffect, useState } from "react";
import "./QuickLinks.css";
import axios from "axios";

const QuickLinks = () => {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:16666/api/campaigns")
      .then((res) => {
        console.log("📦 API'den gelen kampanyalar:", res.data);
        setCampaigns(res.data);
      })
      .catch((err) => console.error("API Error:", err));
  }, []);

  return (
    <div className="quick-links-container">
      <div className="quick-links-grid">
        {campaigns.map((campaign) => (
          <div className="quick-link-card" key={campaign.id}>
            <img
              src={campaign.image}
              alt={campaign.title || "kampanya"}
              className="quick-link-img"
            />
            {campaign.title && (
              <div className="quick-link-title">{campaign.title}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickLinks;
