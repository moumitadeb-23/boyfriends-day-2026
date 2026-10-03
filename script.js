/* ============================================================
   script.js — vanilla JS, no build step
   ============================================================ */
(() => {
  "use strict";

  const C = window.APP_CONFIG;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const state = {
    config: JSON.parse(JSON.stringify(C)),
    gallery: [...C.gallery],
    playlist: [...C.playlist],
    currentSong: 0,
    isPlaying: false,
    shuffle: false,
    repeat: false,
    quizIndex: 0,
    quizScore: 0,
    lightboxIndex: 0,
    db: null
  };

  const DB_NAME = "bhutummr-goswami-gift";
  const DB_VERSION = 1;

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function initDB() {
    return new Promise((resolve) => {
      if (!("indexedDB" in window)) return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("audio")) db.createObjectStore("audio", { keyPath: "id", autoIncrement: true });
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "key" });
      };
      req.onsuccess = () => { state.db = req.result; resolve(req.result); };
      req.onerror = () => resolve(null);
    });
  }

  function dbPut(store, value) {
    return new Promise(resolve => {
      if (!state.db) return resolve(false);
      const tx = state.db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  function dbGetAll(store) {
    return new Promise(resolve => {
      if (!state.db) return resolve([]);
      const req = state.db.transaction(store, "readonly").objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  function dbDelete(store, key) {
    return new Promise(resolve => {
      if (!state.db) return resolve(false);
      const tx = state.db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  function loadLocalConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem("boyfriendsDaySettings") || "null");
      if (saved) {
        state.config = deepMerge(state.config, saved);
      }
    } catch {}
  }

  function deepMerge(base, extra) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    Object.keys(extra || {}).forEach(k => {
      if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k]) && typeof out[k] === "object") out[k] = deepMerge(out[k], extra[k]);
      else out[k] = extra[k];
    });
    return out;
  }

  function applyTheme() {
    const t = state.config.theme || {};
    document.body.classList.remove("theme-rose", "theme-lavender", "theme-emerald", "font-modern", "font-romantic", "no-effects", "no-animations");
    if (t.preset && t.preset !== "cinematic") document.body.classList.add(`theme-${t.preset}`);
    if (t.font === "modern") document.body.classList.add("font-modern");
    if (t.font === "romantic") document.body.classList.add("font-romantic");
    if (t.effects === false) document.body.classList.add("no-effects");
    if (t.animations === false) document.body.classList.add("no-animations");
    document.documentElement.style.setProperty("--accent", t.accent || "#ff6fae");
    $("#settingsButton").style.display = C.SHOW_EDITOR ? "" : "none";
    $$(".editor-only").forEach(el => el.style.display = C.SHOW_EDITOR ? "" : "none");
  }

  function renderBasics() {
    $("#heroName").textContent = state.config.couple.him;
    $("#heroTagline").textContent = state.config.couple.tagline;
    document.title = `Happy Boyfriend's Day, ${state.config.couple.him} ❤️`;
    const marquee = $("#loveMarquee");
    const items = [...state.config.loves, ...state.config.loves];
    marquee.innerHTML = items.map(x => `<span>♥ <b>${escapeHTML(x)}</b></span>`).join("");
  }

  function renderTimeline() {
    $("#timeline").innerHTML = state.config.memories.map((m, i) => `
      <article class="memory reveal">
        <div class="memory-dot" aria-hidden="true"></div>
        <div class="memory-card">
          <div class="memory-photo"><img src="${safePath(m.image)}" alt="${escapeHTML(m.title)}"></div>
          <div class="memory-copy">
            <span class="memory-date">${escapeHTML(m.date)}</span>
            <h3>${escapeHTML(m.title)}</h3>
            <p>${escapeHTML(m.text)}</p>
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderGallery() {
    $("#galleryGrid").innerHTML = state.gallery.map((g, i) => `
      <button class="gallery-item reveal" type="button" data-gallery="${i}" aria-label="Open photo ${i + 1}">
        <img src="${safePath(g.image)}" alt="${escapeHTML(g.caption)}">
        <span class="gallery-caption">${escapeHTML(g.caption)}</span>
      </button>
    `).join("");
    $$(".gallery-item").forEach(el => el.addEventListener("click", () => openLightbox(+el.dataset.gallery)));
    hydratePhotoOverrides();
  }

  function renderReasons() {
    $("#reasonGrid").innerHTML = state.config.reasons.map((r, i) => `
      <button class="reason-card reveal" type="button" aria-label="Reveal reason ${i + 1}">
        <span class="reason-inner">
          <span class="reason-front"><span>${String(i + 1).padStart(2, "0")}</span>Tap to reveal ♥</span>
          <span class="reason-back">${escapeHTML(r)}</span>
        </span>
      </button>
    `).join("");
    $$(".reason-card").forEach((el) => {
      const toggle = () => {
        el.classList.toggle("flipped");
        el.setAttribute("aria-pressed", el.classList.contains("flipped") ? "true" : "false");
      };
      el.setAttribute("aria-pressed", "false");
      el.addEventListener("click", toggle);
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); }
      });
    });
  }

  function renderLetter() {
    const target = $("#loveLetter");
    target.textContent = "";
    const text = state.config.loveLetter;
    const words = text.split(/(\s+)/);
    let i = 0;
    let timer = null;
    const reveal = () => {
      if (i >= words.length) return;
      target.textContent += words[i++];
      timer = setTimeout(reveal, 12);
    };
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { reveal(); obs.disconnect(); }
    }, { threshold: .2 });
    obs.observe(target);
    return () => clearTimeout(timer);
  }

  function renderQuiz() {
    const q = state.config.quiz[state.quizIndex];
    $("#quizProgress").textContent = `${Math.min(state.quizIndex + 1, state.config.quiz.length)} / ${state.config.quiz.length}`;
    $("#quizBody").innerHTML = `
      <div class="quiz-question">${escapeHTML(q.q)}</div>
      <div class="quiz-options">
        ${q.options.map((o, i) => `<button class="quiz-option" data-answer="${i}" type="button">${escapeHTML(o)}</button>`).join("")}
      </div>
    `;
    $$(".quiz-option").forEach(btn => btn.addEventListener("click", () => answerQuiz(+btn.dataset.answer)));
  }

  function answerQuiz(answer) {
    const q = state.config.quiz[state.quizIndex];
    const buttons = $$(".quiz-option");
    buttons.forEach(b => b.disabled = true);
    const selected = buttons[answer];
    if (answer === q.answer) {
      state.quizScore++;
      selected.classList.add("correct");
      popHearts(window.innerWidth / 2, window.innerHeight / 2);
    } else {
      selected.classList.add("wrong");
      buttons[q.answer].classList.add("correct");
    }
    setTimeout(() => {
      state.quizIndex++;
      if (state.quizIndex >= state.config.quiz.length) {
        const score = state.quizScore;
        const message = score === 5 ? "Okay, Hubbyy. You know us suspiciously well. 😭❤️" :
          score >= 3 ? "Not bad, Mr Goswami. You definitely get boyfriend points. 🥹" :
          "Hmm. Looks like Bhutum needs to give you a few more clues. 😂❤️";
        $("#quizBody").innerHTML = `<div class="quiz-result"><strong>${score} / 5</strong><p>${message}</p><button class="btn btn-primary" id="retryQuiz">Play again</button></div>`;
        $("#quizProgress").textContent = "Done ♥";
        $("#retryQuiz").addEventListener("click", () => {
          state.quizIndex = 0; state.quizScore = 0; renderQuiz();
        });
      } else renderQuiz();
    }, 700);
  }

  function renderEnvelopes() {
    $("#envelopeGrid").innerHTML = state.config.envelopes.map((e, i) => `
      <button class="open-envelope reveal" type="button" data-envelope="${i}">
        <span class="env-icon">${e.icon}</span>
        <h4>${escapeHTML(e.title)}</h4>
        <p>Tap to open</p>
      </button>
    `).join("");
    $$(".open-envelope").forEach(el => el.addEventListener("click", () => {
      const e = state.config.envelopes[+el.dataset.envelope];
      el.innerHTML = `<span class="env-icon">💗</span><h4>${escapeHTML(e.title)}</h4><p>${escapeHTML(e.text)}</p>`;
      popHearts(el.getBoundingClientRect().left + el.offsetWidth / 2, el.getBoundingClientRect().top + 30);
    }));
  }

  function renderCoupons() {
    $("#couponGrid").innerHTML = state.config.coupons.map((c, i) => `
      <button class="coupon reveal" type="button" data-coupon="${i}">
        <h4>${escapeHTML(c.title)}</h4><p>${escapeHTML(c.text)}</p>
      </button>
    `).join("");
    $$(".coupon").forEach(el => el.addEventListener("click", () => {
      el.classList.toggle("redeemed");
      toast(el.classList.contains("redeemed") ? "Coupon redeemed. Come collect your hug. ❤️" : "Coupon returned to the wallet.");
    }));
  }

  function setupRevealObserver() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: .12 });
    $$(".reveal").forEach(el => observer.observe(el));
  }

  function startCounter() {
    const render = () => {
      const startValue = state.config?.couple?.startDate || C?.couple?.startDate;
      const start = new Date(startValue).getTime();
      if (!Number.isFinite(start)) {
        $("#days").textContent = "0";
        $("#hours").textContent = "00";
        $("#minutes").textContent = "00";
        $("#seconds").textContent = "00";
        return;
      }
      let diff = Math.max(0, Date.now() - start);
      const days = Math.floor(diff / 86400000); diff %= 86400000;
      const hours = Math.floor(diff / 3600000); diff %= 3600000;
      const mins = Math.floor(diff / 60000); diff %= 60000;
      const secs = Math.floor(diff / 1000);
      $("#days").textContent = days.toLocaleString();
      $("#hours").textContent = String(hours).padStart(2, "0");
      $("#minutes").textContent = String(mins).padStart(2, "0");
      $("#seconds").textContent = String(secs).padStart(2, "0");
    };
    render();
    clearInterval(window.__relationshipCounterTimer);
    window.__relationshipCounterTimer = setInterval(render, 1000);
  }

  function setupIntro() {
    const open = () => {
      $("#intro").classList.add("hidden");
      $("#app").hidden = false;
      document.body.classList.add("opened");
      startAudioOnGesture();
      window.scrollTo(0, 0);
      setTimeout(() => {
        $$(".reveal").forEach(el => el.classList.add("visible"));
      }, 300);
    };
    $("#openButton").addEventListener("click", open);
    $("#envelopeButton").addEventListener("click", open);
    $("#envelopeButton").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") open(); });
  }

  function setupSecret() {
    if (!C.secretLock?.enabled) return;
    $("#secretGate").hidden = false;
    $("#intro").style.display = "none";
    $("#secretForm").addEventListener("submit", e => {
      e.preventDefault();
      if ($("#secretInput").value === C.secretLock.password) {
        $("#secretGate").hidden = true;
        $("#intro").style.display = "grid";
      } else $("#secretError").textContent = "Almost. Try our special date. ❤️";
    });
  }

  function setupLightbox() {
    $("#lightboxClose").addEventListener("click", closeLightbox);
    $("#lightboxPrev").addEventListener("click", () => moveLightbox(-1));
    $("#lightboxNext").addEventListener("click", () => moveLightbox(1));
    $("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox") closeLightbox(); });
    document.addEventListener("keydown", e => {
      if (!$("#lightbox").hidden) {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") moveLightbox(-1);
        if (e.key === "ArrowRight") moveLightbox(1);
      }
    });
    let x = 0;
    $("#lightbox").addEventListener("touchstart", e => x = e.changedTouches[0].clientX, {passive:true});
    $("#lightbox").addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - x;
      if (Math.abs(dx) > 45) moveLightbox(dx > 0 ? -1 : 1);
    }, {passive:true});
  }

  function openLightbox(i) {
    state.lightboxIndex = i;
    const item = state.gallery[i];
    $("#lightboxImage").src = safePath(item.image);
    $("#lightboxImage").alt = item.caption;
    $("#lightboxCaption").textContent = item.caption;
    $("#lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function moveLightbox(dir) {
    state.lightboxIndex = (state.lightboxIndex + dir + state.gallery.length) % state.gallery.length;
    openLightbox(state.lightboxIndex);
  }
  function closeLightbox() {
    $("#lightbox").hidden = true;
    document.body.style.overflow = "";
  }

  function setupSurprise() {
    const fire = () => {
      $("#surpriseMessage").hidden = false;
      $("#finalTitle").textContent = `${state.config.couple.him}, you're still my favourite.`;
      popHearts(window.innerWidth / 2, window.innerHeight * .55, 32);
      toast("Surprise unlocked. I love you. ❤️");
      if (window.confetti) window.confetti();
    };
    $("#surpriseButton").addEventListener("click", fire);
    $("#surpriseTop").addEventListener("click", () => {
      $("#finalSurprise").scrollIntoView({behavior:"smooth"});
      setTimeout(fire, 700);
    });
  }

  function popHearts(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "heart-pop";
      el.textContent = Math.random() > .25 ? "♥" : "✦";
      el.style.left = `${x + (Math.random() - .5) * 80}px`;
      el.style.top = `${y + (Math.random() - .5) * 30}px`;
      el.style.animationDelay = `${Math.random() * .2}s`;
      $("#heartLayer").appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }
  }

  function setupHeartTrail() {
    let last = 0;
    window.addEventListener("mousemove", e => {
      $("#cursorHeart").style.left = `${e.clientX}px`;
      $("#cursorHeart").style.top = `${e.clientY}px`;
      $("#cursorHeart").style.opacity = "1";
      if (Date.now() - last > 140) {
        last = Date.now();
        if (Math.random() < .35) popHearts(e.clientX, e.clientY, 1);
      }
    }, {passive:true});
    window.addEventListener("mouseleave", () => $("#cursorHeart").style.opacity = "0");
    window.addEventListener("touchstart", e => {
      const t = e.touches[0];
      if (t) popHearts(t.clientX, t.clientY, 3);
    }, {passive:true});
  }

  function setupParticles() {
    const canvas = $("#particleCanvas"), ctx = canvas.getContext("2d");
    let particles = [];
    const resize = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; canvas.style.width = innerWidth+"px"; canvas.style.height = innerHeight+"px"; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); };
    const create = () => particles = Array.from({length: Math.min(75, Math.floor(innerWidth / 13))}, () => ({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.5+.3,v:Math.random()*.35+.08,a:Math.random()*.6+.15}));
    const draw = () => {
      ctx.clearRect(0,0,innerWidth,innerHeight);
      if (state.config.theme.particles !== false) {
        for (const p of particles) {
          p.y -= p.v; if (p.y < -5) {p.y = innerHeight+5; p.x=Math.random()*innerWidth;}
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,190,220,${p.a})`; ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    };
    resize(); create(); draw(); addEventListener("resize",()=>{resize();create()});
  }

  function setupMusic() {
    const audio = $("#audio");
    const load = (index) => {
      if (!state.playlist.length) {
        $("#playerTitle").textContent = "Your Love Soundtrack";
        $("#playerArtist").textContent = C.SHOW_EDITOR ? "Add songs from ⚙ music settings" : "A song for us is waiting here ❤️";
        $("#playSong").disabled = true;
        $("#prevSong").disabled = true;
        $("#nextSong").disabled = true;
        $("#playerCover").src = "assets/images/memory-01.jpg";
        return;
      }
      $("#playSong").disabled = false;
      $("#prevSong").disabled = false;
      $("#nextSong").disabled = false;
      state.currentSong = (index + state.playlist.length) % state.playlist.length;
      const s = state.playlist[state.currentSong];
      audio.src = s.src;
      audio.load();
      $("#playerTitle").textContent = s.title;
      $("#playerArtist").textContent = s.artist;
      $("#playerCover").src = s.cover || "assets/images/memory-01.jpg";
      $("#playerCover").alt = `${s.title} cover`;
      $("#seekBar").value = 0;
    };
    const play = () => audio.play().then(() => {
      state.isPlaying = true; $("#playSong").textContent = "⏸"; $("#vinyl").classList.add("playing");
    }).catch(() => toast("Tap play once more to start the music."));
    const pause = () => { audio.pause(); state.isPlaying=false; $("#playSong").textContent="▶"; $("#vinyl").classList.remove("playing"); };
    $("#playSong").addEventListener("click", () => state.isPlaying ? pause() : play());
    $("#prevSong").addEventListener("click", () => { load(state.currentSong - 1); play(); });
    $("#nextSong").addEventListener("click", () => {
      if (state.shuffle && state.playlist.length > 1) {
        let n; do n = Math.floor(Math.random()*state.playlist.length); while(n===state.currentSong);
        load(n);
      } else load(state.currentSong+1);
      play();
    });
    audio.addEventListener("timeupdate", () => { $("#seekBar").value = audio.duration ? (audio.currentTime/audio.duration)*100 : 0; });
    $("#seekBar").addEventListener("input", e => { if (audio.duration) audio.currentTime = (+e.target.value/100)*audio.duration; });
    $("#volumeBar").addEventListener("input", e => audio.volume = +e.target.value);
    $("#muteSong").addEventListener("click", () => { audio.muted=!audio.muted; $("#muteSong").textContent=audio.muted?"🔇":"🔊"; });
    $("#shuffleSong").addEventListener("click", () => { state.shuffle=!state.shuffle; $("#shuffleSong").style.color=state.shuffle?"var(--accent)":"#eee"; });
    $("#repeatSong").addEventListener("click", () => { state.repeat=!state.repeat; $("#repeatSong").style.color=state.repeat?"var(--accent)":"#eee"; });
    audio.addEventListener("ended", () => {
      if (state.repeat) { audio.currentTime=0; play(); }
      else $("#nextSong").click();
    });
    $("#volumeBar").value = .75; audio.volume=.75;
    $("#musicClose").addEventListener("click", () => {
      $("#musicPlayer").classList.add("is-hidden");
      $("#musicReopen").classList.add("is-visible");
    });
    $("#musicReopen").addEventListener("click", () => {
      $("#musicPlayer").classList.remove("is-hidden");
      $("#musicReopen").classList.remove("is-visible");
    });
    load(0);
    window.__loadMusicTrack = load;
    window.__playMusic = play;
  }

  function startAudioOnGesture() {
    if (window.__playMusic) window.__playMusic();
  }

  function parseEmbed(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be") || u.hostname.includes("youtube.com")) {
        let id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : (u.searchParams.get("v") || u.pathname.split("/").pop());
        if (!id) return null;
        return {type:"youtube", embed:`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`, title:"YouTube song", artist:"YouTube", src:url};
      }
      if (u.hostname.includes("spotify.com")) {
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) return {type:"spotify", embed:`https://open.spotify.com/embed/${parts[0]}/${parts[1]}?utm_source=generator`, title:"Spotify song", artist:"Spotify", src:url};
      }
    } catch {}
    return null;
  }

  function renderMusicLibrary() {
    const local = state.playlist.filter(s => s.localAdded);
    $("#musicLibrary").innerHTML = local.length ? local.map((s,i) => `
      <div class="music-item"><span>${escapeHTML(s.title)} · ${escapeHTML(s.artist || "Local")}</span><button type="button" data-remove-song="${i}">×</button></div>
    `).join("") : `<p class="settings-note">No browser-added songs yet.</p>`;
    $$("[data-remove-song]").forEach(btn => btn.addEventListener("click", async () => {
      const locals = state.playlist.filter(s => s.localAdded);
      const song = locals[+btn.dataset.removeSong];
      if (song?.dbId) await dbDelete("audio", song.dbId);
      state.playlist = state.playlist.filter(s => s !== song);
      localStorage.setItem("browserPlaylistMeta", JSON.stringify(state.playlist.filter(s=>s.localAdded).map(({dbId,title,artist,cover})=>({dbId,title,artist,cover}))));
      if (state.playlist.length && window.__loadMusicTrack) window.__loadMusicTrack(Math.min(state.currentSong, state.playlist.length - 1));
      else if (window.__loadMusicTrack) window.__loadMusicTrack(0);
      renderMusicLibrary();
      toast("Song removed from this browser.");
    }));
  }

  async function loadBrowserAudio() {
    const records = await dbGetAll("audio");
    records.forEach(r => {
      const exists = state.playlist.some(s => s.dbId === r.id);
      if (!exists) state.playlist.push({dbId:r.id, localAdded:true, title:r.title, artist:r.artist, src:URL.createObjectURL(r.blob), cover:r.cover});
    });
    renderMusicLibrary();
    if (state.playlist.length && window.__loadMusicTrack) window.__loadMusicTrack(0);
  }

  function setupSettings() {
    if (!C.SHOW_EDITOR) return;
    const drawer = $("#settingsDrawer");
    const open = () => { drawer.classList.add("open"); drawer.setAttribute("aria-hidden","false"); };
    const close = () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); };
    $("#settingsButton").addEventListener("click", open);
    $("#playerSettings").addEventListener("click", open);
    $("#closeSettings").addEventListener("click", close);

    $("#editHim").value = state.config.couple.him;
    $("#editMe").value = state.config.couple.me;
    $("#editDate").value = new Date(state.config.couple.startDate).toISOString().slice(0,16);
    $("#editAccent").value = state.config.theme.accent || "#ff6fae";
    $("#editTheme").value = state.config.theme.preset || "cinematic";
    $("#editFont").value = state.config.theme.font || "elegant";
    $("#toggleParticles").checked = state.config.theme.particles !== false;
    $("#toggleEffects").checked = state.config.theme.effects !== false;
    $("#toggleAnimations").checked = state.config.theme.animations !== false;
    $("#editLetter").value = state.config.loveLetter;

    const slots = state.gallery.map((_,i)=>`<option value="${i}">Gallery photo ${i+1}</option>`).join("");
    $("#photoSlot").innerHTML = slots;

    $("#saveSettings").addEventListener("click", () => {
      state.config.couple.him = $("#editHim").value.trim() || C.couple.him;
      state.config.couple.me = $("#editMe").value.trim() || C.couple.me;
      state.config.couple.startDate = new Date($("#editDate").value).toISOString();
      state.config.theme.accent = $("#editAccent").value;
      state.config.theme.preset = $("#editTheme").value;
      state.config.theme.font = $("#editFont").value;
      state.config.theme.particles = $("#toggleParticles").checked;
      state.config.theme.effects = $("#toggleEffects").checked;
      state.config.theme.animations = $("#toggleAnimations").checked;
      state.config.loveLetter = $("#editLetter").value;
      localStorage.setItem("boyfriendsDaySettings", JSON.stringify({
        couple:state.config.couple, theme:state.config.theme, loveLetter:state.config.loveLetter
      }));
      applyTheme(); renderBasics(); renderLetter(); startCounter();
      toast("Your changes are saved on this browser. ❤️");
    });

    $("#resetSettings").addEventListener("click", () => {
      localStorage.removeItem("boyfriendsDaySettings");
      state.config = JSON.parse(JSON.stringify(C));
      location.reload();
    });

    $("#exportSettings").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.config,null,2)], {type:"application/json"});
      const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="boyfriends-day-settings.json"; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),500);
    });

    $("#importSettings").addEventListener("change", async e => {
      const f = e.target.files?.[0]; if (!f) return;
      try {
        const imported = JSON.parse(await f.text());
        state.config = deepMerge(state.config, imported);
        localStorage.setItem("boyfriendsDaySettings", JSON.stringify(imported));
        toast("Settings imported. Reloading...");
        setTimeout(()=>location.reload(),500);
      } catch { toast("That JSON file could not be imported."); }
    });

    $("#photoUpload").addEventListener("change", async e => {
      const file = e.target.files?.[0]; if (!file) return;
      const slot = +$("#photoSlot").value;
      if (state.db) await dbPut("photos", {key:`slot-${slot}`, blob:file});
      state.gallery[slot].image = URL.createObjectURL(file);
      renderGallery(); toast(`Gallery photo ${slot+1} replaced on this browser.`);
    });

    $("#audioUpload").addEventListener("change", async e => {
      for (const file of [...(e.target.files || [])]) {
        const record = {title:file.name.replace(/\.[^.]+$/,""), artist:"Uploaded on this device", blob:file, cover:"assets/images/memory-01.jpg"};
        const ok = await dbPut("audio", record);
        if (ok) {
          const all = await dbGetAll("audio");
          const newest = all.sort((a,b)=>b.id-a.id)[0];
          state.playlist.push({dbId:newest.id,localAdded:true,title:record.title,artist:record.artist,src:URL.createObjectURL(file),cover:record.cover});
        }
      }
      renderMusicLibrary();
      if (window.__loadMusicTrack) window.__loadMusicTrack(state.playlist.length - 1);
      toast("Audio added to your local music library. 🎧");
    });

    $("#addMusicLink").addEventListener("click", () => {
      const value = $("#musicLink").value.trim();
      const embed = parseEmbed(value);
      if (!embed) return toast("Please paste a valid YouTube or Spotify link.");
      toast(`${embed.title} link saved as an embed option. Open it from the editor library.`);
      const item = document.createElement("div");
      item.className = "music-item";
      item.innerHTML = `<span>${escapeHTML(embed.artist)} · ${escapeHTML(value)}</span><button type="button">↗</button>`;
      item.querySelector("button").addEventListener("click",()=>window.open(embed.embed,"_blank","noopener"));
      $("#musicLibrary").prepend(item);
      $("#musicLink").value="";
    });
  }

  async function hydratePhotoOverrides() {
    const records = await dbGetAll("photos");
    records.forEach(r => {
      const idx = Number(String(r.key).replace("slot-",""));
      if (!Number.isNaN(idx) && state.gallery[idx]) state.gallery[idx].image = URL.createObjectURL(r.blob);
    });
    $$(".gallery-item").forEach((el,i)=>{
      const img=el.querySelector("img"); if(img && state.gallery[i]) img.src=state.gallery[i].image;
    });
  }

  function setupNav() {
    addEventListener("scroll",()=>$("#topbar").classList.toggle("scrolled",scrollY>30),{passive:true});
  }

  function setupEasterEgg() {
    $("#easterEgg").addEventListener("click", () => {
      toast(state.config.easterEggMessage);
      popHearts(innerWidth-30, innerHeight-45, 12);
    });
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function safePath(value) {
    return String(value || "").replace(/["'<>]/g,"");
  }

  async function init() {
    loadLocalConfig();
    applyTheme();
    await initDB();
    renderBasics();
    renderTimeline();
    renderGallery();
    renderReasons();
    renderLetter();
    renderQuiz();
    renderEnvelopes();
    renderCoupons();
    setupIntro();
    setupSecret();
    setupLightbox();
    setupSurprise();
    setupHeartTrail();
    setupParticles();
    setupMusic();
    setupSettings();
    setupNav();
    setupEasterEgg();
    startCounter();
    await loadBrowserAudio();
    setupRevealObserver();
  }

  init();
})();
