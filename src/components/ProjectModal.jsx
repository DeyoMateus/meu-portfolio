import React, { useEffect, useState, useCallback } from "react";

export default function ProjectModal({ project, onClose }) {
  const [expandedImageIndex, setExpandedImageIndex] = useState(null);

  if (!project) return null;

  const images = project.images || [];

  // Funções de navegação para o Lightbox
  const handlePrev = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      setExpandedImageIndex((prev) =>
        prev === 0 ? images.length - 1 : prev - 1,
      );
    },
    [images.length],
  );

  const handleNext = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      setExpandedImageIndex((prev) =>
        prev === images.length - 1 ? 0 : prev + 1,
      );
    },
    [images.length],
  );

  // Suporte a fechar com ESC e navegar pelas setas do teclado apenas no Lightbox
  useEffect(() => {
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (expandedImageIndex !== null) {
          setExpandedImageIndex(null);
        } else {
          onClose();
        }
      } else if (expandedImageIndex !== null) {
        if (e.key === "ArrowLeft") {
          handlePrev();
        } else if (e.key === "ArrowRight") {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, expandedImageIndex, handlePrev, handleNext]);

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
        }}
      >
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          {/* Botão Fechar */}
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar Modal"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* CONTAINER DE IMAGENS (Apenas com scroll, sem setas) */}
          {images.length > 0 && (
            <div
              className="modal-media-scroll"
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                padding: "16px 16px 0 16px",
              }}
            >
              {images.map((imgUrl, index) => (
                <img
                  key={index}
                  src={imgUrl}
                  alt={`${project.title} - Imagem ${index + 1}`}
                  onClick={() => setExpandedImageIndex(index)}
                  title="Clique para expandir"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    objectFit: "cover",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "scale(1.02)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                />
              ))}
            </div>
          )}

          {/* Conteúdo Interno */}
          <div className="modal-body">
            <span className="modal-subtitle">DETALHES DO PROJETO</span>
            <h2 className="modal-title">{project.title}</h2>

            <p className="modal-description">{project.description}</p>

            {project.highlights && project.highlights.length > 0 && (
              <div className="modal-section">
                <h3>Destaques & Arquitetura</h3>
                <ul className="modal-highlights">
                  {project.highlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-section">
              <h3>Stack de Tecnologias</h3>
              <div className="modal-tags">
                {project.tags.map((tag, idx) => (
                  <span key={idx} className="modal-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              {project.demoUrl ? (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-btn-primary"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Visualizar Demo
                </a>
              ) : (
                <span className="modal-private-badge">
                  Projeto Privado / Interno
                </span>
              )}

              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-btn-secondary"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                  Repositório
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LIGHTBOX (TELA CHEIA COM AS SETAS DE NAVEGAÇÃO) */}
      {expandedImageIndex !== null && (
        <div
          onClick={() => setExpandedImageIndex(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            cursor: "zoom-out",
          }}
        >
          {/* Botão fechar */}
          <button
            onClick={() => setExpandedImageIndex(null)}
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              zIndex: 100,
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Seta Esquerda (Apenas no Lightbox, se houver mais de 1 imagem) */}
          {images.length > 1 && (
            <button
              onClick={handlePrev}
              style={{
                position: "absolute",
                left: "24px",
                background: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                fontSize: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 100,
              }}
            >
              ‹
            </button>
          )}

          {/* Imagem Atual Expandida */}
          <img
            src={images[expandedImageIndex]}
            alt="Expandida"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "85%",
              maxHeight: "85%",
              objectFit: "contain",
              borderRadius: "8px",
              cursor: "default",
            }}
          />

          {/* Seta Direita (Apenas no Lightbox, se houver mais de 1 imagem) */}
          {images.length > 1 && (
            <button
              onClick={handleNext}
              style={{
                position: "absolute",
                right: "24px",
                background: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                fontSize: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 100,
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
