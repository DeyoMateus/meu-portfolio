import React, { useRef } from "react";

export default function ProjectsGallery({
  projects = [],
  categoryTitle = "Projetos em Destaque",
  onSelectProject, // <-- Prop adicionada para receber a função do App.jsx
}) {
  const carouselRef = useRef(null);

  const scroll = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!projects || projects.length === 0) return null;

  return (
    <div className="pg-container">
      {/* Cabeçalho */}
      <div className="pg-header">
        <span className="pg-title">
          <span className="pg-dot"></span>
          {categoryTitle}
        </span>

        {projects.length > 1 && (
          <div className="pg-nav">
            <button
              onClick={() => scroll("left")}
              aria-label="Anterior"
              className="pg-btn-nav"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Próximo"
              className="pg-btn-nav"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Lista de Cards */}
      <div className="pg-carousel" ref={carouselRef}>
        {projects.map((project) => (
          <div
            key={project.id}
            className="pg-card"
            onClick={() => onSelectProject && onSelectProject(project)}
            title="Clique para ver detalhes"
          >
            {/* Capa */}
            <div className="pg-card-media">
              <img
                src={
                  project.images && project.images.length > 0
                    ? project.images[0]
                    : ""
                }
                alt={project.title}
                loading="lazy"
              />
              <div className="pg-card-overlay" />
            </div>

            {/* Conteúdo */}
            <div className="pg-card-body">
              <h4 className="pg-card-title">{project.title}</h4>
              <p className="pg-card-desc">{project.description}</p>

              {/* Tags */}
              <div className="pg-tags">
                {project.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="pg-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Rodapé / Links */}
            <div
              className="pg-card-footer"
              onClick={(e) => e.stopPropagation()}
            >
              {project.demoUrl ? (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pg-btn-demo"
                >
                  <svg
                    width="12"
                    height="12"
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
                  Demo
                </a>
              ) : (
                <span className="pg-private">Privado</span>
              )}

              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="pg-btn-github"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
