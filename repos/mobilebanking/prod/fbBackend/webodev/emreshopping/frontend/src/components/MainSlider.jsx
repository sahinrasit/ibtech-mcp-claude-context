// src/components/MainSlider.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./MainSlider.css";

const MainSlider = () => {
  const [sliderData, setSliderData] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:16666/api/slider")
      .then((res) => setSliderData(res.data))
      .catch((err) => console.error("Slider API Error:", err));
  }, []);

  return (
    <div className="slider-container">
      {sliderData.map((item) => (
        <div className="slider-item" key={item.id}>
          <img src={item.image} alt={item.title} />
          <h3>{item.title}</h3>
        </div>
      ))}
    </div>
  );
};

export default MainSlider;
