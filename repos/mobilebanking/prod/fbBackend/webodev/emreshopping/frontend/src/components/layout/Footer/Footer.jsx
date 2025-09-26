import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">Müşteri Hizmetleri</h3>
          <ul className="footer-links">
            <li><a href="#">Sıkça Sorulan Sorular</a></li>
            <li><a href="#">İade ve Değişim</a></li>
            <li><a href="#">Sipariş İşlemleri</a></li>
            <li><a href="#">Müşteri Hizmetleri</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Kurumsal</h3>
          <ul className="footer-links">
            <li><a href="#">Hakkımızda</a></li>
            <li><a href="#">Kariyer</a></li>
            <li><a href="#">İletişim</a></li>
            <li><a href="#">Kurumsal Müşteriler</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Kategoriler</h3>
          <ul className="footer-links">
            <li><a href="#">Elektronik</a></li>
            <li><a href="#">Moda</a></li>
            <li><a href="#">Ev ve Yaşam</a></li>
            <li><a href="#">Spor ve Outdoor</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Bizi Takip Edin</h3>
          <div className="social-icons">
            <a href="#" className="social-icon">Facebook</a>
            <a href="#" className="social-icon">Twitter</a>
            <a href="#" className="social-icon">Instagram</a>
            <a href="#" className="social-icon">YouTube</a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2023 Emre Shopping. Tüm hakları saklıdır.</p>
      </div>
    </footer>
  );
};

export default Footer; 