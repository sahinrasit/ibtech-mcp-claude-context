import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <h1>Emre Shopping</h1>
      </div>
      <div className="search-bar">
        <input type="text" placeholder="Aradığınız ürünü giriniz..." />
        <button className="search-button">Ara</button>
      </div>
      <div className="user-menu">
        <div className="menu-item">
          <span className="icon">👤</span>
          <span>Hesabım</span>
        </div>
        <div className="menu-item">
          <span className="icon">❤️</span>
          <span>Favorilerim</span>
        </div>
        <div className="menu-item">
          <span className="icon">🛒</span>
          <span>Sepetim</span>
        </div>
      </div>
    </header>
  );
};

export default Header; 