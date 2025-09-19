import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="nav-item">
          <span className="main-title">Elektronik</span>
          <div className="submenu">
            <div className="submenu-item">Bilgisayar/Tablet <span>&gt;</span></div>
            <div className="submenu-item">Yazıcılar & Projeksiyon <span>&gt;</span></div>
            <div className="submenu-item">Telefon & Aksesuarlar <span>&gt;</span></div>
            <div className="submenu-item">TV, Görüntü & Ses Sistemleri <span>&gt;</span></div>
            <div className="submenu-item">Beyaz Eşya <span>&gt;</span></div>
            <div className="submenu-item">Klima ve Isıtıcılar <span>&gt;</span></div>
            <div className="submenu-item">Elektrikli Ev Aletleri <span>&gt;</span></div>
            <div className="submenu-item">Foto & Kamera <span>&gt;</span></div>
            <div className="submenu-item">Oyun & Oyun Konsolları <span>&gt;</span></div>
          </div>
        </div>

        <div className="nav-item">
          <span className="main-title">Moda</span>
          <div className="submenu">
            <div className="submenu-item">Kadın Giyim <span>&gt;</span></div>
            <div className="submenu-item">Erkek Giyim <span>&gt;</span></div>
            <div className="submenu-item">Aksesuar <span>&gt;</span></div>
          </div>
        </div>

        <div className="nav-item"><span className="main-title">Ev, Yaşam<br />Kırtasiye, Ofis</span></div>
        <div className="nav-item"><span className="main-title">Oto, Bahçe,<br />Yapı Market</span></div>
        <div className="nav-item"><span className="main-title">Anne, Bebek,<br />Oyuncak</span></div>
        <div className="nav-item"><span className="main-title">Spor,<br />Outdoor</span></div>
        <div className="nav-item"><span className="main-title">Kozmetik,<br />Kişisel Bakım</span></div>
        <div className="nav-item"><span className="main-title">Süpermarket,<br />Pet Shop</span></div>
        <div className="nav-item"><span className="main-title">Kitap, Müzik,<br />Film, Hobi</span></div>
      </div>
    </nav>
  );
};

export default Navbar; 