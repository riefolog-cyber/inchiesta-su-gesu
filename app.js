(() => {
  "use strict";

  /* =========================================================
     State
     ========================================================= */
  const STORAGE_KEY = "inchiesta-gesu-v1";
  const TOTAL_EVIDENCE = 11;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const EVIDENCE_LABELS = {
    metodo: "Metodo: fatto, indizio, interpretazione",
    fonti: "Pluralità delle fonti",
    timeline: "Cronologia delle fonti",
    atlante: "Atlante dei luoghi",
    scienza: "Scienza e reperti",
    processo: "Il processo",
    dibattito: "Dibattito a bivi",
    ritratto: "Ritratto argomentato",
    quiz: "Autovalutazione",
    glossario: "Lessico storico",
    domanda: "Domanda aperta"
  };

  const defaultState = {
    evidence: [],
    methodSolved: [],
    sourcesRead: [],
    timelineSeen: [],
    visitedPlaces: [],
    labCorrect: [],
    trialAnswers: {},
    debateChoices: {},
    traits: [],
    confidence: {},
    checks: [],
    quizAnswers: {},
    quizResult: null,
    openQuestion: "",
    portrait: null,
    glossarySeen: [],
    completedAnnounced: false
  };

  const cloneDefault = () => JSON.parse(JSON.stringify(defaultState));

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneDefault();
      const parsed = JSON.parse(raw);
      const merged = { ...cloneDefault(), ...parsed };
      for (const key of ["evidence", "methodSolved", "sourcesRead", "timelineSeen", "visitedPlaces", "labCorrect", "traits", "checks", "glossarySeen"]) {
        if (!Array.isArray(merged[key])) merged[key] = [];
      }
      for (const key of ["trialAnswers", "debateChoices", "confidence", "quizAnswers"]) {
        if (!merged[key] || typeof merged[key] !== "object" || Array.isArray(merged[key])) merged[key] = {};
      }
      if (typeof merged.openQuestion !== "string") merged.openQuestion = "";
      if (typeof merged.completedAnnounced !== "boolean") merged.completedAnnounced = false;
      return merged;
    } catch {
      return cloneDefault();
    }
  }

  let state = loadState();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Storage can be unavailable in private mode: the page still works. */
    }
  }

  function updateProgress() {
    const count = Math.min(state.evidence.length, TOTAL_EVIDENCE);
    const countEl = $("#progress-count");
    const totalEl = $("#progress-total");
    const chip = $(".progress-chip");
    const label = $(".progress-chip__label");
    if (countEl) countEl.textContent = String(count);
    if (totalEl) totalEl.textContent = String(TOTAL_EVIDENCE);
    if (chip) {
      chip.classList.toggle("is-complete", count >= TOTAL_EVIDENCE);
      chip.setAttribute("aria-label", `${count} indizi raccolti su ${TOTAL_EVIDENCE}`);
    }
    if (label) label.textContent = count >= TOTAL_EVIDENCE ? "Completo" : "Faldone";
  }

  let toastTimer;
  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove("is-visible"), 3000);
  }

  function mark(id, silent = false) {
    if (!EVIDENCE_LABELS[id] || state.evidence.includes(id)) return;
    state.evidence.push(id);
    persist();
    updateProgress();
    if (!silent) toast("Indizio acquisito · " + EVIDENCE_LABELS[id]);
    if (state.evidence.length === TOTAL_EVIDENCE && !state.completedAnnounced) {
      state.completedAnnounced = true;
      persist();
      window.setTimeout(() => toast("Fascicolo completo: 11 indizi. Ora scrivi la domanda che resta aperta."), 350);
    }
  }

  function unmark(id) {
    const index = state.evidence.indexOf(id);
    if (index === -1) return;
    state.evidence.splice(index, 1);
    state.completedAnnounced = false;
    persist();
    updateProgress();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character]));
  }

  /* =========================================================
     Topbar, progress, reveal
     ========================================================= */
  function initTopbar() {
    const toggle = $("#menu-toggle");
    const toc = $("#toc");
    if (!toggle || !toc) return;

    const closeMenu = () => {
      toc.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Apri il menu");
    };

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toc.classList.toggle("is-open", !isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Apri il menu" : "Chiudi il menu");
    });

    $$("a", toc).forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (!toc.classList.contains("is-open")) return;
      if (!toc.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) closeMenu();
    });
  }

  function initScrollUI() {
    let ticking = false;
    const sections = $$("main section[id]");
    const links = $$(".toc a");

    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      const bar = $("#scroll-progress");
      if (bar) bar.style.width = Math.max(0, Math.min(100, progress)) + "%";

      let current = sections.length ? sections[0].id : "";
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= 150) current = section.id;
      }
      links.forEach((link) => {
        link.classList.toggle("is-current", link.getAttribute("href") === "#" + current);
      });
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function initReveal() {
    const elements = $$(".reveal");
    if (!elements.length) return;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    elements.forEach((element) => observer.observe(element));
    window.setTimeout(() => {
      elements.forEach((element) => element.classList.add("is-visible"));
    }, 4000);
  }

  /* =========================================================
     Metodo
     ========================================================= */
  const methodFeedback = {
    pilato: {
      fatto: "Esatto. La Pietra di Pilato, trovata a Cesarea nel 1961, lo nomina “prefetto della Giudea”. Anche Tacito e Giuseppe Flavio lo collocano lì.",
      indizio: "Non è un indizio: è un dato epigrafico verificabile. Rileggi la scheda su Cesarea.",
      interpretazione: "No: il titolo di Pilato è documentato da un’iscrizione, non è un’ipotesi."
    },
    condanna: {
      fatto: "Non proprio: le fonti sono concordi, ma non abbiamo un verbale di processo. È un fatto storico ben attestato, non un documento giudiziario.",
      indizio: "Esatto. Le fonti cristiane convergono e la crocifissione è coerente con il diritto romano, ma manca un atto ufficiale.",
      interpretazione: "Non è solo un’interpretazione: la condanna sotto Pilato è attestata da più tradizioni e da Tacito."
    },
    figlio: {
      fatto: "No: è una confessione di fede, non un fatto verificabile con il metodo storico.",
      indizio: "No: non è un indizio storico nel senso di prova parziale; è un’affermazione di fede.",
      interpretazione: "Esatto. È una confessione di fede: può essere studiata come credenza, non dimostrata come evento."
    }
  };

  function applyMethodSolved(card) {
    const claimId = card.dataset.claim;
    const answer = card.dataset.answer;
    if (!state.methodSolved.includes(claimId)) return;
    card.classList.add("is-correct");
    card.classList.remove("is-wrong");
    const feedback = $(".claim-class__feedback", card);
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = methodFeedback[claimId][answer];
    }
    $$("button", card).forEach((button) => {
      button.disabled = true;
      button.classList.toggle("is-selected", button.dataset.choice === answer);
    });
  }

  function initMethod() {
    const game = $("#metodo-game");
    if (!game) return;
    const claims = $$(".claim-class", game);
    claims.forEach(applyMethodSolved);
    if (state.methodSolved.length === claims.length) mark("metodo", true);

    game.addEventListener("click", (event) => {
      const button = event.target.closest(".claim-class__actions button");
      if (!button) return;
      const card = button.closest(".claim-class");
      if (!card || state.methodSolved.includes(card.dataset.claim)) return;
      const choice = button.dataset.choice;
      const answer = card.dataset.answer;
      const feedback = $(".claim-class__feedback", card);
      card.classList.remove("is-correct", "is-wrong");
      $$(".claim-class__actions button", card).forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");

      if (choice === answer) {
        card.classList.add("is-correct");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = methodFeedback[card.dataset.claim][choice];
        }
        if (!state.methodSolved.includes(card.dataset.claim)) {
          state.methodSolved.push(card.dataset.claim);
          persist();
        }
        $$(".claim-class__actions button", card).forEach((item) => { item.disabled = true; });
        if (state.methodSolved.length === claims.length) mark("metodo");
      } else {
        card.classList.add("is-wrong");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = methodFeedback[card.dataset.claim][choice];
        }
      }
    });
  }

  /* =========================================================
     Fonti
     ========================================================= */
  function initSources() {
    const grid = $("#source-grid");
    if (!grid) return;
    const cards = $$(".source-card", grid);
    const filters = $$(".filter");

    cards.forEach((card) => {
      if (state.sourcesRead.includes(card.querySelector(".source-card__title")?.textContent.trim() || "")) {
        card.classList.add("is-read");
      }
    });
    if (state.sourcesRead.length >= 4) mark("fonti", true);

    filters.forEach((filterButton) => {
      filterButton.addEventListener("click", () => {
        const filter = filterButton.dataset.filter;
        filters.forEach((item) => {
          const active = item === filterButton;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        cards.forEach((card) => {
          card.hidden = filter !== "tutte" && card.dataset.cat !== filter;
        });
      });
    });

    grid.addEventListener("click", (event) => {
      const toggle = event.target.closest(".source-card__toggle");
      if (!toggle) return;
      const card = toggle.closest(".source-card");
      const panel = document.getElementById(toggle.getAttribute("aria-controls"));
      if (!card || !panel) return;
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      panel.hidden = isOpen;
      card.classList.toggle("is-open", !isOpen);
      if (!isOpen) {
        card.classList.add("is-read");
        const title = card.querySelector(".source-card__title")?.textContent.trim() || "";
        if (title && !state.sourcesRead.includes(title)) {
          state.sourcesRead.push(title);
          persist();
        }
        if (state.sourcesRead.length >= 4) mark("fonti");
      }
    });
  }

  /* =========================================================
     Timeline
     ========================================================= */
  const timelineData = [
    { id: "croce", year: "30–33", label: "Crocifissione", text: "La data più probabile è tra il 30 e il 33, sotto Tiberio e Pilato. Non abbiamo un documento contemporaneo: la cronologia è ricostruita dalle fonti." },
    { id: "paolo", year: "50–60", label: "Lettere di Paolo", text: "La prima testimonianza scritta cristiana. Non è una biografia: parla della morte, della risurrezione e del significato di Gesù per le comunità." },
    { id: "marco", year: "65–70", label: "Vangelo di Marco", text: "Il Vangelo più antico. Scritto durante o dopo la guerra giudaica, senza racconti di nascita e con un finale abrupto nella versione più antica." },
    { id: "matteo-luca", year: "80–90", label: "Matteo e Luca", text: "Riprendono Marco e una fonte di detti (Q). Aggiungono genealogie e racconti dell’infanzia, diversi tra loro." },
    { id: "giovanni", year: "90–100", label: "Vangelo di Giovanni", text: "Il più teologico: lunghi discorsi, segni, il Verbo preesistente. La cronologia della Pasqua differisce dai Sinottici." },
    { id: "flavio", year: "93–94", label: "Giuseppe Flavio", text: "Le Antichità giudaiche parlano di Gesù in un passo tramandato con aggiunte cristiane. Il riferimento a Giacomo è più spesso considerato autentico." },
    { id: "plinio", year: "112", label: "Plinio il Giovane", text: "Documenta i cristiani in Bitinia che cantano inni “a Cristo come a un dio”. Non è una fonte sulla vita di Gesù." },
    { id: "tacito", year: "115", label: "Tacito", text: "Gli Annali nominano Cristo, messo a morte da Pilato sotto Tiberio. Una menzione romana indipendente, ma quasi un secolo dopo i fatti." },
    { id: "canone", year: "180", label: "Canone a quattro", text: "Ireneo difende i quattro Vangeli. Il canone cristiano si sta consolidando, in un contesto di dibattito su quali testi siano normativi." },
    { id: "atanasio", year: "367", label: "Atanasio", text: "La lettera festale di Atanasio contiene la prima lista completa dei 27 libri del Nuovo Testamento." },
    { id: "nag-hammadi", year: "1945", label: "Nag Hammadi", text: "La scoperta di una biblioteca di testi apocrifi apre una finestra sulla pluralità delle prime comunità cristiane." },
    { id: "sindone", year: "1988", label: "Radiocarbonio Sindone", text: "Tre laboratori indipendenti datano il telo al 1260–1390. Restano discussioni sul campionamento, ma non una datazione alternativa condivisa." }
  ];

  function renderTimeline() {
    const timeline = $("#timeline");
    if (!timeline) return;
    timeline.innerHTML = timelineData.map((item) => `
      <button class="timeline__item" type="button" data-moment="${item.id}" aria-pressed="false">
        <span class="timeline__year">${item.year}</span>
        <span class="timeline__label">${item.label}</span>
      </button>
    `).join("");
  }

  function selectTimeline(id, record = true) {
    const item = timelineData.find((moment) => moment.id === id);
    if (!item) return;
    const timeline = $("#timeline");
    const note = $("#timeline-note");
    if (!timeline || !note) return;

    $$(".timeline__item", timeline).forEach((button) => {
      const active = button.dataset.moment === id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      if (state.timelineSeen.includes(button.dataset.moment)) button.classList.add("is-seen");
    });

    note.innerHTML = `
      <p class="eyebrow">${item.year} · ${item.label}</p>
      <h4>${item.label}</h4>
      <p>${item.text}</p>
    `;

    if (record && !state.timelineSeen.includes(id)) {
      state.timelineSeen.push(id);
      persist();
      const button = $(`.timeline__item[data-moment="${id}"]`, timeline);
      if (button) button.classList.add("is-seen");
      if (state.timelineSeen.length >= 5) mark("timeline");
    }
  }

  function initTimeline() {
    const timeline = $("#timeline");
    if (!timeline) return;
    timeline.addEventListener("click", (event) => {
      const button = event.target.closest(".timeline__item");
      if (button) selectTimeline(button.dataset.moment);
    });
    timeline.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const items = $$(".timeline__item", timeline);
      const current = items.indexOf(document.activeElement);
      if (current === -1) return;
      event.preventDefault();
      let next = current;
      if (event.key === "ArrowRight") next = Math.min(items.length - 1, current + 1);
      if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = items.length - 1;
      items[next].focus();
    });

    state.timelineSeen.forEach((id) => {
      const button = $(`.timeline__item[data-moment="${id}"]`, timeline);
      if (button) button.classList.add("is-seen");
    });
    if (state.timelineSeen.length) selectTimeline(state.timelineSeen[state.timelineSeen.length - 1], false);
    if (state.timelineSeen.length >= 5) mark("timeline", true);
  }

  /* =========================================================
     Atlante
     ========================================================= */
  const places = {
    nazaret: {
      name: "Nazaret",
      region: "Galilea",
      why: "Piccolo villaggio agricolo della Galilea, non citato al di fuori dei racconti della nascita e dell’infanzia. L’archeologia mostra case, cisterne e terrazze del I secolo. Il nome “Nazareno” è uno dei tratti più antichi della tradizione.",
      today: "Oggi è una città della Galilea settentrionale, con resti archeologici e luoghi di culto costruiti su tradizioni molto posteriori.",
      caution: "L’identificazione di singole case o botteghe con la famiglia di Gesù è tradizione, non prova archeologica."
    },
    cafarnao: {
      name: "Cafarnao",
      region: "Galilea",
      why: "Villaggio di pescatori sulla riva del lago. Marco ne fa il centro dell’attività di Gesù: guarigioni, insegnamenti, la casa di Pietro. Gli scavi hanno riportato case, una sinagoga di fase successiva e un luogo venerato come casa di Pietro.",
      today: "Il sito archeologico di Tell Hum conserva una sinagoga del IV–V secolo e resti di abitazioni.",
      caution: "La “casa di Pietro” è un’identificazione venerata dalla tradizione, non un’etichetta ritrovata su un muro."
    },
    cesarea: {
      name: "Cesarea Marittima",
      region: "Giudea romana",
      why: "Capitale amministrativa romana della Giudea. Qui nel 1961 fu trovata la Pietra di Pilato, con il nome del prefetto. Non parla di Gesù, ma conferma un personaggio e un titolo.",
      today: "Il parco archeologico conserva porto, teatro, acquedotto e iscrizioni romane.",
      caution: "Un’iscrizione che nomina Pilato non documenta il processo a Gesù: conferma solo chi era il governatore."
    },
    gerusalemme: {
      name: "Gerusalemme",
      region: "Giudea",
      why: "Città del Tempio, del Sinedrio e del processo. Il Secondo Tempio fu distrutto da Tito nel 70. La basilica del Santo Sepolcro, costruita nel IV secolo, indica il luogo venerato della sepoltura.",
      today: "Il centro storico è patrimonio UNESCO; il Muro Occidentale e il Santo Sepolcro sono luoghi di culto e di conflitto politico.",
      caution: "La venerazione antica del luogo non equivale a una prova archeologica della risurrezione."
    },
    betlemme: {
      name: "Betlemme",
      region: "Giudea",
      why: "Villaggio della Giudea. Solo Matteo e Luca collocano qui la nascita; i racconti divergono. Non c’è un reperto della stalla o della cometa. La grotta e la basilica costantiniana sono luoghi di culto.",
      today: "La Basilica della Natività è uno dei più antichi edifici cristiani ancora in uso.",
      caution: "La tradizione del luogo è antica, ma non dimostra i dettagli narrativi dei Vangeli."
    },
    qumran: {
      name: "Qumran",
      region: "Mar Morto",
      why: "Sede di una comunità giudaica presso il Mar Morto. I Rotoli del Mar Morto (1947) mostrano attese apocalittiche e contesti religiosi vivaci. Non sono testi cristiani e non parlano di Gesù, ma aiutano a capire il suo mondo.",
      today: "Il sito archeologico e i musei di Gerusalemme conservano i rotoli e i resti della comunità.",
      caution: "Non è un sito cristiano e non contiene riferimenti a Gesù: il collegamento è di contesto, non di prova."
    },
    masada: {
      name: "Masada",
      region: "Giudea",
      why: "Fortezza erodiana e ultimo bastione della rivolta giudaica (73–74). Non ha un legame diretto con Gesù; ricorda la repressione romana e il clima politico della Giudea.",
      today: "È un sito archeologico e un simbolo nazionale israeliano, patrimonio UNESCO.",
      caution: "Serve a capire la violenza del contesto, non a ricostruire la biografia di Gesù."
    }
  };

  function renderAtlasDots() {
    const dots = $("#atlas-progress");
    if (!dots) return;
    dots.innerHTML = Object.keys(places).map((id) => `<li class="${state.visitedPlaces.includes(id) ? "is-visited" : ""}" aria-hidden="true"></li>`).join("");
  }

  function selectPlace(id, record = true) {
    const place = places[id];
    if (!place) return;
    const panel = $("#place-panel");
    if (!panel) return;
    $$(".pin").forEach((pin) => {
      const active = pin.dataset.place === id;
      pin.classList.toggle("is-active", active);
      pin.setAttribute("aria-pressed", String(active));
      if (state.visitedPlaces.includes(pin.dataset.place)) pin.classList.add("is-visited");
    });

    const kicker = $("#place-kicker");
    const name = $("#place-name");
    const why = $("#place-why");
    const today = $("#place-today");
    const caution = $("#place-caution");
    if (kicker) kicker.textContent = "Scheda luogo · " + place.region;
    if (name) name.textContent = place.name;
    if (why) why.textContent = place.why;
    if (today) today.textContent = place.today;
    if (caution) caution.textContent = "Limite: " + place.caution;

    if (record && !state.visitedPlaces.includes(id)) {
      state.visitedPlaces.push(id);
      const pin = $(`.pin[data-place="${id}"]`);
      if (pin) pin.classList.add("is-visited");
      renderAtlasDots();
      persist();
      if (state.visitedPlaces.length >= Object.keys(places).length) mark("atlante");
    }
  }

  function initAtlas() {
    const map = $("#atlas-map");
    if (!map) return;
    $$(".pin", map).forEach((pin) => {
      if (state.visitedPlaces.includes(pin.dataset.place)) pin.classList.add("is-visited");
      pin.setAttribute("aria-pressed", "false");
    });
    map.addEventListener("click", (event) => {
      const pin = event.target.closest(".pin");
      if (pin) selectPlace(pin.dataset.place);
    });
    renderAtlasDots();
    if (state.visitedPlaces.length) {
      selectPlace(state.visitedPlaces[state.visitedPlaces.length - 1], false);
    }
    if (state.visitedPlaces.length >= Object.keys(places).length) mark("atlante", true);
  }

  /* =========================================================
     Laboratorio scientifico
     ========================================================= */
  const labFeedback = {
    "sindone-data": "La datazione del 1988 indica il XIII–XIV secolo. Restano discussioni sul campionamento, ma non una datazione alternativa condivisa.",
    "sindone-risurrezione": "Anche se l’origine dell’immagine fosse inspiegata, “inspiegato” non significa “soprannaturale”. La risurrezione è una confessione di fede, non un evento testabile con il metodo storico.",
    "stella-matteo": "Solo Matteo racconta la stella e i magi; Luca ha i pastori, Marco e Giovanni non hanno racconti di nascita.",
    "stella-congiunzione": "È un’ipotesi suggestiva, non una certezza: non sappiamo quale fenomeno Matteo avesse in mente, né se descrivesse un evento reale.",
    "talpiot-tomba": "La tomba e gli ossuari sono reali; l’identificazione con la famiglia di Gesù è un’interpretazione.",
    "talpiot-famiglia": "Ipotesi minoritaria e contestata: i nomi erano comuni e manca una catena di prove. Non è il consenso degli archeologi.",
    "croce-pratica": "La crocifissione era una pena romana documentata anche in Giudea; il calcagno di Yehohanan lo conferma.",
    "croce-rivolta": "Il titolo suggerisce un’accusa politica, non una biografia. Le fonti non descrivono una rivolta armata guidata da Gesù."
  };
  const labWrong = "Non è la categoria giusta. Rileggi i dati del reperto: distingui ciò che è osservato da ciò che è dedotto. Riprova.";

  function initLab() {
    const lab = $(".lab");
    if (!lab) return;
    const tabs = $$('[role="tab"]', lab);
    const panels = $$('[role="tabpanel"]', lab);

    const activateTab = (name) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.tab === name;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) tab.focus({ preventScroll: true });
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== "panel-" + name;
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateTab(tab.dataset.tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let target = index;
        if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") target = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") target = 0;
        if (event.key === "End") target = tabs.length - 1;
        activateTab(tabs[target].dataset.tab);
      });
    });

    const claims = $$(".claim-check", lab);
    const applySolved = (claim) => {
      if (!state.labCorrect.includes(claim.dataset.claim)) return;
      claim.classList.add("is-correct");
      claim.classList.remove("is-wrong");
      const feedback = $(".claim-check__feedback", claim);
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = labFeedback[claim.dataset.claim] || "";
      }
      $$("button", claim).forEach((button) => {
        button.disabled = true;
        button.classList.toggle("is-selected", button.dataset.choice === claim.dataset.correct);
      });
    };
    claims.forEach(applySolved);
    if (state.labCorrect.length >= Object.keys(labFeedback).length) mark("scienza", true);

    lab.addEventListener("click", (event) => {
      const button = event.target.closest(".claim-check__buttons button");
      if (!button) return;
      const claim = button.closest(".claim-check");
      if (!claim || state.labCorrect.includes(claim.dataset.claim)) return;
      const choice = button.dataset.choice;
      const correct = choice === claim.dataset.correct;
      claim.classList.remove("is-correct", "is-wrong");
      $$(".claim-check__buttons button", claim).forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      const feedback = $(".claim-check__feedback", claim);

      if (correct) {
        claim.classList.add("is-correct");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = labFeedback[claim.dataset.claim] || "Corretto.";
        }
        state.labCorrect.push(claim.dataset.claim);
        persist();
        $$(".claim-check__buttons button", claim).forEach((item) => { item.disabled = true; });
        if (state.labCorrect.length >= Object.keys(labFeedback).length) mark("scienza");
      } else {
        claim.classList.add("is-wrong");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = labWrong;
        }
      }
    });
  }

  /* =========================================================
     Processo
     ========================================================= */
  const trialCorrect = { autorita: "pilato", titulus: "sedizione", divergenze: "cronologia" };
  const trialFeedback = {
    autorita: {
      pilato: "Corretto. In Giudea il prefetto romano controllava la pena capitale. Il Sinedrio poteva giudicare reati religiosi, ma la condanna a morte doveva essere ratificata da Roma. I Vangeli descrivono un processo notturno la cui storicità è discussa.",
      sinedrio: "Il Sinedrio aveva competenze religiose e giudiziarie, ma in Giudea la pena capitale era sotto il controllo romano. La questione è più complessa di così.",
      erode: "Erode Antipa governava la Galilea e la Perea, non la Giudea. Non aveva l’autorità di condannare Gesù a Gerusalemme."
    },
    titulus: {
      sedizione: "Corretto. Il titulus era la motivazione della condanna. “Re dei Giudei” è un’accusa politica, non religiosa. Non prova però che Gesù guidasse una rivolta armata.",
      bestemmia: "La bestemmia è un’accusa religiosa; il titulus romano “Re dei Giudei” indica invece una preoccupazione politica.",
      nulla: "Il titulus non era una formula fissa: indicava la colpa del condannato ed era parte della pena."
    },
    divergenze: {
      cronologia: "Corretto. I Sinottici e Giovanni collocano la Pasqua e il processo in modo diverso; la responsabilità di Pilato e del Sinedrio è raccontata con accenti diversi.",
      crocifissione: "La crocifissione è uno dei pochi punti su cui le fonti convergono, non il principale motivo di divergenza.",
      esistenza: "L’esistenza di Gesù è attestata da fonti diverse; le divergenze riguardano piuttosto la cronologia e le responsabilità."
    }
  };

  function applyTrialAnswer(q, qid, choice, silent = false) {
    const feedback = $(".trial__feedback", q);
    const correct = choice === trialCorrect[qid];
    q.classList.toggle("is-correct", correct);
    q.classList.toggle("is-wrong", !correct);
    $$(".trial__options button", q).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.choice === choice);
    });
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = trialFeedback[qid][choice] || "";
    }
    state.trialAnswers[qid] = choice;
    if (!silent) persist();
  }

  function maybeShowVerdict(notify = false) {
    const questions = $$(".trial__q");
    const allAnswered = questions.every((q) => Boolean(state.trialAnswers[q.dataset.trial]));
    const verdict = $("#trial-verdict");
    if (verdict) verdict.hidden = !allAnswered;
    if (allAnswered) mark("processo", !notify);
  }

  function initTrial() {
    const trial = $(".trial");
    if (!trial) return;
    $$(".trial__q", trial).forEach((q) => {
      const qid = q.dataset.trial;
      const answer = state.trialAnswers[qid];
      if (answer) applyTrialAnswer(q, qid, answer, true);
    });
    trial.addEventListener("click", (event) => {
      const button = event.target.closest(".trial__options button");
      if (!button) return;
      const q = button.closest(".trial__q");
      if (!q) return;
      applyTrialAnswer(q, q.dataset.trial, button.dataset.choice);
      maybeShowVerdict(true);
    });
    maybeShowVerdict(false);
  }

  /* =========================================================
     Dibattito
     ========================================================= */
  const debateData = [
    {
      id: "silenzio",
      title: "Il silenzio di Roma",
      context: "Nessun autore pagano contemporaneo parla di Gesù. Plinio, Tacito e Giuseppe Flavio scrivono decenni dopo. Che cosa se ne deduce?",
      options: [
        {
          label: "Gesù non è mai esistito.",
          strength: "Sembra una conclusione radicale e coerente con l’assenza di prove dirette.",
          weakness: "L’argomento dal silenzio è debole: un predicatore provinciale poteva essere irrilevante per l’élite romana. Fonti cristiane, ebraiche e romane convergono su un uomo crocifisso sotto Pilato; il mitismo è marginale nel dibattito storico."
        },
        {
          label: "Esisteva, ma per Roma era un caso minore.",
          strength: "Spiega il silenzio senza negare le tracce e tiene conto del contesto sociale.",
          weakness: "Non spiega da sola perché il movimento sia cresciuto: servono le fonti cristiane e la storia delle comunità."
        },
        {
          label: "Non possiamo sapere se esistesse.",
          strength: "Riconosce i limiti delle fonti e rifugge dalle certezze assolute.",
          weakness: "Tratta l’assenza di prove dirette come assenza di ogni ragione. La convergenza di fonti indipendenti rende l’esistenza molto probabile, anche senza un documento contemporaneo."
        }
      ]
    },
    {
      id: "sindone",
      title: "La Sindone",
      context: "Un telo di lino con un’immagine di un uomo crocifisso. La datazione radiocarbonio del 1988 indica il XIII–XIV secolo. Che cosa possiamo concluderne?",
      options: [
        {
          label: "È la prova della risurrezione.",
          strength: "Si appella a un reperto concreto e a un’immagine che la scienza non ha spiegato del tutto.",
          weakness: "La datazione medievale e la catena di custodia rendono la tesi storicamente fragile; “immagine inspiegata” non equivale a “risurrezione”."
        },
        {
          label: "È un oggetto devozionale medievale.",
          strength: "È la spiegazione storicamente più economica, coerente con la datazione e con la storia del culto.",
          weakness: "Non risolve il problema della formazione dell’immagine; resta un oggetto religioso complesso, non un semplice falso."
        },
        {
          label: "È un enigma ancora aperto.",
          strength: "Riconosce che la scienza non ha spiegato tutto e invita a non semplificare.",
          weakness: "Un enigma non è una prova: non autorizza a saltare alla conclusione che sia Gesù o che dimostri la risurrezione."
        }
      ]
    },
    {
      id: "registri",
      title: "Storia e fede",
      context: "“Gesù storico” e “Cristo della fede” sono la stessa cosa? La domanda divide studiosi e credenti.",
      options: [
        {
          label: "Sono la stessa cosa.",
          strength: "Evita di separare artificialmente il Gesù della storia dal Cristo confessato dalle comunità.",
          weakness: "Confonde due livelli: la ricostruzione storica e la confessione credente non hanno lo stesso metodo né la stessa natura."
        },
        {
          label: "Sono incompatibili.",
          strength: "Sottolinea la differenza tra ricerca critica e fede, senza illusioni di armonia automatica.",
          weakness: "Non necessariamente: molti studiosi credenti fanno storia critica senza rinunciare alla fede; la distinzione è metodologica, non un verdetto."
        },
        {
          label: "Sono due livelli da distinguere.",
          strength: "La distinzione è metodologica e permette di studiare le fonti senza pretendere di dimostrare o confutare la fede.",
          weakness: "Non dice ancora come i due livelli si rapportino nella vita di una persona o di una comunità."
        }
      ]
    }
  ];

  function renderDebate() {
    const container = $("#debate");
    if (!container) return;
    container.innerHTML = debateData.map((dilemma, index) => `
      <article class="debate-card" data-debate="${dilemma.id}">
        <p class="debate-card__num">Dilemma 0${index + 1}</p>
        <h3>${dilemma.title}</h3>
        <p class="debate-card__context">${dilemma.context}</p>
        <div class="debate__options" role="group" aria-label="${dilemma.title}">
          ${dilemma.options.map((option, optionIndex) => `<button type="button" data-index="${optionIndex}">${option.label}</button>`).join("")}
        </div>
        <p class="debate-card__feedback" hidden></p>
      </article>
    `).join("");
  }

  function applyDebateChoice(card, choice, silent = false) {
    const dilemma = debateData.find((item) => item.id === card.dataset.debate);
    if (!dilemma) return;
    const option = dilemma.options[choice];
    if (!option) return;
    $$(".debate__options button", card).forEach((button) => {
      button.classList.toggle("is-selected", Number(button.dataset.index) === choice);
    });
    const feedback = $(".debate-card__feedback", card);
    if (feedback) {
      feedback.hidden = false;
      feedback.innerHTML = `<strong>Punto forte.</strong> ${escapeHTML(option.strength)}<br><strong>Punto debole.</strong> ${escapeHTML(option.weakness)}`;
    }
    state.debateChoices[dilemma.id] = choice;
    if (!silent) persist();
  }

  function maybeShowDebateSummary(notify = false) {
    const allChosen = debateData.every((dilemma) => state.debateChoices[dilemma.id] !== undefined);
    const summary = $("#debate-summary");
    if (summary) summary.hidden = !allChosen;
    if (allChosen) mark("dibattito", !notify);
  }

  function initDebate() {
    const container = $("#debate");
    if (!container) return;
    debateData.forEach((dilemma) => {
      const card = $(`.debate-card[data-debate="${dilemma.id}"]`, container);
      const choice = state.debateChoices[dilemma.id];
      if (card && choice !== undefined) applyDebateChoice(card, choice, true);
    });
    container.addEventListener("click", (event) => {
      const button = event.target.closest(".debate__options button");
      if (!button) return;
      const card = button.closest(".debate-card");
      if (!card) return;
      applyDebateChoice(card, Number(button.dataset.index));
      maybeShowDebateSummary(true);
    });
    maybeShowDebateSummary(false);
  }

  /* =========================================================
     Laboratorio del ritratto
     ========================================================= */
  const traitData = [
    {
      id: "ebreo",
      icon: "EB",
      title: "Ebreo di Galilea",
      desc: "Radicato in un villaggio ebraico del I secolo, tra attese messianiche e tensione romana.",
      phrase: "un ebreo galileo del I secolo",
      evidence: "Paolo, i Vangeli e il contesto archeologico della Galilea.",
      defaultConfidence: "documentato"
    },
    {
      id: "regno",
      icon: "RG",
      title: "Predicatore del Regno",
      desc: "Annunciava il Regno di Dio: una signoria divina che chiede conversione e cambia le relazioni.",
      phrase: "un predicatore del Regno di Dio",
      evidence: "Marco 1,15; la fonte Q; le lettere di Paolo.",
      defaultConfidence: "documentato"
    },
    {
      id: "parabole",
      icon: "PB",
      title: "Maestro di parabole",
      desc: "Insegnava con storie brevi e provocatorie, ambientate in campi, case e strade.",
      phrase: "un maestro che parlava per parabole",
      evidence: "La fonte Q e Marco conservano raccolte di detti; lo stile è riconoscibile.",
      defaultConfidence: "documentato"
    },
    {
      id: "guaritore",
      icon: "GR",
      title: "Guaritore carismatico",
      desc: "Le fonti gli attribuiscono guarigioni ed esorcismi; gli avversari non negano il fenomeno, lo interpretano diversamente.",
      phrase: "un guaritore carismatico nella memoria dei suoi seguaci",
      evidence: "Marco e Q; la credenza nei guaritori era diffusa; i miracoli restano non verificabili.",
      defaultConfidence: "plausibile"
    },
    {
      id: "profeta",
      icon: "PR",
      title: "Profeta apocalittico",
      desc: "Attendeva un intervento imminente di Dio nella storia, con giudizio e trasformazione radicale.",
      phrase: "un profeta apocalittico teso all’imminente intervento di Dio",
      evidence: "Marco 13; Paolo; il contesto apocalittico di Qumran; interpretazioni di Schweitzer e Ehrman.",
      defaultConfidence: "plausibile"
    },
    {
      id: "sovversivo",
      icon: "SV",
      title: "Sovversivo antiromano",
      desc: "Fu crocifisso con l’accusa di essere “Re dei Giudei”. Alcuni lo leggono come capo di una resistenza politica.",
      phrase: "un possibile sovversivo condannato per un’accusa politica",
      evidence: "La crocifissione è un indizio di accusa politica; mancano prove di una rivolta armata guidata da lui.",
      defaultConfidence: "ipotetico"
    },
    {
      id: "messia",
      icon: "MS",
      title: "Messia d’Israele",
      desc: "Il titolo “Cristo” significa “unto”: una categoria regale e profetica, non un nome proprio.",
      phrase: "riconosciuto dai suoi seguaci come il Messia, il Cristo",
      evidence: "Che i seguaci lo chiamassero Messia/Cristo è attestato; che lo fosse è una confessione di fede.",
      defaultConfidence: "documentato"
    }
  ];

  const confidenceLabels = { documentato: "Documentato", plausibile: "Plausibile", ipotetico: "Ipotetico" };
  const checkLabels = {
    fonti: "Ho usato almeno due fonti diverse.",
    livelli: "Ho distinto fatti, indizi e interpretazioni.",
    limiti: "Ho detto anche ciò che le fonti non permettono di dire.",
    alterita: "Ho considerato una posizione diversa dalla mia.",
    domanda: "Ho lasciato aperta una domanda."
  };

  function renderTraits() {
    const grid = $("#trait-grid");
    if (!grid) return;
    grid.innerHTML = traitData.map((trait) => `
      <article class="trait-card" data-trait="${trait.id}">
        <button class="trait-card__toggle" type="button" data-trait-toggle="${trait.id}" aria-pressed="false" aria-describedby="trait-desc-${trait.id}">
          <span class="trait-card__icon" aria-hidden="true">${trait.icon}</span>
          <span>
            <span class="trait-card__title">${trait.title}</span>
            <span class="trait-card__desc" id="trait-desc-${trait.id}">${trait.desc}</span>
          </span>
        </button>
        <div class="confidence" role="group" aria-label="Quanto è documentato: ${trait.title}">
          ${Object.keys(confidenceLabels).map((level) => `<button type="button" data-confidence="${level}" data-trait="${trait.id}" aria-pressed="false">${confidenceLabels[level]}</button>`).join("")}
        </div>
      </article>
    `).join("");
  }

  function selectedTraits() {
    return state.traits.map((id) => traitData.find((trait) => trait.id === id)).filter(Boolean);
  }

  function confidenceFor(trait) {
    const level = state.confidence[trait.id];
    return confidenceLabels[level] ? level : trait.defaultConfidence;
  }

  function joinPhrases(items) {
    if (!items.length) return "";
    if (items.length === 1) return items[0];
    return items.slice(0, -1).join(", ") + " e " + items[items.length - 1];
  }

  function updateTraitUI() {
    $$(".trait-card").forEach((card) => {
      const id = card.dataset.trait;
      const selected = state.traits.includes(id);
      card.classList.toggle("is-selected", selected);
      const toggle = $(".trait-card__toggle", card);
      if (toggle) toggle.setAttribute("aria-pressed", String(selected));
      const trait = traitData.find((item) => item.id === id);
      const level = trait ? confidenceFor(trait) : null;
      $$(".confidence button", card).forEach((button) => {
        const active = button.dataset.confidence === level;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    });
  }

  function buildPreviewHTML() {
    const selected = selectedTraits();
    if (!selected.length) return "";
    const body = selected.map((trait) => {
      const level = confidenceFor(trait);
      return `<li><strong>${trait.title} <span class="badge badge--${level}">${confidenceLabels[level]}</span></strong>${escapeHTML(trait.evidence)}</li>`;
    }).join("");
    const question = state.openQuestion.trim();
    return `
      <p>Il mio Gesù è ${escapeHTML(joinPhrases(selected.map((trait) => trait.phrase)))}.</p>
      <ul>${body}</ul>
      ${question ? `<p><strong>La domanda che mi resta:</strong> ${escapeHTML(question)}</p>` : ""}
    `;
  }

  function buildPortraitText() {
    const selected = selectedTraits();
    const checks = state.checks.map((id) => "✓ " + (checkLabels[id] || id));
    const evidence = selected.map((trait) => {
      const level = confidenceFor(trait);
      return `- ${trait.title} [${confidenceLabels[level]}]: ${trait.evidence}`;
    });
    return [
      "RITRATTO ARGOMENTATO — INCHIESTA SU GESÙ",
      "Materiale didattico. Sintesi argomentata, non prova.",
      "",
      `Il mio Gesù è ${joinPhrases(selected.map((trait) => trait.phrase))}.`,
      "",
      "PERCHÉ LO DICO",
      ...evidence,
      "",
      "CIÒ CHE NON DICO",
      "Non includo la sua identità divina: è una questione di fede, non una conclusione del metodo storico.",
      "Non pretendo che questo ritratto esaurisca ciò che Gesù è stato per i suoi contemporanei.",
      "",
      "AUTOVALUTAZIONE",
      ...(checks.length ? checks : ["- Lista di controllo non compilata."]),
      "",
      "DOMANDA APERTA",
      state.openQuestion.trim() || "—",
      "",
      "Nota: le fonti antiche non offrono un ritratto fisico di Gesù. Questo testo riguarda ciò che possiamo arguire, non un identikit.",
      ""
    ].join("\n");
  }

  function refreshFixedPortrait() {
    if (!state.portrait) return;
    const selected = selectedTraits();
    if (selected.length < 3) {
      state.portrait = null;
      persist();
      return;
    }
    state.portrait = {
      text: buildPortraitText(),
      generatedAt: Date.now(),
      traits: [...state.traits]
    };
    persist();
  }

  function updatePreview() {
    const title = $("#portrait-title");
    const empty = $("#portrait-empty");
    const body = $("#portrait-body");
    const generate = $("#generate-portrait");
    const copy = $("#copy-portrait");
    const download = $("#download-portrait");
    const print = $("#print-portrait");
    const stamp = $("#portrait-stamp");
    if (!title || !empty || !body) return;
    const selected = selectedTraits();
    const enough = selected.length >= 3;
    const hasPortrait = Boolean(state.portrait);

    if (!selected.length) {
      title.textContent = "Il tuo identikit è vuoto";
      empty.hidden = false;
      body.hidden = true;
      body.innerHTML = "";
      if (generate) { generate.disabled = true; generate.textContent = "Fissa il ritratto"; }
      if (copy) copy.disabled = true;
      if (download) download.disabled = true;
      if (print) print.disabled = true;
      if (stamp) stamp.hidden = true;
      return;
    }

    title.textContent = enough ? "Il mio Gesù" : "Anteprima del ritratto";
    empty.hidden = true;
    body.hidden = false;
    body.innerHTML = buildPreviewHTML();
    if (!enough) {
      body.insertAdjacentHTML("beforeend", `<p class="portrait-preview__empty">Aggiungi ancora ${3 - selected.length} ${3 - selected.length === 1 ? "tratto" : "tratti"} per poter fissare il ritratto.</p>`);
    }
    if (generate) {
      generate.disabled = !enough;
      generate.textContent = hasPortrait ? "Aggiorna il ritratto" : "Fissa il ritratto";
    }
    if (copy) copy.disabled = !hasPortrait;
    if (download) download.disabled = !hasPortrait;
    if (print) print.disabled = !hasPortrait;
    if (stamp) stamp.hidden = !hasPortrait;
  }

  function renderPrintSheet() {
    const sheet = $("#print-sheet");
    if (!sheet) return;
    const text = state.portrait?.text || buildPortraitText();
    const date = new Date().toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "numeric" });
    sheet.innerHTML = `
      <p class="print-meta">Inchiesta su Gesù · materiale didattico · ${escapeHTML(date)}</p>
      <h1>Ritratto argomentato</h1>
      ${text.split("\n").map((line) => line.trim() ? `<p>${escapeHTML(line)}</p>` : "").join("")}
      <p class="print-note">Sintesi argomentata, non prova. Materiale per la scuola secondaria di secondo grado.</p>
    `;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => toast("Ritratto copiato negli appunti.")).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      toast("Ritratto copiato negli appunti.");
    } catch {
      toast("Copia non disponibile: seleziona il testo e copialo manualmente.");
    }
    area.remove();
  }

  function downloadPortrait() {
    if (!state.portrait) return;
    const blob = new Blob([state.portrait.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ritratto-gesu.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Ritratto scaricato come file di testo.");
  }

  function initPortrait() {
    const grid = $("#trait-grid");
    if (!grid) return;

    state.traits = state.traits.filter((id) => traitData.some((trait) => trait.id === id));
    updateTraitUI();
    updatePreview();

    grid.addEventListener("click", (event) => {
      const confidence = event.target.closest("[data-confidence]");
      if (confidence) {
        const id = confidence.dataset.trait;
        if (!state.traits.includes(id)) return;
        state.confidence[id] = confidence.dataset.confidence;
        persist();
        updateTraitUI();
        refreshFixedPortrait();
        updatePreview();
        return;
      }

      const toggle = event.target.closest("[data-trait-toggle]");
      if (!toggle) return;
      const id = toggle.getAttribute("data-trait-toggle");
      if (!id) return;
      const index = state.traits.indexOf(id);
      if (index >= 0) {
        state.traits.splice(index, 1);
      } else {
        if (state.traits.length >= 5) {
          toast("Puoi scegliere al massimo 5 tratti: meglio un ritratto mirato che un elenco.");
          return;
        }
        state.traits.push(id);
        if (!state.confidence[id]) {
          const trait = traitData.find((item) => item.id === id);
          state.confidence[id] = trait?.defaultConfidence || "plausibile";
        }
      }
      persist();
      updateTraitUI();
      refreshFixedPortrait();
      updatePreview();
    });

    $("#generate-portrait")?.addEventListener("click", () => {
      if (selectedTraits().length < 3) {
        toast("Scegli almeno 3 tratti prima di fissare il ritratto.");
        return;
      }
      state.portrait = {
        text: buildPortraitText(),
        generatedAt: Date.now(),
        traits: [...state.traits]
      };
      persist();
      mark("ritratto", true);
      updatePreview();
      toast("Ritratto fissato. Ora puoi copiarlo, scaricarlo o stamparlo.");
    });

    $("#copy-portrait")?.addEventListener("click", () => {
      if (state.portrait) copyText(state.portrait.text);
    });
    $("#download-portrait")?.addEventListener("click", downloadPortrait);
    $("#print-portrait")?.addEventListener("click", () => {
      if (!state.portrait) return;
      renderPrintSheet();
      window.print();
    });
    window.addEventListener("beforeprint", renderPrintSheet);
  }

  function initSelfCheck() {
    const list = $("#self-check");
    const countEl = $("#open-question-count");
    const textarea = $("#open-question");
    if (list) {
      list.closest(".self-check")?.classList.toggle("is-complete", state.checks.length === 5);
      $$("input[type=checkbox]", list).forEach((input) => {
        input.checked = state.checks.includes(input.value);
        input.addEventListener("change", () => {
          state.checks = $$("input[type=checkbox]", list).filter((item) => item.checked).map((item) => item.value);
          list.closest(".self-check")?.classList.toggle("is-complete", state.checks.length === 5);
          persist();
          refreshFixedPortrait();
          updatePreview();
          if (state.checks.length === 5) toast("Lista di controllo completa: il ritratto ora può essere difeso meglio.");
        });
      });
    }
    if (textarea) {
      textarea.value = state.openQuestion;
      if (countEl) countEl.textContent = String(textarea.value.length);
      let timer;
      textarea.addEventListener("input", () => {
        state.openQuestion = textarea.value;
        if (countEl) countEl.textContent = String(textarea.value.length);
        persist();
        if (textarea.value.trim().length >= 30) mark("domanda");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          refreshFixedPortrait();
          updatePreview();
        }, 250);
      });
    }
    updatePreview();
  }

  /* =========================================================
     Quiz
     ========================================================= */
  const quizData = [
    {
      id: "q1",
      topic: "le fonti più antiche",
      question: "Qual è, tra questi, il testo cristiano più antico?",
      options: ["Lettere di Paolo", "Vangelo di Marco", "Vangelo di Giovanni", "Talmud babilonese"],
      correct: 0,
      feedback: "Le lettere autentiche di Paolo sono degli anni 50; Marco è di solito datato 65–70."
    },
    {
      id: "q2",
      topic: "Giuseppe Flavio",
      question: "Perché il Testimonium Flavianum è considerato problematico?",
      options: ["Contiene passaggi probabilmente aggiunti da copisti cristiani", "È stato scritto da Tacito", "È un Vangelo apocrifo", "Non parla di Gesù"],
      correct: 0,
      feedback: "Il passo è tramandato con aggiunte cristiane; gli studiosi discutono quali parti siano originarie."
    },
    {
      id: "q3",
      topic: "la Pietra di Pilato",
      question: "Che cosa documenta la Pietra di Pilato?",
      options: ["Che Ponzio Pilato fu prefetto di Giudea", "La condanna di Gesù", "La risurrezione", "La data di nascita di Gesù"],
      correct: 0,
      feedback: "L’iscrizione trovata a Cesarea nel 1961 conferma il titolo e il nome di Pilato, non il processo a Gesù."
    },
    {
      id: "q4",
      topic: "la Sindone",
      question: "Che esito ha dato la datazione radiocarbonio della Sindone nel 1988?",
      options: ["XIII–XIV secolo", "I secolo", "V secolo", "Non è stata datata"],
      correct: 0,
      feedback: "Tre laboratori indipendenti hanno collocato il telo tra il 1260 e il 1390."
    },
    {
      id: "q5",
      topic: "il canone",
      question: "Quanti Vangeli sono nel canone cristiano?",
      options: ["Quattro", "Due", "Sette", "Dodici"],
      correct: 0,
      feedback: "Quattro: Matteo, Marco, Luca e Giovanni. I Vangeli apocrifi sono molti di più, ma non sono nel canone."
    },
    {
      id: "q6",
      topic: "storia e fede",
      question: "Che cosa distingue il “Gesù storico” dal “Cristo della fede”?",
      options: ["Il primo è una ricostruzione metodologica, il secondo una confessione religiosa", "Sono due persone diverse", "Il primo è un mito", "Il secondo è un imperatore romano"],
      correct: 0,
      feedback: "La distinzione è metodologica: riguarda ciò che possiamo ricostruire e ciò che i credenti confessano."
    },
    {
      id: "q7",
      topic: "l’argomento dal silenzio",
      question: "Un argomento dal silenzio, da solo, quanto è forte?",
      options: ["Debole: il silenzio può avere molte spiegazioni", "Fortissimo: è una prova materiale", "È una prova solo per i Vangeli", "Vale solo per le fonti romane"],
      correct: 0,
      feedback: "Il silenzio può dipendere da ignoranza, disinteresse o perdita delle fonti: da solo non dimostra quasi nulla."
    },
    {
      id: "q8",
      topic: "i limiti delle fonti",
      question: "Che cosa NON possiamo ricavare dalle fonti antiche?",
      options: ["Un ritratto fisico attendibile di Gesù", "Che fu crocifisso sotto Pilato", "Che predicò in Galilea", "Che i suoi seguaci lo considerarono il Messia"],
      correct: 0,
      feedback: "Non abbiamo un ritratto coevo: le immagini che conosciamo sono costruzioni iconografiche posteriori."
    }
  ];

  function renderQuiz() {
    const form = $("#quiz");
    if (!form) return;
    form.innerHTML = quizData.map((question, index) => `
      <fieldset data-quiz="${question.id}">
        <legend><span class="quiz__num">${String(index + 1).padStart(2, "0")}</span>${question.question}</legend>
        ${question.options.map((option, optionIndex) => `
          <label class="quiz-option">
            <input type="radio" name="${question.id}" value="${optionIndex}">
            <span>${option}</span>
          </label>
        `).join("")}
        <p class="quiz-feedback" hidden></p>
      </fieldset>
    `).join("");
  }

  function updateQuizStatus() {
    const answered = quizData.filter((question) => state.quizAnswers[question.id] !== undefined).length;
    const status = $("#quiz-status");
    const submit = $("#quiz-submit");
    if (status) status.textContent = `${answered} di ${quizData.length} risposte`;
    if (submit) submit.disabled = answered < quizData.length;
  }

  function renderQuizFeedback(questionId) {
    const fieldset = $(`fieldset[data-quiz="${questionId}"]`);
    const question = quizData.find((item) => item.id === questionId);
    if (!fieldset || !question) return;
    const answer = state.quizAnswers[questionId];
    const labels = $$(".quiz-option", fieldset);
    labels.forEach((label) => label.classList.remove("is-correct", "is-wrong"));
    if (answer === undefined) return;
    labels.forEach((label, index) => {
      if (index === question.correct) label.classList.add("is-correct");
      if (index === answer && answer !== question.correct) label.classList.add("is-wrong");
    });
    const feedback = $(".quiz-feedback", fieldset);
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = answer === question.correct
        ? "Corretto. " + question.feedback
        : "Non è questa. " + question.feedback;
    }
  }

  function renderQuizResult() {
    const result = $("#quiz-result");
    if (!result || !state.quizResult) return;
    const score = Number(state.quizResult.score) || 0;
    const answers = state.quizResult.answers || {};
    const total = quizData.length;
    let band;
    if (score === total) {
      band = {
        title: "Metodo da investigatore",
        text: "Sai distinguere fonti, indizi e interpretazioni. Il passo successivo è discutere una posizione che non condividi."
      };
    } else if (score >= 6) {
      band = {
        title: "Buona base",
        text: "Hai gli strumenti principali. Rileggi le schede su fonti e reperti per consolidare i passaggi più sottili."
      };
    } else if (score >= 4) {
      band = {
        title: "A metà strada",
        text: "Alcune distinzioni sfuggono. Torna al Metodo e alla linea del tempo: sono i due strumenti che rendono tutto più chiaro."
      };
    } else {
      band = {
        title: "Ricomincia dal fascicolo",
        text: "Non è un esame e non è un giudizio: è un’indagine. Riapri le schede, prova il banco di lavoro e poi ritorna alle domande."
      };
    }
    const wrongTopics = quizData
      .filter((question) => answers[question.id] !== question.correct)
      .map((question) => question.topic);
    result.innerHTML = `
      <p class="eyebrow">Risultato · autovalutazione</p>
      <h3>${band.title}</h3>
      <p class="score">${score}<span style="font-size:1rem;letter-spacing:0">/${total}</span></p>
      <p>${band.text}</p>
      ${wrongTopics.length ? `<p><strong>Da rileggere:</strong> ${wrongTopics.map(escapeHTML).join(", ")}.</p>` : "<p><strong>Nessun punto critico:</strong> hai risposto correttamente a tutte le domande.</p>"}
      <p>La domanda che resta aperta vale più di un punteggio: scrivila nel ritratto.</p>
    `;
    result.hidden = false;
  }

  function initQuiz() {
    const form = $("#quiz");
    if (!form) return;

    quizData.forEach((question) => {
      const answer = state.quizAnswers[question.id];
      if (answer !== undefined) {
        const input = form.querySelector(`input[name="${question.id}"][value="${answer}"]`);
        if (input) input.checked = true;
        renderQuizFeedback(question.id);
      }
    });
    updateQuizStatus();
    if (state.quizResult) {
      renderQuizResult();
      mark("quiz", true);
    }

    form.addEventListener("change", (event) => {
      const input = event.target.closest('input[type="radio"]');
      if (!input) return;
      const questionId = input.name;
      const question = quizData.find((item) => item.id === questionId);
      if (!question) return;
      const hadResult = Boolean(state.quizResult);
      state.quizAnswers[questionId] = Number(input.value);
      if (hadResult) {
        state.quizResult = null;
        $("#quiz-result").hidden = true;
        unmark("quiz");
      }
      persist();
      renderQuizFeedback(questionId);
      updateQuizStatus();
    });

    $("#quiz-submit")?.addEventListener("click", () => {
      const answers = {};
      let score = 0;
      quizData.forEach((question) => {
        const answer = state.quizAnswers[question.id];
        answers[question.id] = answer;
        if (answer === question.correct) score += 1;
      });
      state.quizResult = { score, answers, at: Date.now() };
      persist();
      renderQuizResult();
      mark("quiz");
      $("#quiz-result")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
    });

    $("#quiz-reset")?.addEventListener("click", () => {
      state.quizAnswers = {};
      state.quizResult = null;
      unmark("quiz");
      persist();
      renderQuiz();
      quizData.forEach((question) => {
        const fieldset = $(`fieldset[data-quiz="${question.id}"]`);
        if (!fieldset) return;
        $$(".quiz-option", fieldset).forEach((label) => label.classList.remove("is-correct", "is-wrong"));
        const feedback = $(".quiz-feedback", fieldset);
        if (feedback) feedback.hidden = true;
      });
      updateQuizStatus();
      const result = $("#quiz-result");
      if (result) result.hidden = true;
      toast("Autovalutazione azzerata: puoi riprovare quando vuoi.");
    });
  }

  /* =========================================================
     Glossario
     ========================================================= */
  function initGlossary() {
    const glossary = $("#glossary");
    if (!glossary) return;
    $$("details", glossary).forEach((details, index) => {
      details.dataset.index = String(index);
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        if (!state.glossarySeen.includes(index)) {
          state.glossarySeen.push(index);
          persist();
        }
        if (state.glossarySeen.length >= 5) mark("glossario");
      });
    });
  }

  /* =========================================================
     Tavole e lightbox
     ========================================================= */
  function initPlates() {
    const dialog = $("#plate-dialog");
    if (!dialog) return;
    const image = $("#plate-dialog-img");
    const title = $("#plate-dialog-title");
    const caption = $("#plate-dialog-caption");
    const close = $("#plate-dialog-close");

    $$("[data-plate]").forEach((button) => {
      button.addEventListener("click", () => {
        const figure = button.closest("figure");
        const source = button.querySelector("img");
        if (!image || !source) return;
        image.src = button.dataset.full || source.currentSrc || source.src;
        image.alt = source.alt || "";
        image.width = Number(source.getAttribute("width")) || image.naturalWidth;
        image.height = Number(source.getAttribute("height")) || image.naturalHeight;
        if (title) title.textContent = figure?.querySelector("h3")?.textContent?.trim() || "Tavola";
        if (caption) caption.textContent = figure?.querySelector(".plate__credit")?.textContent?.trim() || "";
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        close?.focus();
      });
    });

    close?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  /* =========================================================
     Reset
     ========================================================= */
  function initReset() {
    const trigger = $("#reset-progress");
    const dialog = $("#reset-dialog");
    const cancel = $("#reset-cancel");
    const confirm = $("#reset-confirm");
    if (!trigger || !dialog) return;

    trigger.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else if (window.confirm("Azzerare il fascicolo? I progressi salvati in questo browser verranno cancellati.")) resetAll();
    });
    cancel?.addEventListener("click", () => dialog.close());
    confirm?.addEventListener("click", resetAll);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  function resetAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Nothing else to clear. */
    }
    window.location.reload();
  }

  /* =========================================================
     Init
     ========================================================= */
  function init() {
    state.evidence = state.evidence.filter((id) => Boolean(EVIDENCE_LABELS[id]));
    renderTimeline();
    renderDebate();
    renderTraits();
    renderQuiz();

    initTopbar();
    initScrollUI();
    initReveal();
    initMethod();
    initSources();
    initTimeline();
    initAtlas();
    initLab();
    initTrial();
    initDebate();
    initPortrait();
    initSelfCheck();
    initQuiz();
    initGlossary();
    initPlates();
    initReset();

    updateProgress();
    if (state.evidence.length) {
      window.setTimeout(() => toast("Fascicolo ripristinato dal browser: i tuoi indizi sono ancora qui."), 700);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
