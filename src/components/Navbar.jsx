import React, { useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile"; // Ajuste o caminho do import conforme necessário

const NAV_ITEMS = [
  { id: 0, label: "01. Apresentação" },
  { id: 1, label: "02. Front-end" },
  { id: 2, label: "03. Back-end" },
  { id: 3, label: "04. IA" },
  { id: 4, label: "05. Contato" },
];

export default function Navbar({ activePanel, onNavigate, progress = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Utiliza o hook para detectar se está em mobile/tablet estreito (<= 768px)
  const isMobile = useIsMobile(768);

  const handleNavigate = (id) => {
    onNavigate(id);
    setMenuOpen(false); // Fecha o menu ao escolher uma seção
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

        {/* Renderização Condicional baseada no Hook do React */}
        {!isMobile ? (
          /* Links normais aparecem apenas no Desktop (> 768px) */
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
        ) : (
          /* Botão hambúrguer aparece apenas no Mobile/Tablet (<= 768px) */
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
        )}

        {/* Os dots (pontinhos indicadores) continuam independentes se desejar */}
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
