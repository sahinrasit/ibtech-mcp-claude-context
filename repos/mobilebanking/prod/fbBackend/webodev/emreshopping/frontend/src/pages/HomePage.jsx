import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Slider from '../components/ui/Slider/Slider';
import QuickLinks from '../components/ui/QuickLinks/QuickLinks';
import useFetch from '../hooks/useFetch';
import campaignService from '../services/campaignService';
import electronicsService from '../services/electronicsService';
import recommendationsService from '../services/recommendationsService';
import CampaignCard from '../components/ui/CampaignCard/CampaignCard';
import ProductCard from '../components/ui/ProductCard/ProductCard';
import { addVisitedProduct } from '../store/slices/visitedProductsSlice';
import './HomePage.css';

const HomePage = () => {
  const dispatch = useDispatch();
  const visitedProducts = useSelector((state) => state.visitedProducts.items);

  const { data: campaigns, loading: campaignsLoading } = useFetch(campaignService.getAllCampaigns, []);
  const { data: electronics, loading: electronicsLoading } = useFetch(electronicsService.getAllElectronics, []);
  const { data: recommendations, loading: recommendationsLoading } = useFetch(recommendationsService.getAllRecommendations, []);

  const handleProductClick = (product) => {
    dispatch(addVisitedProduct(product));
  };

  return (
    <div className="home-page">
      <Slider />
      
      {/* Quick Links */}
      <QuickLinks links={campaigns?.slice(0, 8)} />
      
      {/* Kampanyalar */}
      <section className="section campaigns-section">
        <h2 className="section-title">Kampanyalar</h2>
        <div className="campaigns-grid">
          {campaignsLoading ? (
            <div className="loading">Kampanyalar yükleniyor...</div>
          ) : (
            campaigns?.map(campaign => (
              <div className="campaign-item" key={campaign.id}>
                <CampaignCard campaign={campaign} />
              </div>
            ))
          )}
        </div>
      </section>
      
      {/* Elektronik Fırsatlar */}
      <section className="section electronics-section">
        <h2 className="section-title">Elektronik Fırsatlar</h2>
        <div className="products-grid">
          {electronicsLoading ? (
            <div className="loading">Ürünler yükleniyor...</div>
          ) : (
            electronics?.slice(0, 3).map(product => (
              <div className="product-item" key={product.id} onClick={() => handleProductClick(product)}>
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </section>
      
      {/* Önerilen Ürünler */}
      <section className="section recommendations-section">
        <h2 className="section-title">Sana Özel Öneriler</h2>
        <div className="products-grid">
          {recommendationsLoading ? (
            <div className="loading">Öneriler yükleniyor...</div>
          ) : (
            recommendations?.slice(0, 5).map(product => (
              <div className="product-item" key={product.id} onClick={() => handleProductClick(product)}>
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Gezilen Ürünler */}
      <section className="section visited-products-section">
        <h2 className="section-title">Gezilen Ürünler</h2>
        <div className="products-grid">
          {visitedProducts.length === 0 ? (
            <div className="no-products">Henüz ürün gezilmedi</div>
          ) : (
            visitedProducts.map(product => (
              <div className="product-item" key={product.id}>
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage; 