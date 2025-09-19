import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ElectronicDeals.css';

const ElectronicDeals = () => {
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:16666/api/electronic-deals');
        if (response.data && Array.isArray(response.data)) {
          setProducts(response.data);
        } else {
          setError('Geçersiz veri formatı');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching electronic deals:', err);
        setError('Elektronik fırsatlar yüklenirken bir hata oluştu');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % products.length);
      }, 3000);

      return () => clearInterval(timer);
    }
  }, [products]);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error">{error}</div>;
  if (products.length === 0) return null;

  return (
    <div className="electronic-deals">
      <h2>Elektronik Fırsatlar</h2>
      <div className="deals-container">
        {products.map((product, index) => (
          <div
            key={product.id}
            className={`deal-card ${index === currentIndex ? 'active' : ''}`}
            onClick={() => handleProductClick(product.id)}
          >
            <img src={product.imageUrl} alt={product.name} />
            <div className="deal-info">
              <h3>{product.name}</h3>
              <p className="price">{product.price} TL</p>
            </div>
          </div>
        ))}
      </div>
      <div className="deal-dots">
        {products.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ElectronicDeals; 