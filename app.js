/* QUADIS Gallery: comportamento do site (base: Octane, 10/2026). Sem bibliotecas. Tudo funciona sem isto; isto só melhora. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const raiz = document.documentElement;

  /* ── Movimento reduzido: sistema + interruptor do rodapé (soma, nunca contraria) ── */
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const guardado = () => { try { return localStorage.getItem('qg-mov') === 'reduzido'; } catch { return false; } };
  const reduzido = () => mq.matches || guardado();
  const aplicaMov = () => {
    raiz.dataset.mov = reduzido() ? 'reduzido' : 'normal';
    $$('.mov').forEach((b) => { b.setAttribute('aria-pressed', String(reduzido())); });
    document.dispatchEvent(new CustomEvent('qg:mov'));
  };
  aplicaMov(); mq.addEventListener('change', aplicaMov);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.mov'); if (!b) return;
    try { guardado() ? localStorage.removeItem('qg-mov') : localStorage.setItem('qg-mov', 'reduzido'); } catch {}
    aplicaMov();
  });

  /* ── Cabeçalho: sólido depois do topo, esconde a descer, volta a subir ── */
  const cab = $('.cab');
  if (cab) {
    let antes = 0;
    const ao = () => {
      const y = scrollY;
      const pin = $('.hero-pin'), lim = pin && !reduzido() ? pin.offsetHeight - innerHeight - 40 : 40;
      cab.classList.toggle('solido', y > lim);
      antes = y;
    };
    /* o estado do cabeçalho confere-se também quando a página acaba de carregar, volta do histórico ou muda de tamanho:
       o browser pode repor a posição do scroll sem avisar, e o cabeçalho ficava por cima da faixa do topo */
    ao(); addEventListener('scroll', ao, { passive: true }); ['load', 'pageshow', 'resize'].forEach((ev) => addEventListener(ev, () => requestAnimationFrame(ao))); setTimeout(ao, 400); setTimeout(ao, 1500);
  }

  /* ── Menu de telemóvel: é uma página, com foco preso e Esc ── */
  const menu = $('.menu'), abre = $('.menu-bt');
  if (menu && abre) {
    const fecha = () => { menu.removeAttribute('data-aberto'); menu.inert = true; abre.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; abre.focus(); };
    menu.inert = true;
    abre.addEventListener('click', () => { menu.dataset.aberto = ''; menu.inert = false; abre.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; setTimeout(() => $('.menu-fechar', menu).focus(), 60); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.hasAttribute('data-aberto')) fecha(); });
    $('.menu-fechar', menu).addEventListener('click', fecha);
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { const f = $$('a,button', menu); const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
  }

  /* ── Revelações: títulos por linha, blocos, imagens ── */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-rev],[data-linhas],[data-img],.duarte,.importa').forEach((el) => io.observe(el));

  /* ── Números que contam (ano, km, cv) — o valor final já está no HTML ── */
  const fmt = { format: (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') };
  const ioN = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; ioN.unobserve(e.target);
    const el = e.target, fim = +el.dataset.conta, simples = el.dataset.simples === '1';
    if (reduzido() || !fim) return;
    const t0 = performance.now(), dur = 1200, ini = simples ? Math.max(0, fim - 60) : 0;
    const passo = (t) => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4), v = Math.round(ini + (fim - ini) * k); el.textContent = simples ? v : fmt.format(v); if (p < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  }), { threshold: 0.6 });
  $$('[data-conta]').forEach((el) => ioN.observe(el));

  /* ── Vídeo do hero: uma só fonte (a do ecrã) e arranque garantido. Se o browser recusar o arranque,
        volta a tentar quando o vídeo está pronto, quando o separador fica visível e ao primeiro gesto.
        Só pára com o interruptor «Reduzir movimento» do rodapé. ── */
  const v = $('.hero video');
  if (v) {
    const fonte = () => { const px = innerWidth * (devicePixelRatio || 1), d = v.dataset;      // píxeis reais do ecrã: serve-se a melhor versão que ele consegue mostrar
      if (matchMedia('(max-width: 760px) and (orientation: portrait)').matches) return px >= 1200 && d.movel4k ? d.movel4k : px >= 1000 ? d.movelHd : d.movel;
      return px >= 3000 ? d['4k'] : px >= 2000 ? d['2k'] : px >= 1600 ? d.grande : d.medio; };   // 1600: um portátil de 1350 px a 1x leva o 720p (livro das falhas, GT50)
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    let fora = false, parado = false; const bt = $('.hero .pausa');
    const toca = () => {
      if (guardado() || fora || parado || document.hidden) return;
      if (!v.getAttribute('src')) { v.src = fonte(); v.load(); }
      const pr = v.play(); if (pr && pr.catch) pr.catch(() => {});
    };
    v.addEventListener('playing', () => v.classList.add('a-tocar'));
    /* abertura: o título nasce escondido e só entra quando o logótipo sai (4,3 s). Se o filme não arrancar
       em 3,5 s, ou com movimento reduzido, o título aparece logo. Em cada volta do filme repete-se. */
    const heroEl = v.closest('.hero'); let tocou = false, desistiu = false;
    const vez = () => { tocou = tocou || v.currentTime > 0.05;
      const noLogo = v.currentTime < 4.3 || (v.duration && v.currentTime > v.duration - 0.6);
      heroEl.classList.toggle('logo-a-frente', !guardado() && (tocou ? (!v.paused && noLogo) : !desistiu)); };   // com «Reduzir movimento» do sistema corre a versão calma (CSS); só o interruptor do rodapé a tira
    setTimeout(() => { desistiu = true; vez(); }, 3500); vez(); document.addEventListener('qg:mov', vez);
    v.addEventListener('timeupdate', vez); v.addEventListener('pause', vez); v.addEventListener('playing', vez);
    ['loadeddata', 'canplay', 'pause', 'stalled'].forEach((ev) => v.addEventListener(ev, () => { if (v.paused) setTimeout(toca, 150); }));
    document.addEventListener('visibilitychange', toca); addEventListener('pageshow', toca); addEventListener('focus', toca);
    const gesto = () => toca(); ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, gesto, { passive: true }));
    new IntersectionObserver(([e]) => { fora = !e.isIntersecting; if (fora) v.pause(); else toca(); }).observe(v);
    document.addEventListener('qg:mov', () => { if (guardado()) v.pause(); else toca(); });
    const sinal = () => { if (bt) { bt.setAttribute('aria-pressed', String(v.paused)); bt.setAttribute('aria-label', v.paused ? 'Reanudar la película' : 'Pausar la película'); } };
    v.addEventListener('playing', sinal); v.addEventListener('pause', sinal);
    if (bt) bt.addEventListener('click', () => { parado = !v.paused; if (parado) v.pause(); else toca(); });
    toca(); setTimeout(toca, 800); setTimeout(toca, 2500);
  }

  /* ── Hero em ecrã inteiro que, ao descer, encolhe para uma moldura (o scroll conduz --p de 0 a 1) ── */
  const pinH = $('.hero-pin');
  if (pinH) {
    let pedido = false;
    const mede = () => { pedido = false; const d = pinH.offsetHeight - innerHeight; const p = reduzido() || d <= 0 ? 0 : Math.min(1, Math.max(0, (scrollY - pinH.offsetTop) / d)); pinH.style.setProperty('--p', p.toFixed(4)); };
    const ao = () => { if (!pedido) { pedido = true; requestAnimationFrame(mede); } };
    mede(); addEventListener('scroll', ao, { passive: true }); addEventListener('resize', ao); document.addEventListener('qg:mov', mede);
  }

  /* ── Planos de vídeo nas secções: só carregam à vista, têm pausa, e não tocam com movimento reduzido ── */
  $$('.citacao video[data-src]').forEach((vd) => {
    const bt = $('.pausa', vd.parentElement); let parado = false;
    const est = () => { const on = !vd.paused; vd.classList.toggle('a-tocar', on || vd.currentTime > 0); bt.setAttribute('aria-pressed', String(!on)); bt.setAttribute('aria-label', on ? 'Pausar el vídeo' : 'Reanudar el vídeo'); };
    const toca2 = () => { if (!vd.src) vd.src = innerWidth * (devicePixelRatio || 1) >= 2400 && vd.dataset['2k'] ? vd.dataset['2k'] : vd.dataset.src; vd.play().then(est).catch(est); };
    bt.hidden = false; est();
    bt.addEventListener('click', () => { if (vd.paused) { parado = false; toca2(); } else { parado = true; vd.pause(); est(); } });
    new IntersectionObserver(([en]) => { if (en.isIntersecting && !parado && !reduzido() && !(navigator.connection && navigator.connection.saveData)) toca2(); else if (!vd.paused) { vd.pause(); est(); } }, { threshold: 0.25 }).observe(vd);
    document.addEventListener('qg:mov', () => { if (reduzido() && !vd.paused) { vd.pause(); est(); } });
  });

  /* ── Restauro preso ao scroll: a secção fica presa e os passos acendem à vez.
        Fluidez: em vez de trocar imagens, reproduz-se vídeo a 60 imagens por segundo. O scroll diz onde a
        montagem deve estar; o vídeo vai até lá a andar (mais depressa se estiver longe), para a frente ou,
        ao subir, num segundo vídeo igual mas invertido. Nunca há saltos de fotograma. ── */
  $$('[data-montagem]').forEach((sec) => {
    const vF = $('video.frente', sec), vR = $('video.tras', sec), nPassos = +sec.dataset.passos || 1;
    const movel = matchMedia('(max-width: 760px)').matches;
    let D = 0, dir = 1, activo = vF, troca = false, raf = 0, pedidas = false, mostrado = 0, primeira = true;
    const estatica = () => reduzido();
    const alvoP = () => { const d = sec.offsetHeight - innerHeight; return estatica() || d <= 0 ? 1 : Math.min(1, Math.max(0, (scrollY - sec.offsetTop) / d)); };
    const agora = () => (dir > 0 ? vF.currentTime : D - vR.currentTime);
    const carrega = () => { if (pedidas) return; pedidas = true;
      const nitido = innerWidth * (devicePixelRatio || 1) >= 2400;
      [vF, vR].forEach((v) => { v.muted = true; v.playsInline = true; v.src = movel ? v.dataset.movel : (nitido && v.dataset['2k'] ? v.dataset['2k'] : v.dataset.src); v.preload = 'auto'; v.load(); });
      vF.addEventListener('loadedmetadata', () => { D = vF.duration - 0.05; vF.classList.add('activo'); sec.classList.add('pronta'); pede(); }, { once: true }); };
    const passo = () => { raf = 0;
      const a = alvoP(); mostrado = primeira || estatica() ? a : mostrado + (a - mostrado) * 0.14; primeira = false;
      if (Math.abs(a - mostrado) < 0.0006) mostrado = a;
      sec.style.setProperty('--p', mostrado.toFixed(4));
      const pp = String(Math.min(nPassos - 1, Math.floor(mostrado * nPassos))); if (sec.dataset.passo !== pp) sec.dataset.passo = pp;
      let vivo = mostrado !== a;
      if (D && !estatica() && !troca) {
        const alvoT = Math.min(1, a / 0.9) * D, t = agora(), falta = alvoT - t, quer = falta >= 0 ? 1 : -1;
        if (Math.abs(falta) < 0.035 || (!activo.paused && falta * dir <= 0)) { if (!activo.paused) activo.pause(); }
        else if (quer !== dir) {                                                  // mudou o sentido do scroll: passa para o outro vídeo, no mesmo instante
          troca = true; activo.pause(); const outro = quer > 0 ? vF : vR, onde = quer > 0 ? t : D - t;
          const feito = () => { outro.classList.add('activo'); activo.classList.remove('activo'); activo = outro; dir = quer; troca = false; pede(); };
          outro.addEventListener('seeked', feito, { once: true }); outro.currentTime = Math.min(D, Math.max(0, onde));
        } else { activo.playbackRate = Math.min(6, Math.max(0.3, Math.abs(falta) * 2.4)); if (activo.paused) { const pr = activo.play(); if (pr && pr.catch) pr.catch(() => {}); } vivo = true; }
      }
      if (vivo || troca) pede(); };
    const pede = () => { if (!raf) raf = requestAnimationFrame(passo); };
    const modo = () => { sec.classList.toggle('estatica', estatica()); if (estatica()) [vF, vR].forEach((v) => v.pause()); primeira = true; pede(); };
    new IntersectionObserver(([en]) => { if (en.isIntersecting && !estatica()) carrega(); else if (!en.isIntersecting) [vF, vR].forEach((v) => v.pause()); }, { rootMargin: '120% 0px' }).observe(sec);
    modo(); addEventListener('scroll', pede, { passive: true }); addEventListener('resize', pede); document.addEventListener('qg:mov', modo);
  });

  /* ── Animação de restauro: arranca ao entrar no ecrã, toca uma vez e fica no carro pronto; ao voltar, recomeça ── */
  $$('[data-filme]').forEach((f) => {
    const vd = $('video', f), bt = $('.pausa', f); let parado = false, visto = false;
    const est = () => { bt.setAttribute('aria-pressed', String(vd.paused)); bt.setAttribute('aria-label', vd.paused ? 'Ver a animação' : 'Pausar a animação'); };
    const toca3 = (doInicio) => { if (!vd.getAttribute('src')) { vd.src = matchMedia('(max-width: 760px)').matches ? vd.dataset.movel : (innerWidth * (devicePixelRatio || 1) >= 2400 && vd.dataset['2k'] ? vd.dataset['2k'] : vd.dataset.src); vd.load(); } if (doInicio || vd.ended) vd.currentTime = 0; const pr = vd.play(); if (pr && pr.catch) pr.catch(() => {}); };
    vd.addEventListener('playing', () => { vd.classList.add('a-tocar'); est(); }); vd.addEventListener('pause', est); vd.addEventListener('ended', est);
    bt.hidden = false; est();
    bt.addEventListener('click', () => { if (vd.paused) { parado = false; toca3(false); } else { parado = true; vd.pause(); } });
    new IntersectionObserver(([en]) => { if (en.isIntersecting && !visto) { visto = true; if (!parado && !guardado()) toca3(true); } else if (!en.isIntersecting && visto && en.intersectionRatio === 0) { visto = false; vd.pause(); } }, { threshold: [0, 0.55] }).observe(f);
  });

  /* ── Linha do tempo da Collection: o scroll vertical conduz a pista horizontal ── */
  const ep = $('.epocas');
  if (ep) {
    const pista = $('.epocas-pista', ep), barra = $('.regua i', ep);
    let activo = null, dist = 0;
    const mede = () => {
      const pode = !reduzido() && matchMedia('(min-width: 761px) and (hover: hover)').matches;
      if (pode !== activo) { activo = pode; ep.classList.toggle('nativo', !pode); pista.style.transform = ''; if (!pode) ep.style.height = ''; }
      if (activo) { dist = Math.max(0, pista.scrollWidth - innerWidth); ep.style.height = `calc(100svh + ${dist}px)`; anda(); }
    };
    const anda = () => {
      if (activo) { const r = ep.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (dist || 1))); pista.style.transform = `translate3d(${-p * dist}px,0,0)`; barra.style.transform = `scaleX(${p})`; }
      else { const m = pista.scrollWidth - pista.clientWidth; barra.style.transform = `scaleX(${m > 0 ? pista.scrollLeft / m : 0})`; }
    };
    mede(); addEventListener('resize', mede); addEventListener('load', mede); document.addEventListener('qg:mov', mede);
    addEventListener('scroll', anda, { passive: true }); pista.addEventListener('scroll', anda, { passive: true });
  }

  /* ── Publicações do Instagram: incorporação oficial, só pedida quando a secção se aproxima ── */
  const ig = $('[data-ig]');
  if (ig) new IntersectionObserver(([en], o) => { if (!en.isIntersecting) return; o.disconnect(); const sc = document.createElement('script'); sc.async = true; sc.src = 'https://www.instagram.com/embed.js'; document.body.appendChild(sc); }, { rootMargin: '60% 0px' }).observe(ig);

  /* ── Imagens que acompanham o rato: a posição do cursor (−1 a 1) vai para --mx / --my e o CSS desloca a imagem ── */
  if (matchMedia('(hover: hover)').matches) $$('.porta, .azulejo, .cartao, .obra, .duarte, .importa').forEach((el) => {
    let pedido = 0, x = 0, y = 0;
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width - 0.5) * 2; y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; if (reduzido()) return; el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)); }); }, { passive: true });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', 0); el.style.setProperty('--my', 0); });
  });

  /* ── No toque, as imagens vivas mexem-se com a posição no ecrã (vertical) e na pista da sala (horizontal) ── */
  if (!matchMedia('(hover: hover)').matches) {
    const vivos = $$('.obra, .cartao'); let pedido = false;
    const mede = () => { pedido = false; if (reduzido()) return; vivos.forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom < -50 || r.top > innerHeight + 50 || r.right < -50 || r.left > innerWidth + 50) return;
      el.style.setProperty('--my', Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2))).toFixed(3));
      el.style.setProperty('--mx', Math.max(-1, Math.min(1, (r.left + r.width / 2 - innerWidth / 2) / (innerWidth / 2))).toFixed(3)); }); };
    const ao = () => { if (!pedido) { pedido = true; requestAnimationFrame(mede); } };
    addEventListener('scroll', ao, { passive: true }); $$('.sala-pista').forEach((p) => p.addEventListener('scroll', ao, { passive: true })); mede();
  }

  /* ── Mapa: só carrega quando pedem (privacidade e peso) ── */
  $$('.mapa button').forEach((b) => b.addEventListener('click', () => {
    const m = b.closest('.mapa'), f = document.createElement('iframe');
    f.src = m.dataset.src; f.title = 'Mapa: QUADIS Gallery'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    m.replaceChildren(f); m.classList.add('carregado');
  }));

  /* ── Formulários: sem servidor. O pedido abre no WhatsApp ou no email do visitante, já escrito. ── */
  $$('form[data-pedido]').forEach((f) => {
    const erro = $('.form-erro', f);
    const texto = () => {
      const linhas = [f.dataset.pedido];
      $$('[name]', f).forEach((c) => {
        if (c.type === 'radio' && !c.checked) return;
        if (c.type === 'checkbox') return;
        const v2 = c.value.trim(); if (!v2) return;
        linhas.push(`${c.dataset.rotulo || c.name}: ${v2}`);
      });
      const marc = $$('input[type=checkbox][name]:checked', f).map((c) => c.value);
      return linhas.join('\n');
    };
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); if (erro) erro.textContent = 'Faltan campos obligatorios.'; return; }
      if (erro) erro.textContent = '';
      f.dataset.texto = texto();                     // demostración: la solicitud queda preparada, no se envía a ningún sitio
      const ok = $('.form-ok', f); if (ok) ok.hidden = false;
    });
  });

  /* ── Collection: filtros, ordenação, contagem e endereço partilhável ── */
  const grelha = $('#grelha');
  if (grelha) {
    const cartoes = $$('.cartao', grelha), conta = $('#conta'), vazio = $('#vazio'), nFiltros = $('#n-filtros');
    const campos = { q: $('#f-q'), tipo: $('#f-tipo'), ordem: $('#f-ordem'), pmin: $('#f-pmin'), pmax: $('#f-pmax'), amin: $('#f-amin'), amax: $('#f-amax'), km: $('#f-km') };
    const marcas = $$('.marcas button');
    let marca = '';
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const ordens = {
      'marca-az': (a, b) => a.dataset.nome.localeCompare(b.dataset.nome, 'es'), 'marca-za': (a, b) => b.dataset.nome.localeCompare(a.dataset.nome, 'es'),
      'preco-asc': (a, b) => (+a.dataset.preco || 9e9) - (+b.dataset.preco || 9e9), 'preco-desc': (a, b) => (+b.dataset.preco || -1) - (+a.dataset.preco || -1),
      'ano-asc': (a, b) => a.dataset.ano - b.dataset.ano, 'ano-desc': (a, b) => b.dataset.ano - a.dataset.ano,
      'km-asc': (a, b) => a.dataset.km - b.dataset.km, 'km-desc': (a, b) => b.dataset.km - a.dataset.km,
    };
    const aplica = (escreveUrl = true) => {
      const c = Object.fromEntries(Object.entries(campos).map(([k, el]) => [k, el ? el.value : '']));
      const q = norm(c.q.trim());
      let n = 0, activos = 0;
      ['tipo', 'pmin', 'pmax', 'amin', 'amax', 'km'].forEach((k) => { if (c[k]) activos++; });
      cartoes.forEach((el) => {
        const d = el.dataset, p = +d.preco;
        const ok = (!marca || d.marca === marca) && (!c.tipo || d.tipo === c.tipo) && (!q || norm(d.nome + ' ' + d.ano).includes(q))
          && (!c.pmin || (p && p >= +c.pmin)) && (!c.pmax || (p && p <= +c.pmax))
          && (!c.amin || (+d.ano !== 9999 && +d.ano >= +c.amin)) && (!c.amax || +d.ano <= +c.amax) && (!c.km || +d.km <= +c.km);
        el.hidden = !ok; if (ok) n++;
      });
      [...cartoes].sort(ordens[c.ordem] || ordens['preco-desc']).forEach((el) => grelha.appendChild(el));
      conta.innerHTML = `<b>${n}</b> ${n === 1 ? 'coche' : 'coches'}${n !== cartoes.length ? ` de ${cartoes.length}` : ''}`;
      vazio.hidden = n > 0; nFiltros.textContent = activos ? `(${activos})` : '';
      marcas.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.marca === marca)));
      if (escreveUrl) {
        const u = new URLSearchParams(); if (marca) u.set('marca', marca);
        Object.entries(c).forEach(([k, v2]) => { if (v2 && !(k === 'ordem' && v2 === 'preco-desc')) u.set(k, v2); });
        history.replaceState(null, '', u.toString() ? `?${u}` : location.pathname);
      }
    };
    const u = new URLSearchParams(location.search);
    marca = u.get('marca') || '';
    Object.entries(campos).forEach(([k, el]) => { if (el && u.get(k)) el.value = u.get(k); el && el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => aplica()); });
    marcas.forEach((b) => b.addEventListener('click', () => { marca = b.dataset.marca === marca ? '' : b.dataset.marca; aplica(); }));
    const painel = $('#filtros'), btF = $('#bt-filtros');
    btF.addEventListener('click', () => { const a = painel.toggleAttribute('data-aberto'); btF.setAttribute('aria-expanded', String(a)); });
    if (['tipo', 'pmin', 'pmax', 'amin', 'amax', 'km'].some((k) => u.get(k))) { painel.dataset.aberto = ''; btF.setAttribute('aria-expanded', 'true'); }
    $$('.limpar').forEach((b) => b.addEventListener('click', () => { marca = ''; Object.values(campos).forEach((el) => { if (el) el.value = el.id === 'f-ordem' ? 'preco-desc' : ''; }); aplica(); }));
    const vistas = $$('.vista button');
    const poeVista = (vv) => { grelha.classList.toggle('lista', vv === 'lista'); vistas.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === vv))); try { localStorage.setItem('qg-vista', vv); } catch {} };
    vistas.forEach((b) => b.addEventListener('click', () => poeVista(b.dataset.vista)));
    try { poeVista(localStorage.getItem('qg-vista') || 'grelha'); } catch { poeVista('grelha'); }
    aplica(false);
    /* segunda fotografia ao passar o rato: só se pede quando é precisa */
    if (matchMedia('(hover: hover)').matches) cartoes.forEach((el) => el.addEventListener('pointerenter', () => {
      const s = $('.segunda', el); if (s && !s.src && s.dataset.src) { s.src = s.dataset.src; s.addEventListener('load', () => s.classList.add('ok'), { once: true }); }
    }, { once: true }));
  }

  /* ── Ficha: galeria em ecrã inteiro (teclado, toque, contador) e barra de contacto ── */
  const luz = $('dialog.luz');
  if (luz) {
    const pista = $('.luz-pista', luz), conta = $('.conta', luz), figs = $$('figure', pista);
    const actual = () => Math.round(pista.scrollLeft / pista.clientWidth);
    const vai = (i, suave = true) => { const k = Math.max(0, Math.min(figs.length - 1, i)); pista.scrollTo({ left: k * pista.clientWidth, behavior: suave && !reduzido() ? 'smooth' : 'auto' }); };
    const escreve = () => { conta.textContent = `${String(actual() + 1).padStart(2, '0')} / ${String(figs.length).padStart(2, '0')}`; };
    let origem;
    $$('.galeria button').forEach((b) => b.addEventListener('click', () => {
      origem = b; figs.forEach((f) => { const im = $('img', f); if (!im.src) im.src = im.dataset.src; });
      luz.showModal(); vai(+b.dataset.i, false); escreve();
    }));
    pista.addEventListener('scroll', escreve, { passive: true });
    $('.x', luz).addEventListener('click', () => luz.close());
    $('.ant', luz).addEventListener('click', () => vai(actual() - 1));
    $('.seg', luz).addEventListener('click', () => vai(actual() + 1));
    luz.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') vai(actual() + 1); if (e.key === 'ArrowLeft') vai(actual() - 1); });
    luz.addEventListener('close', () => origem && origem.focus());
  }
  const bf = $('.barra-ficha');
  if (bf) {
    document.body.classList.add('com-barra');
    const alvo = $('.numeros') || $('.galeria'), ped = $('.pedido');
    let passou = false, noPedido = false;
    const poe = () => { const vis = passou && !noPedido; bf.classList.toggle('vis', vis); bf.inert = !vis; };
    const ve = () => { const agora = alvo.getBoundingClientRect().bottom < 0; if (agora !== passou) { passou = agora; poe(); } };
    addEventListener('scroll', ve, { passive: true }); ve();
    if (ped) new IntersectionObserver(([e]) => { noPedido = e.isIntersecting && innerWidth <= 1100; poe(); }, { threshold: 0.3 }).observe(ped);
    poe();
  }
  $$('.ler').forEach((b) => b.addEventListener('click', () => { const r = document.getElementById(b.getAttribute('aria-controls')); const a = r.classList.toggle('aberto'); b.setAttribute('aria-expanded', String(a)); b.textContent = a ? 'Mostrar menos' : b.dataset.rotulo; }));

  /* ══════════ Peças da Octane, com os conteúdos da QUADIS Gallery ══════════ */
  /* ── A sala: pista horizontal com setas, teclado e barra de progresso ── */
  const sala = $('.sala');
  if (sala) {
    const pista = $('.sala-pista', sala), barra = $('.sala-barra', sala), ant = $('.sala-nav .ant', sala), seg = $('.sala-nav .seg', sala);
    const passo = () => { const o = $('.obra', pista); return o ? o.getBoundingClientRect().width + parseFloat(getComputedStyle(pista).columnGap || 24) : 400; };
    const vai = (d) => pista.scrollBy({ left: d * passo(), behavior: reduzido() ? 'auto' : 'smooth' });
    const est = () => { const m = pista.scrollWidth - pista.clientWidth, p = m > 0 ? pista.scrollLeft / m : 0; barra.style.setProperty('--s', Math.max(0.08, p).toFixed(3)); ant.disabled = p < 0.01; seg.disabled = p > 0.99; };
    ant.addEventListener('click', () => vai(-1)); seg.addEventListener('click', () => vai(1));
    pista.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); vai(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); vai(-1); } });
    pista.addEventListener('scroll', est, { passive: true }); addEventListener('resize', est); est();
  }

  /* ── Ofícios: a fotografia de cada serviço segue o rato, com um ligeiro balanço na direcção do movimento ── */
  /* no toque: a marca mais perto do centro do ecrã fica activa e a fotografia dela desliza até à linha, com o mesmo balanço */
  if (!matchMedia('(hover: hover)').matches) $$('[data-oficios]').forEach((lista) => {
    const im = $('.oficios-img', lista), linhas2 = $$('.oficio', lista); let y = 0, ay = 0, vx = 0, raf = 0, ia = false;
    const anda = () => { raf = 0; const d = y - ay; ay += d * 0.14; vx += (d * 0.04 - vx) * 0.25;
      im.style.setProperty('--y', ay.toFixed(1)); im.style.setProperty('--vx', Math.max(-6, Math.min(6, vx)).toFixed(2));
      if (Math.abs(d) > 0.4 || Math.abs(vx) > 0.05) raf = requestAnimationFrame(anda); };
    const mede = () => { const r = lista.getBoundingClientRect(); if (reduzido() || r.bottom < 0 || r.top > innerHeight) { delete lista.dataset.activo; return; }
      let melhor = null, dist = 1e9; linhas2.forEach((a) => { const b = a.getBoundingClientRect(), c = Math.abs(b.top + b.height / 2 - innerHeight * 0.52); if (c < dist) { dist = c; melhor = a; } });
      if (!melhor) return; lista.dataset.activo = melhor.dataset.k; y = melhor.offsetTop + melhor.offsetHeight / 2;
      if (!ia) { ay = y; ia = true; } if (!raf) raf = requestAnimationFrame(anda); };
    addEventListener('scroll', () => requestAnimationFrame(mede), { passive: true }); addEventListener('resize', mede); mede();
  });
  $$('[data-oficios]').forEach((lista) => {
    if (!matchMedia('(hover: hover)').matches) return;
    const im = $('.oficios-img', lista); let x = 0, y = 0, ax = 0, ay = 0, vx = 0, raf = 0;
    const anda = () => { raf = 0; ax += (x - ax) * 0.16; ay += (y - ay) * 0.16; vx += ((x - ax) * 0.06 - vx) * 0.2;
      im.style.setProperty('--x', ax.toFixed(1)); im.style.setProperty('--y', ay.toFixed(1)); im.style.setProperty('--vx', Math.max(-7, Math.min(7, vx)).toFixed(2));
      if (Math.abs(x - ax) > 0.4 || Math.abs(y - ay) > 0.4) raf = requestAnimationFrame(anda); };
    lista.addEventListener('pointermove', (e) => { const r = lista.getBoundingClientRect(); x = Math.min(e.clientX - r.left, r.width - im.offsetWidth - 60); y = e.clientY - r.top; if (!raf) raf = requestAnimationFrame(anda); }, { passive: true });
    $$('.oficio', lista).forEach((a) => { a.addEventListener('pointerenter', () => { if (!reduzido()) lista.dataset.activo = a.dataset.k; }); a.addEventListener('focus', () => { delete lista.dataset.activo; }); });
    lista.addEventListener('pointerleave', () => { delete lista.dataset.activo; });
  });

  /* ── Reels: tocam com o rato por cima ou ao toque; um de cada vez, e nunca sozinhos ── */
  const reels = $$('[data-reel]');
  if (reels.length) {
    const para = (r) => { const vd = $('video', r); vd.pause(); r.classList.remove('a-tocar'); const b = $('.tocar', r); b.setAttribute('aria-pressed', 'false'); };
    const toca = (r) => { reels.forEach((o) => { if (o !== r) para(o); }); const vd = $('video', r); if (!vd.getAttribute('src')) { vd.src = vd.dataset.src; vd.load(); }
      vd.muted = true; const pr = vd.play(); if (pr && pr.catch) pr.catch(() => {}); r.classList.add('a-tocar'); $('.tocar', r).setAttribute('aria-pressed', 'true'); };
    const fino = matchMedia('(hover: hover)').matches;
    reels.forEach((r) => {
      if (fino) { r.addEventListener('pointerenter', () => { if (!reduzido()) toca(r); }); r.addEventListener('pointerleave', () => para(r)); }
      $('.tocar', r).addEventListener('click', () => (r.classList.contains('a-tocar') && !fino ? para(r) : r.classList.contains('a-tocar') ? para(r) : toca(r)));
    });
    new IntersectionObserver((es) => es.forEach((en) => { if (!en.isIntersecting) para(en.target); }), { threshold: 0.2 }).observe($('.reels-pista'));
    const ioR = new IntersectionObserver((es) => es.forEach((en) => { if (!en.isIntersecting) para(en.target); }), { threshold: 0.35 }); reels.forEach((r) => ioR.observe(r));
    /* no toque não há rato: toca sozinho o reel que fica bem à vista (um de cada vez), como o rato faz no computador */
    if (!fino) { const ioT = new IntersectionObserver((es) => es.forEach((en) => { if (en.intersectionRatio >= 0.8 && !reduzido()) toca(en.target); }), { threshold: [0.8] }); reels.forEach((r) => ioT.observe(r)); }
  }

  /* ── Barcelona e Valência: os três vídeos tocam sozinhos (sem som) enquanto a secção está à vista; com movimento reduzido ficam na capa ── */
  $$('[data-salas]').forEach((g) => {
    const vs = $$('video', g);
    const liga = (on) => vs.forEach((vd) => { if (on && !reduzido()) { if (!vd.getAttribute('src')) { vd.src = vd.dataset.src; vd.load(); } vd.muted = true; const pr = vd.play(); if (pr && pr.catch) pr.catch(() => {}); } else vd.pause(); });
    new IntersectionObserver(([en]) => liga(en.isIntersecting), { threshold: 0.2 }).observe(g);
    document.addEventListener('qg:mov', () => { if (reduzido()) liga(false); });
  });

  /* ── Faixa com fotografia: a imagem desliza devagar em relação à moldura, ao ritmo do scroll ── */
  $$('[data-paralaxe]').forEach((sec) => {
    let pedido = false;
    const mede = () => { pedido = false; const r = sec.getBoundingClientRect(); if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const meio = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; sec.style.setProperty('--py', reduzido() ? 0 : (meio * -60).toFixed(1)); };
    const ao = () => { if (!pedido) { pedido = true; requestAnimationFrame(mede); } };
    mede(); addEventListener('scroll', ao, { passive: true }); addEventListener('resize', ao); document.addEventListener('qg:mov', mede);
  });

  /* ── Vendidos: as duas faixas deslizam com o scroll (não andam sozinhas) ── */
  $$('[data-letreiro]').forEach((sec) => {
    let pedido = false;
    const mede = () => { pedido = false; const r = sec.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
      sec.style.setProperty('--d', reduzido() ? 0 : ((innerHeight - r.top) * 0.55).toFixed(1)); };
    const ao = () => { if (!pedido) { pedido = true; requestAnimationFrame(mede); } };
    mede(); addEventListener('scroll', ao, { passive: true }); addEventListener('resize', ao); document.addEventListener('qg:mov', mede);
  });
})();
