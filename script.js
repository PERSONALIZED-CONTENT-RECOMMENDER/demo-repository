const STORAGE_KEY = "pcr_tracking_events";
const SESSION_KEY = "pcr_session_start";
const completedResources = new Set();

function now() {
  return new Date().toISOString();
}

function getEvents() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function track(eventType, resource, metadata = {}) {
  const events = getEvents();
  events.push({
    eventType,
    resource,
    metadata,
    timestamp: now(),
  });
  saveEvents(events);
  updateDashboard();
  updateRecommendation();
}

function getSessionStart() {
  let start = sessionStorage.getItem(SESSION_KEY);
  if (!start) {
    start = Date.now().toString();
    sessionStorage.setItem(SESSION_KEY, start);
  }
  return Number(start);
}

function updateDashboard() {
  const events = getEvents();
  const pageViews = events.filter((event) => event.eventType === "page_view").length;
  const completed = new Set(events.filter((event) => event.eventType === "resource_completed").map((event) => event.resource));
  const lastQuiz = [...events].reverse().find((event) => event.eventType === "quiz_submitted");
  const seconds = Math.floor((Date.now() - getSessionStart()) / 1000);

  document.getElementById("accessCount").textContent = pageViews;
  document.getElementById("completedCount").textContent = completed.size;
  document.getElementById("quizScore").textContent = lastQuiz ? `${lastQuiz.metadata.score}/${lastQuiz.metadata.total}` : "-";
  document.getElementById("timeOnPage").textContent = `${seconds}s`;
  document.getElementById("eventLog").textContent = JSON.stringify(events.slice(-12), null, 2);
}

function updateRecommendation() {
  const events = getEvents();
  const completed = new Set(events.filter((event) => event.eventType === "resource_completed").map((event) => event.resource));
  const lastQuiz = [...events].reverse().find((event) => event.eventType === "quiz_submitted");
  const recommendation = document.getElementById("recommendationText");

  if (!completed.has("texto-rastreabilidade")) {
    recommendation.textContent = "Recomendação: conclua primeiro a leitura sobre rastreabilidade para compreender os dados que podem ser coletados.";
    return;
  }

  if (!completed.has("video-explicativo")) {
    recommendation.textContent = "Recomendação: assista ao vídeo explicativo para relacionar dados de consumo com evidências de aprendizagem.";
    return;
  }

  if (!lastQuiz) {
    recommendation.textContent = "Recomendação: responda ao quiz para gerar uma evidência inicial de compreensão do conteúdo.";
    return;
  }

  if (lastQuiz.metadata.score < 2) {
    recommendation.textContent = "Recomendação: revise o capítulo sobre rastreabilidade e refaça a atividade para fortalecer a compreensão conceitual.";
    return;
  }

  recommendation.textContent = "Recomendação: avance para uma trilha sobre modelagem de dados educacionais e construção de sistemas de recomendação.";
}

function setupCompletionButtons() {
  document.querySelectorAll("[data-complete]").forEach((button) => {
    button.addEventListener("click", () => {
      const resource = button.getAttribute("data-complete");
      completedResources.add(resource);
      button.textContent = "Concluído";
      button.disabled = true;
      track("resource_completed", resource);
    });
  });
}

function setupTrackedSections() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const resource = entry.target.getAttribute("data-resource");
        track("resource_viewed", resource, { visibleRatio: entry.intersectionRatio });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.55 });

  document.querySelectorAll(".tracked").forEach((section) => observer.observe(section));
}

function setupQuiz() {
  document.getElementById("quizForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    let score = 0;
    if (formData.get("q1") === "b") score += 1;
    if (formData.get("q2") === "a") score += 1;

    const result = document.getElementById("quizResult");
    result.style.display = "block";
    result.textContent = `Resultado: você acertou ${score} de 2 questões.`;
    track("quiz_submitted", "quiz-rastreabilidade", { score, total: 2 });
  });
}

function setupClearData() {
  document.getElementById("clearData").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

track("page_view", "ebook-rastreavel", { path: window.location.pathname });
setupCompletionButtons();
setupTrackedSections();
setupQuiz();
setupClearData();
updateDashboard();
updateRecommendation();
setInterval(updateDashboard, 1000);
