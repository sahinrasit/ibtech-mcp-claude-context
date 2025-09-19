import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PersonalRecommendations.css';

const PersonalRecommendations = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:16666/api/personal-recommendations');
        if (response.data && Array.isArray(response.data)) {
          setProducts(response.data);
        } else {
          setError('Geçersiz veri formatı');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching personal recommendations:', err);
        setError('Öneriler yüklenirken bir hata oluştu');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`full-${i}`} className="star full">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }

    return stars;
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error">{error}</div>;
  if (products.length === 0) return null;

  return (
    <div className="personal-recommendations">
      <h2>Sana Özel Öneriler</h2>
      <div className="recommendations-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className="recommendation-card"
            onClick={() => handleProductClick(product.id)}
          >
            <img src={product.imageUrl} alt={product.name} />
            <div className="product-info">
              <h3>{product.name}</h3>
              <div className="rating">
                {renderStars(product.rating)}
                <span className="review-count">({product.reviewCount})</span>
              </div>
              <p className="price">{product.price} TL</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalRecommendations; 