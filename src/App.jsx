import React, { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Canvas } from "@react-three/fiber";

import ParticleField from "./components/ParticleField";
import ProjectsGallery from "./components/ProjectsGallery";
import ProjectModal from "./components/ProjectModal";
import ContactSection from "./components/ContactSection";
import Navbar from "./components/Navbar";
import { projectsData } from "./data/projects";
import ParticleCanvas from "./components/ParticleCanvas";
import { useTiltEffect } from "./hooks/useTiltEffect";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const scrollProgress = useRef(0);

  const [progressState, setProgressState] = useState(0);
  const [activePanel, setActivePanel] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);

  // Estado para navegação do carrossel do Painel 01
  const [profileIndex, setProfileIndex] = useState(0);

  const profileCards = [
    {
      title: "Sobre Mim",
      content:
        "Sempre fui movido pelo desejo de facilitar a rotina das pessoas e empresas. Sou Engenheiro de Produção e Desenvolvedor Full Stack. Uno o olhar de quem entende de processos à energia de transformar linhas de código em soluções seguras e escaláveis.",
    },
    {
      title: "Experiência & Visão",
      content:
        "Já vivi a rotina de desafios e melhorias da logística, liderença, produção, análise de dados e gestão de pessoas. Essa vivência me deu uma obsessão. Minimizar o desperdício de tempo e recursos finitos. Levo essa bagagem para o código, criando sistemas leves e intuitivos que trabalham pelas pessoas e não o contrário.",
    },
    {
      title: "Motivação",
      content:
        "Para mim, nada é tão bom que não possa melhorar. Aquele frio na barriga de ver um problema difícil e pensar 'preciso descobrir como resolver isso' é o que me faz buscar a evolução constante. O desafio é o maior combustível.",
    },
    {
      title: "Missão",
      content:
        "Criei a FVF Soluções Tech para não guardar boas ideias só para mim. Minha missão é levar eficiência ao maior número de pessoas, seja com automações inteligentes, aprimoramento no fluxo de atendimento, posicionamento digital ou um ERP robusto que devolva o tempo de quem empreende.",
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

  useGSAP(
    () => {
      const track = trackRef.current;
      const panels = gsap.utils.toArray(".panel");
      const totalPanels = panels.length;

      const PANEL_SELECTOR =
        ".section-tag, h1, .description, .tech-stack, .projects-wrapper, .contact-container, .profile-card-container";

      // TODOS os painéis (incluindo o 01) entram no sistema reativo —
      // é isso que faz o 01 sumir de verdade quando o scroll avança
      // pro 02, em vez de ficar preso em opacidade 1 pra sempre.
      const allPanels = panels.map((panel) => ({
        panel,
        els: panel.querySelectorAll(PANEL_SELECTOR),
      }));

      // Só o Painel 01 ganha aquela entrada bonita com stagger ao
      // carregar a página (os outros começam invisíveis, esperando
      // o scroll trazê-los).
      gsap.fromTo(
        allPanels[0].els,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.08,
          delay: 0.1,
          ease: "power2.out",
        },
      );

      const clamp01 = gsap.utils.clamp(0, 1);
      const mapRange = (value, inMin, inMax, outMin, outMax) => {
        const t = clamp01((value - inMin) / (inMax - inMin));
        return outMin + (outMax - outMin) * t;
      };

      /**
       * Cada painel tem seu "p" (0 a 1) representando sua posição dentro do
       * percurso do scroll horizontal. A janela de visibilidade continua
       * sendo p ∈ [0.25, 0.75] — isso garante que a janela de um painel
       * termina exatamente onde a do próximo começa, sem sobreposição.
       *
       * Dentro dessa janela agora tem 3 fases (só opacidade, sem mover
       * y/x nunca mais):
       *   1. FADE IN  — de p=0.25 até p=0.40: opacidade 0 -> 1
       *   2. PLATÔ    — de p=0.40 até p=0.60: opacidade travada em 1
       *                 (esse é o "ponto de equilíbrio" que você pediu pra
       *                 aumentar — antes era só um instante, agora é uma
       *                 faixa de 0.20, quase metade da janela toda)
       *   3. FADE OUT — de p=0.60 até p=0.75: opacidade 1 -> 0
       */
      function updatePanelTransforms(targets) {
        const width = window.innerWidth;
        const viewportCenter = width / 2;

        // 1. Ampliamos levemente a janela geral do Platô para todos os painéis
        const PLATEAU_START = 0.35;
        const PLATEAU_END = 0.65;

        targets.forEach(({ panel, els }) => {
          const rect = panel.getBoundingClientRect();
          const panelCenter = rect.left + rect.width / 2;

          const p = clamp01(
            mapRange(
              panelCenter,
              viewportCenter + width,
              viewportCenter - width,
              0,
              1,
            ),
          );

          let opacity;

          if (p <= 0.25 || p >= 0.75) {
            opacity = 0;
          } else if (p < PLATEAU_START) {
            opacity = mapRange(p, 0.25, PLATEAU_START, 0, 1);
          } else if (p <= PLATEAU_END) {
            opacity = 1; // platô
          } else {
            opacity = mapRange(p, PLATEAU_END, 0.75, 1, 0);
          }

          // 2. REGRA DE OURO EXCLUSIVA PARA O PAINEL 01:
          // Forçamos a opacidade 100% em uma área muito maior no retorno.
          // Isso impede que ele escureça ao "passar do ponto" no topo e
          // garante que ele acenda bem antes de precisar procurar o ponto de ativação.
          if (panel === allPanels[0].panel) {
            if (p < 0.68) {
              opacity = 1; // Brilho máximo garantido
            } else {
              opacity = mapRange(p, 0.68, 0.75, 1, 0); // Fade out apenas na saída
            }
          }

          gsap.set(els, { opacity });
        });
      }
      const horizontalTween = gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 0.8,
          start: "top top",
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const prog = self.progress;
            scrollProgress.current = prog;
            setProgressState(prog);

            const currentIndex = Math.min(
              Math.floor(prog * totalPanels),
              totalPanels - 1,
            );
            setActivePanel(currentIndex);

            updatePanelTransforms(allPanels);
          },
        },
      });

      // Estado inicial: só sincroniza os painéis 02-05 (índices 1-4).
      // O Painel 01 fica de fora dessa chamada de propósito, pra não
      // atropelar a animação de entrada (fromTo) que acabou de começar.
      updatePanelTransforms(allPanels.slice(1));

      ScrollTrigger.refresh();
    },
    { scope: containerRef },
  );

  const handleNavigate = (index) => {
    const track = trackRef.current;
    if (!track) return;

    const totalPanels = track.querySelectorAll(".panel").length;
    const maxScroll = track.scrollWidth - window.innerWidth;
    const targetScroll = (index / (totalPanels - 1)) * maxScroll;

    window.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* Canvas 3D no fundo */}
      <ParticleCanvas />
      <Navbar
        activePanel={activePanel}
        onNavigate={handleNavigate}
        progress={progressState}
      />

      <div id="canvas-container">
        <Canvas
          camera={{ position: [0, 0, 9], fov: 60 }}
          dpr={[1, 1.5]}
          gl={{ powerPreference: "high-performance", antialias: false }}
        >
          <ambientLight intensity={1} />
          <ParticleField scrollProgress={scrollProgress} />
        </Canvas>
      </div>

      <div className="scroll-container" ref={containerRef}>
        <div className="track" ref={trackRef}>
          {/* PAINEL 01: APRESENTAÇÃO */}
          <section className="panel">
            <div className="content-box profile-card-container">
              <span className="section-tag">VISÃO GERAL &amp; PERFIL</span>

              {/* Cabeçalho do Perfil */}
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

              {/* Carrossel de Cards com Setas Laterais */}
              <div className="profile-carousel-container">
                <button
                  className="profile-nav-btn"
                  onClick={() =>
                    setProfileIndex((prev) =>
                      prev === 0 ? profileCards.length - 1 : prev - 1,
                    )
                  }
                  aria-label="Card anterior"
                >
                  ‹
                </button>

                <div className="profile-card-large">
                  <h3>{profileCards[profileIndex].title}</h3>
                  {profileCards[profileIndex].isTech ? (
                    <div className="tech-stack" style={{ marginTop: "0.4rem" }}>
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
                  aria-label="Próximo card"
                >
                  ›
                </button>
              </div>

              {/* Indicadores de Páginas (Dots) */}
              <div className="profile-dots-indicator">
                {profileCards.map((_, idx) => (
                  <button
                    key={idx}
                    className={`profile-dot ${
                      idx === profileIndex ? "active" : ""
                    }`}
                    onClick={() => setProfileIndex(idx)}
                    aria-label={`Ir para o card ${idx + 1}`}
                  />
                ))}
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
                Aplicações intuitivas focadas em usabilidade, animações fluidas
                e interfaces reativas com atenção aos mínimos detalhes.
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

          {/* PAINEL 04: IA */}
          <section className="panel">
            <div className="content-box">
              <span className="section-tag">INTELLIGENCE & AUTOMATION</span>
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
              <span className="section-tag">GET IN TOUCH</span>
              <h1>
                05. <span className="gold">Contato</span>
              </h1>
              <p className="description">
                Tem um projeto em mente ou deseja conversar sobre oportunidades?
                Envie uma mensagem ou conecte-se comigo.
              </p>
              <ContactSection />
            </div>
          </section>

          <div style={{ position: "relative", minHeight: "100vh" }}></div>
        </div>
      </div>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </>
  );
}
