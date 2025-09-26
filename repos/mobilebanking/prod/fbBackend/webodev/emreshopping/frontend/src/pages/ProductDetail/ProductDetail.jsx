import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { addVisitedProduct } from '../../store/slices/visitedProductsSlice';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:16666/api/products/${id}`);
        setProduct(response.data);
        dispatch(addVisitedProduct(response.data));
        setLoading(false);
      } catch (err) {
        setError('Ürün detayları yüklenirken bir hata oluştu');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, dispatch]);

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
  if (!product) return null;

  return (
    <div className="product-detail">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Geri Dön
      </button>
      <div className="product-content">
        <div className="product-image">
          <img src={product.imageUrl} alt={product.name} />
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="rating">
            {renderStars(product.rating)}
            <span className="review-count">({product.reviewCount} değerlendirme)</span>
          </div>
          <p className="price">{product.price} TL</p>
          <p className="description">{product.description}</p>
          <button className="add-to-cart">Sepete Ekle</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 