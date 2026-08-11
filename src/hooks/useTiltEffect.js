import { useEffect } from "react";

export function useTiltEffect() {
  useEffect(() => {
    const cards = document.querySelectorAll(".pg-card");

    cards.forEach((card) => {
      // Garante que o elemento de glare existe dentro do card
      if (!card.querySelector(".pg-card-glare")) {
        const glare = document.createElement("div");
        glare.className = "pg-card-glare";
        card.appendChild(glare);
      }

      const handleMouseMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calcula a rotação em graus baseada na posição do mouse (máximo de 10-12deg)
        const rotateX = -((y - centerY) / centerY) * 12;
        const rotateY = ((x - centerX) / centerX) * 12;

        // Aplica a transformação 3D e escala sutil
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

        // Atualiza as coordenadas CSS para mover o gradiente de luz (glare)
        card.style.setProperty("--mouse-x", `${(x / rect.width) * 100}%`);
        card.style.setProperty("--mouse-y", `${(y / rect.height) * 100}%`);
      };

      const handleMouseLeave = () => {
        card.style.transform =
          "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
        card.style.setProperty("--mouse-x", "50%");
        card.style.setProperty("--mouse-y", "50%");
      };

      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);

      // Cleanup
      return () => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      };
    });
  }, []);
}
