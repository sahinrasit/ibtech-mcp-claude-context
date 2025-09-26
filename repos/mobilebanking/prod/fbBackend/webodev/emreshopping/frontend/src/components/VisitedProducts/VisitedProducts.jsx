import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setVisitedProducts, setLoading, setError } from '../../store/slices/visitedProductsSlice';
import './VisitedProducts.css';

const VisitedProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useSelector((state) => state.visitedProducts);

  useEffect(() => {
    const fetchVisitedProducts = async () => {
      try {
        dispatch(setLoading(true));
        const response = await axios.get('http://localhost:3000/api/visited-products');
        if (response.data && Array.isArray(response.data)) {
          dispatch(setVisitedProducts(response.data));
        } else {
          dispatch(setError('Geçersiz veri formatı'));
        }
        dispatch(setLoading(false));
      } catch (err) {
        console.error('Error fetching visited products:', err);
        dispatch(setError('Gezilen ürünler yüklenirken bir hata oluştu'));
        dispatch(setLoading(false));
      }
    };

    fetchVisitedProducts();
  }, [dispatch]);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error">{error}</div>;
  if (items.length === 0) return null;

  return (
    <div className="visited-products">
      <h2>Gezilen Ürünler</h2>
      <div className="visited-products-grid">
        {items.map((visitedProduct) => (
          <div
            key={visitedProduct.id}
            className="visited-product-card"
            onClick={() => handleProductClick(visitedProduct.Product.id)}
          >
            <img src={visitedProduct.Product.imageUrl} alt={visitedProduct.Product.name} />
            <div className="product-info">
              <h3>{visitedProduct.Product.name}</h3>
              <p className="price">{visitedProduct.Product.price} TL</p>
              <p className="visited-time">
                {new Date(visitedProduct.visitedAt).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisitedProducts; 