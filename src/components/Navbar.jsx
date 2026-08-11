import React, { useState } from "react";

const NAV_ITEMS = [
  { id: 0, label: "01. Apresentação" },
  { id: 1, label: "02. Front-end" },
  { id: 2, label: "03. Back-end" },
  { id: 3, label: "04. IA" },
  { id: 4, label: "05. Contato" },
];

export default function Navbar({ activePanel, onNavigate, progress = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (id) => {
    onNavigate(id);
    setMenuOpen(false); // fecha o menu ao escolher uma seção
  };

  return (
    <header className="navbar-header">
      <div
        className="navbar-progress-bar"
        style={{ width: `${Math.min(Math.max(progress * 100, 0), 100)}%` }}
      />

      <div className="navbar-container">
        <div className="navbar-logo">
          <span className="gold">&lt;</span> Deyo Mateus | FVF Soluções Tech{" "}
          <span className="gold">/&gt;</span>
        </div>

        {/* Links normais — some no mobile via CSS */}
        <nav className="navbar-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`nav-link ${activePanel === item.id ? "active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="navbar-dots">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              aria-label={`Ir para a seção ${item.label}`}
              className={`nav-dot ${activePanel === item.id ? "active" : ""}`}
            />
          ))}
        </div>

        {/* Botão hamburguer — só aparece no mobile via CSS */}
        <button
          className={`navbar-toggle ${menuOpen ? "is-open" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Painel do menu mobile */}
      <nav
        className={`navbar-mobile-menu ${menuOpen ? "is-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`navbar-mobile-link ${
              activePanel === item.id ? "active" : ""
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
