import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Canvas } from "@react-three/fiber";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import ParticleField from "./components/ParticleField";
import ProjectsGallery from "./components/ProjectsGallery";
import ProjectModal from "./components/ProjectModal";
import ContactSection from "./components/ContactSection";
import Navbar from "./components/Navbar";
import { projectsData } from "./data/projects";
import ParticleCanvas from "./components/ParticleCanvas";
import { useTiltEffect } from "./hooks/useTiltEffect";
import { useIsMobile } from "./hooks/useIsMobile";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

export default function App() {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const cardRef = useRef(null);
  const scrollProgress = useRef(0);

  const isMobile = useIsMobile(1280);
  const mobileScrollWrapperRef = useRef(null);

  const [progressState, setProgressState] = useState(0);
  const [activePanel, setActivePanel] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [profileIndex, setProfileIndex] = useState(0);

  const profileCards = [
    {
      title: "Sobre Mim",
      content:
        "Sempre fui movido pelo desejo de fazer mais com menos e de facilitar a rotina das pessoas e empresas. Sou Engenheiro de Produção e Desenvolvedor Full Stack..Trago a visão de quem entende de processos e a experiência de quem transforma códigos em soluções para o seu negócio com foco em resultados.",
    },
    {
      title: "Experiência & Visão",
      content:
        "Vivenciei os desafios da logística, da produção e da gestão de pessoas. Essa vivência criou uma mentalidade voltada para a eliminação de desperdícios de tempo e recursos. Levo essa bagagem para o código, criando sistemas intuitivos que trabalham a favor das pessoas, otimizando operações para gerar economia e aumentar seus ganhos.",
    },
    {
      title: "Motivação",
      content:
        "Acredito que sempre existem oportunidades de melhoramento. O que me motiva a enfrentar problemas complexos é a possibilidade de gerar impactos práticos e mensuráveis por meio das soluções desenvolvidas. Saber que uma solução bem estruturada pode economizar tempo, reduzir custos e contribuir para melhores resultados é o que impulsiona minha busca contínua por evolução e pela geração de valor real.",
    },
    {
      title: "Missão",
      content:
        "Criei a FVF Soluções Tech para dar força a quem empreende, tornando a tecnologia complexa em algo simples e de aplicação imediata. Minha missão é entregar velocidade e segurança com automações e aplicações que devolvem o seu tempo, garantindo que cada entrega gere valor real para o crescimento empresarial.",
    },
    {
      title: "Tech Stack & Ferramentas",
      isTech: true,
      tags: [
        "JavaScript / CSS",
        "React / Next.js",
        "Node.js / Express",
        "NestJS / TypeScript",
        "Docker / Bancos de Dados",
        "Prisma / Sequelize / TypeORM",
        "Eng. de Processos",
      ],
    },
  ];

  useTiltEffect();

  useEffect(() => {
    const updateCardHeight = () => {
      const card = cardRef.current;
      if (!card) return;
      card.style.height = "auto";
      const newHeight = card.scrollHeight;
      card.style.height = `${newHeight}px`;
    };

    updateCardHeight();

    window.addEventListener("resize", updateCardHeight);
    return () => window.removeEventListener("resize", updateCardHeight);
  }, [profileIndex, isMobile]);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track) return;

      const panels = gsap.utils.toArray(".panel");
      if (!panels.length) return;

      const totalPanels = panels.length;
      const PANEL_SELECTOR = `
        .section-tag, h1, .description, .tech-stack,
        .projects-wrapper, .contact-container, .profile-card-container,
        .profile-header, .profile-card-large, .profile-carousel-container,
        .profile-dots-indicator
      `;

      const allPanels = panels.map((panel) => ({
        panel,
        els: panel.querySelectorAll(PANEL_SELECTOR),
      }));

      // ==========================================
      // MOBILE / TABLET (Scroll Vertical)
      // ==========================================
      if (isMobile) {
        const wrapper = mobileScrollWrapperRef.current;
        if (!wrapper) return;

        let rafId = null;

        const updateMobilePanels = () => {
          rafId = null;
          const viewportHeight = window.innerHeight;
          const animationLimit = viewportHeight * 0.35;
          const fadeStart = viewportHeight * 0.4;
          const fadeDistance = fadeStart - animationLimit;

          let closestIndex = 0;
          let closestDistance = Infinity;

          allPanels.forEach(({ panel, els }, index) => {
            const panelRect = panel.getBoundingClientRect();
            const panelCenter = panelRect.top + panelRect.height / 2;
            const contentCenter =
              animationLimit + (viewportHeight - animationLimit) / 2;
            const distance = Math.abs(panelCenter - contentCenter);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }

            els.forEach((element) => {
              const rect = element.getBoundingClientRect();
              let opacity = 1;

              if (rect.bottom <= animationLimit) {
                opacity = 0;
              } else if (rect.bottom < fadeStart) {
                opacity = (rect.bottom - animationLimit) / fadeDistance;
              }

              const enterStart = viewportHeight - fadeDistance;
              if (rect.top > enterStart) {
                const enterOpacity = (viewportHeight - rect.top) / fadeDistance;
                opacity = Math.min(opacity, enterOpacity);
              }

              element.style.opacity = Math.max(0, Math.min(1, opacity));
              element.style.visibility = "visible";
            });
          });

          setActivePanel((previous) =>
            previous !== closestIndex ? closestIndex : previous,
          );
          const progress =
            totalPanels <= 1 ? 0 : closestIndex / (totalPanels - 1);
          scrollProgress.current = progress;
          setProgressState(Math.round(progress * 100) / 100);
        };

        const requestMobileUpdate = () => {
          if (rafId !== null) return;
          rafId = requestAnimationFrame(updateMobilePanels);
        };

        wrapper.addEventListener("scroll", requestMobileUpdate, {
          passive: true,
        });
        window.addEventListener("resize", requestMobileUpdate);
        requestMobileUpdate();

        return () => {
          wrapper.removeEventListener("scroll", requestMobileUpdate);
          window.removeEventListener("resize", requestMobileUpdate);
          if (rafId !== null) cancelAnimationFrame(rafId);

          allPanels.forEach(({ els }) => {
            els.forEach((element) => {
              element.style.opacity = "";
            });
          });
        };
      }

      // ==========================================
      // DESKTOP (Scroll Horizontal Pin)
      // ==========================================
      const clamp01 = gsap.utils.clamp(0, 1);

      const updateDesktopPanels = (progress) => {
        allPanels.forEach(({ els }, index) => {
          const panelCenterProgress = index / (totalPanels - 1);
          const distance = Math.abs(progress - panelCenterProgress);
          let opacity = 0;

          if (distance < 0.25) {
            opacity = clamp01(1 - distance * 4);
          }
          if (index === totalPanels - 1 && progress >= 0.95) {
            opacity = 1;
          }
          els.forEach((element) => {
            element.style.opacity = opacity;
          });
        });
      };

      const horizontalTween = gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 0,
          anticipatePin: 1,
          start: "top top",
          end: () => `+=${Math.max(0, track.scrollWidth - window.innerWidth)}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress;
            scrollProgress.current = progress;
            const currentIndex = Math.round(progress * (totalPanels - 1));

            setActivePanel((previous) =>
              previous !== currentIndex ? currentIndex : previous,
            );
            setProgressState(Math.round(progress * 100) / 100);
            updateDesktopPanels(progress);
          },
        },
      });

      ScrollTrigger.refresh();

      return () => {
        horizontalTween.kill();
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

        allPanels.forEach(({ els }) => {
          els.forEach((element) => {
            element.style.opacity = "";
            element.style.visibility = "";
          });
        });
      };
    },
    { scope: containerRef, dependencies: [isMobile] },
  );

  const handleNavigate = (index) => {
    const track = trackRef.current;
    if (!track) return;

    if (isMobile) {
      const wrapper = mobileScrollWrapperRef.current;
      if (!wrapper) return;

      const panels = track.querySelectorAll(".panel");
      const targetPanel = panels[index];
      if (!targetPanel) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const panelRect = targetPanel.getBoundingClientRect();
      const topOffset = window.innerHeight * 0.35;
      const scrollTop =
        wrapper.scrollTop + (panelRect.top - wrapperRect.top) - topOffset;

      wrapper.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: "smooth",
      });
      return;
    }

    const totalPanels = 5;
    const maxScroll = track.scrollWidth - window.innerWidth;
    const progress = index / (totalPanels - 1);
    const scrollAmount = progress * maxScroll;

    gsap.to(window, {
      scrollTo: { y: scrollAmount },
      duration: 1.2,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  return (
    <>
      {/* BACKGROUND (Somente Desktop) */}
      {!isMobile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <ParticleCanvas />
        </div>
      )}

      <Navbar
        activePanel={activePanel}
        onNavigate={handleNavigate}
        progress={progressState}
      />

      {/* CANVAS PRINCIPAL 3D */}
      <div
        id="canvas-container"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 5,
          width: "100%",
          height: "100%",
          touchAction: "none",
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 9], fov: 60 }}
          dpr={
            isMobile
              ? Math.min(window.devicePixelRatio, 1.5)
              : window.devicePixelRatio
          }
          gl={{
            powerPreference: "high-performance",
            antialias: !isMobile,
            alpha: true,
          }}
          eventSource={document.getElementById("root")}
          eventPrefix="client"
          onCreated={({ gl }) => {
            const canvasEl = gl.domElement;
            const handleLost = (event) => {
              event.preventDefault();
              console.warn(
                "ALERTA: WebGL context perdido, aguardando restauração...",
              );
            };
            const handleRestored = () => {
              console.warn("SUCESSO: WebGL context restaurado.");
            };
            canvasEl.addEventListener("webglcontextlost", handleLost, false);
            canvasEl.addEventListener(
              "webglcontextrestored",
              handleRestored,
              false,
            );
          }}
        >
          <ambientLight intensity={1} />
          <ParticleField scrollProgress={scrollProgress} />
        </Canvas>
      </div>

      {/* CONTEÚDO HTML / UI */}
      <div
        className="mobile-scroll-wrapper"
        ref={mobileScrollWrapperRef}
        style={{ position: "relative", zIndex: 10 }}
      >
        <div className="scroll-container" ref={containerRef}>
          <div className="track" ref={trackRef}>
            {/* PAINEL 01: PERFIL */}
            <section className="panel">
              <div className="content-box profile-card-container">
                <span className="section-tag">VISÃO GERAL &amp; PERFIL</span>
                <div className="profile-header">
                  <div className="profile-avatar-wrapper">
                    <img
                      src="https://paprdnqnkcejxkwagayw.supabase.co/storage/v1/object/public/fotos%20do%20portifolio/Eu.png"
                      alt="Deyo Mateus"
                      className="profile-avatar-img"
                    />
                  </div>
                  <div className="profile-info">
                    <h1>
                      01. <span className="gold">Deyo Mateus</span>
                    </h1>
                    <div className="profile-headline">
                      <span className="profile-title">
                        Desenvolvedor Full Stack &amp; Founder
                      </span>
                      <span className="profile-company-badge">
                        FVF Soluções Tech
                      </span>
                    </div>
                    <p className="profile-tagline">
                      A Engenharia focada em eficiência operacional, economia e
                      impacto no seu negócio.
                    </p>
                  </div>
                </div>

                <div className="profile-carousel-container">
                  <button
                    className="profile-nav-btn"
                    onClick={() =>
                      setProfileIndex((prev) =>
                        prev === 0 ? profileCards.length - 1 : prev - 1,
                      )
                    }
                  >
                    ‹
                  </button>
                  <div className="profile-card-large" ref={cardRef}>
                    <h3>{profileCards[profileIndex].title}</h3>
                    {profileCards[profileIndex].isTech ? (
                      <div
                        className="tech-stack"
                        style={{ marginTop: "0.4rem" }}
                      >
                        {profileCards[profileIndex].tags.map((tag, idx) => (
                          <span key={idx}>{tag}</span>
                        ))}
                      </div>
                    ) : (
                      <p>{profileCards[profileIndex].content}</p>
                    )}
                  </div>
                  <button
                    className="profile-nav-btn"
                    onClick={() =>
                      setProfileIndex((prev) =>
                        prev === profileCards.length - 1 ? 0 : prev + 1,
                      )
                    }
                  >
                    ›
                  </button>
                </div>
              </div>
            </section>

            {/* PAINEL 02: FRONT-END */}
            <section className="panel">
              <div className="content-box">
                <span className="section-tag">UI / UX & INTERAÇÃO</span>
                <h1>
                  02. <span className="gold">Projetos Front-end</span>
                </h1>
                <p className="description">
                  Aplicações intuitivas focadas em usabilidade, animações
                  fluidas e interfaces reativas com atenção aos mínimos
                  detalhes.
                </p>
                <div className="tech-stack">
                  <span>JavaScript</span>
                  <span>Next.js</span>
                  <span>TypeScript</span>
                  <span>React</span>
                  <span>Framer Motion</span>
                  <span>Three.js</span>
                </div>
                <div className="projects-wrapper">
                  <ProjectsGallery
                    projects={projectsData.frontend}
                    categoryTitle="Destaques Front-end"
                    onSelectProject={setSelectedProject}
                  />
                </div>
              </div>
            </section>

            {/* PAINEL 03: BACK-END */}
            <section className="panel">
              <div className="content-box">
                <span className="section-tag">ARQUITETURA & API</span>
                <h1>
                  03. <span className="gold">Projetos Back-end</span>
                </h1>
                <p className="description">
                  Sistemas escaláveis, bancos de dados otimizados e serviços
                  robustos construídos para garantir performance e segurança.
                </p>
                <div className="tech-stack">
                  <span>Node.js</span>
                  <span>NestJs</span>
                  <span>PostgreSQL</span>
                  <span>MongoDB</span>
                  <span>Docker</span>
                  <span>Prisma</span>
                  <span>TypeORM</span>
                  <span>Sequelize</span>
                  <span>Express</span>
                </div>
                <div className="projects-wrapper">
                  <ProjectsGallery
                    projects={projectsData.backend}
                    categoryTitle="Destaques Back-end"
                    onSelectProject={setSelectedProject}
                  />
                </div>
              </div>
            </section>

            {/* PAINEL 04: IA & AUTOMAÇÃO */}
            <section className="panel">
              <div className="content-box">
                <span className="section-tag">INTELIGÊNCIA & AUTOMAÇÃO</span>
                <h1>
                  04. <span className="gold">Projetos IA</span>
                </h1>
                <p className="description">
                  Integração de modelos de linguagem (LLMs), automações
                  inteligentes e soluções de IA aplicadas a produtos do mundo
                  real.
                </p>
                <div className="tech-stack">
                  <span>Python</span>
                  <span>OpenAI / Gemini API</span>
                  <span>LangChain</span>
                </div>
                <div className="projects-wrapper">
                  <ProjectsGallery
                    projects={projectsData.ai}
                    categoryTitle="Automações de IA & Machine Learning"
                    onSelectProject={setSelectedProject}
                  />
                </div>
              </div>
            </section>

            {/* PAINEL 05: CONTATO */}
            <section className="panel">
              <div className="content-box">
                <span className="section-tag">ENTRE EM CONTATO</span>
                <h1>
                  05. <span className="gold">Contato</span>
                </h1>
                <p className="description">
                  Tem um projeto em mente ou deseja conversar sobre
                  oportunidades? Envie uma mensagem ou conecte-se comigo.
                </p>
                <ContactSection />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* MODAL DE PROJETOS */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </>
  );
}
