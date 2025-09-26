import React from 'react';
import QuickLinks from '../../components/QuickLinks/QuickLinks';
import MainSlider from '../../components/MainSlider/MainSlider';
import ElectronicDeals from '../../components/ElectronicDeals/ElectronicDeals';
import PersonalRecommendations from '../../components/PersonalRecommendations/PersonalRecommendations';
import VisitedProducts from '../../components/VisitedProducts/VisitedProducts';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <MainSlider />
      <QuickLinks />
      <ElectronicDeals />
      <PersonalRecommendations />
      <VisitedProducts />
    </div>
  );
};

export default Home; 