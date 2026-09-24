// ========================================================
// 4K 120FPS VIDEO & AUDIO CONTROLLER WITH AUTO-PLAY ON ENTER
// ========================================================

const video = document.getElementById('dragon-video');
const ambientVideo = document.querySelector('.dragon-video-ambient');
const realAudio = document.getElementById('real-audio');
const toggleSoundBtn = document.getElementById('toggle-video-sound');
const soundBtnIcon = document.getElementById('sound-btn-icon');
const soundBtnText = document.getElementById('sound-btn-text');
const fpsText = document.getElementById('fps-text');

const musicPlayer = document.getElementById('music-player');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const volumeSlider = document.getElementById('volume-slider');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

let isSoundOn = false;
let hasStartedMusic = false;

// Ensure both vertical and ambient videos play smoothly in loop
[video, ambientVideo].forEach(v => {
  if (v) {
    v.muted = true;
    v.play().catch(() => {
      document.addEventListener('click', () => v.play(), { once: true });
    });
  }
});

function setMusicUIPlaying(playing) {
  if (playing) {
    musicPlayer?.classList.add('playing');
    if (playIcon) playIcon.className = 'fa-solid fa-pause';
    if (soundBtnIcon) soundBtnIcon.className = 'fa-solid fa-volume-high';
    if (soundBtnText) soundBtnText.textContent = 'Đang Bật';
    toggleSoundBtn?.classList.add('active');
    isSoundOn = true;
  } else {
    musicPlayer?.classList.remove('playing');
    if (playIcon) playIcon.className = 'fa-solid fa-play';
    if (soundBtnIcon) soundBtnIcon.className = 'fa-solid fa-volume-xmark';
    if (soundBtnText) soundBtnText.textContent = 'Âm Thanh';
    toggleSoundBtn?.classList.remove('active');
    isSoundOn = false;
  }
}

// Sync UI state automatically with native audio element events
realAudio?.addEventListener('play', () => setMusicUIPlaying(true));
realAudio?.addEventListener('pause', () => setMusicUIPlaying(false));

function playSoundtrack() {
  if (!realAudio) return;
  realAudio.volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.8;
  const playPromise = realAudio.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      hasStartedMusic = true;
      setMusicUIPlaying(true);
      ['pointerdown', 'touchstart', 'click'].forEach(evt => {
        window.removeEventListener(evt, unlockAudioOnce);
        document.removeEventListener(evt, unlockAudioOnce);
      });
    }).catch(() => {
      // Browser Autoplay Policy requires user gesture
      setMusicUIPlaying(false);
    });
  }
}

function toggleAudio() {
  if (!realAudio) return;
  if (realAudio.paused) {
    playSoundtrack();
  } else {
    realAudio.pause();
    setMusicUIPlaying(false);
  }
}

toggleSoundBtn?.addEventListener('click', toggleAudio);
playBtn?.addEventListener('click', toggleAudio);

prevBtn?.addEventListener('click', () => {
  if (realAudio) {
    realAudio.currentTime = 0;
    playSoundtrack();
  }
});

nextBtn?.addEventListener('click', () => {
  if (realAudio) {
    realAudio.currentTime = 0;
    playSoundtrack();
  }
});

// ========================================================
// ZERO-DELAY INSTANT AUDIO UNLOCK (1-SHOT PASSIVE)
// ========================================================
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  playSoundtrack();
  ['pointerdown', 'touchstart'].forEach(evt => {
    window.removeEventListener(evt, unlockAudioOnce);
    document.removeEventListener(evt, unlockAudioOnce);
  });
}

function startMusicAuto() {
  playSoundtrack();
  ['pointerdown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, unlockAudioOnce, { passive: true, once: true });
    document.addEventListener(evt, unlockAudioOnce, { passive: true, once: true });
  });
}

// Trigger immediately on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMusicAuto);
} else {
  startMusicAuto();
}
window.addEventListener('load', startMusicAuto);

// ========================================================
// REAL-TIME 120-240 FPS MONITOR
// ========================================================
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = performance.now();

function fpsLoop(timestamp) {
  frameCount++;
  if (timestamp - fpsTimer >= 500) {
    const fps = Math.round((frameCount * 1000) / (timestamp - fpsTimer));
    if (fpsText) {
      fpsText.textContent = `${Math.min(fps, 240)} FPS`;
    }
    frameCount = 0;
    fpsTimer = timestamp;
  }
  requestAnimationFrame(fpsLoop);
}
requestAnimationFrame(fpsLoop);

// ========================================================
// MUSIC PLAYER AUDIO TIMELINE & CONTROLS
// ========================================================

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// When audio metadata is loaded, show total duration
realAudio?.addEventListener('loadedmetadata', () => {
  if (durationTimeEl && realAudio.duration) {
    durationTimeEl.textContent = formatTime(realAudio.duration);
  }
});

realAudio?.addEventListener('durationchange', () => {
  if (durationTimeEl && realAudio.duration) {
    durationTimeEl.textContent = formatTime(realAudio.duration);
  }
});

// Update progress bar and time counters continuously
realAudio?.addEventListener('timeupdate', () => {
  if (!realAudio || !realAudio.duration) return;
  if (currentTimeEl) {
    currentTimeEl.textContent = formatTime(realAudio.currentTime);
  }
  if (durationTimeEl) {
    durationTimeEl.textContent = formatTime(realAudio.duration);
  }
  const percent = (realAudio.currentTime / realAudio.duration) * 100;
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
});

// High-Performance Smooth Audio Progress Updater (Batched DOM writes)
let lastRenderedSec = -1;
function updateProgressSmooth() {
  if (realAudio && !realAudio.paused && realAudio.duration) {
    const curTime = realAudio.currentTime;
    const curSec = Math.floor(curTime);
    if (curSec !== lastRenderedSec) {
      lastRenderedSec = curSec;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(curTime);
    }
    const percent = (curTime / realAudio.duration) * 100;
    if (progressBar) progressBar.style.width = `${percent}%`;
  }
  requestAnimationFrame(updateProgressSmooth);
}
requestAnimationFrame(updateProgressSmooth);

// Click progress bar to seek
progressContainer?.addEventListener('click', (e) => {
  if (!realAudio || !realAudio.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  realAudio.currentTime = ratio * realAudio.duration;
  if (currentTimeEl) currentTimeEl.textContent = formatTime(realAudio.currentTime);
  if (progressBar) progressBar.style.width = `${ratio * 100}%`;
});

// Volume Slider
volumeSlider?.addEventListener('input', (e) => {
  if (realAudio) realAudio.volume = e.target.value;
});

// Restart loop on end
realAudio?.addEventListener('ended', () => {
  if (realAudio) {
    realAudio.currentTime = 0;
    realAudio.play().catch(() => {});
  }
});

// ========================================================
// 1-CLICK COPY & TOAST NOTIFICATION
// ========================================================
const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(text) {
  toast.querySelector('span').textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const copyValue = btn.getAttribute('data-copy');
    navigator.clipboard.writeText(copyValue).then(() => {
      showToast(`Đã sao chép: ${copyValue}`);
      const icon = btn.querySelector('i');
      icon.className = 'fa-solid fa-check';
      btn.style.color = '#22c55e';
      setTimeout(() => {
        icon.className = 'fa-regular fa-copy';
        btn.style.color = '';
      }, 1500);
    }).catch(() => {
      showToast(`Số tài khoản: ${copyValue}`);
    });
  });
});

document.querySelectorAll('.account-number').forEach(el => {
  el.addEventListener('click', () => {
    const val = el.getAttribute('data-copy');
    navigator.clipboard.writeText(val).then(() => {
      showToast(`Đã sao chép: ${val}`);
    });
  });
});

// Handle Server card & Join button clicks instantly with zero delay
document.querySelectorAll('.server-card').forEach(card => {
  card.addEventListener('click', (e) => {
    const btn = card.querySelector('.join-btn');
    const href = card.getAttribute('data-href') || (btn ? btn.getAttribute('href') : null);
    if (!href || href === '#') {
      e.preventDefault();
      showToast('Đang chờ link mời Discord từ paneer...');
      return;
    }
    if (!e.target.closest('.join-btn')) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  });
});

document.querySelectorAll('.join-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const href = btn.getAttribute('href');
    if (!href || href === '#') {
      e.preventDefault();
      e.stopPropagation();
      showToast('Đang chờ link mời Discord từ paneer...');
    }
  });
});

// ========================================================
// MODAL BIO TOGGLE
// ========================================================
const bioModal = document.getElementById('bio-modal');
const openBioBtn = document.getElementById('open-bio-btn');
const closeBioBtn = document.getElementById('close-bio-btn');

openBioBtn.addEventListener('click', () => {
  bioModal.classList.add('open');
});

closeBioBtn.addEventListener('click', () => {
  bioModal.classList.remove('open');
});

bioModal?.addEventListener('click', (e) => {
  if (e.target === bioModal) {
    bioModal.classList.remove('open');
  }
});

// ========================================================
// REAL-TIME LIVE CLOCK (GIỜ THỜI GIAN THỰC GÓC DƯỚI)
// ========================================================
const clockTimeEl = document.getElementById('clock-time');
const clockDateEl = document.getElementById('clock-date');

function updateLiveClock() {
  const now = new Date();
  
  // Format HH:mm:ss
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  if (clockTimeEl) {
    clockTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
  }

  // Format Thứ..., Ngày/Tháng/Năm
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  if (clockDateEl) {
    clockDateEl.textContent = `${dayName}, ${date}/${month}/${year}`;
  }
}

updateLiveClock();
setInterval(updateLiveClock, 1000);

// ========================================================
// ULTRA 3D HOLOGRAPHIC TILT & SPECULAR GLARE ENGINE (STABILIZED)
// ========================================================
(function initUltra3DTilt() {
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  if (isTouchDevice) {
    // Keep all cards 100% upright, flat, crisp and aligned on mobile touch devices
    return;
  }

  const tiltElements = document.querySelectorAll('[data-tilt="3d"]');

  // Individual card tilt state
  const cards = Array.from(tiltElements).map(el => {
    const glare = el.querySelector('.card-3d-glare');
    const maxTilt = parseFloat(el.getAttribute('data-tilt-max')) || 10;
    const cardData = {
      el,
      glare,
      maxTilt,
      isHovered: false,
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      glareX: 50,
      glareY: 50,
      glareOpacity: 0
    };

    el.addEventListener('mouseenter', () => {
      cardData.isHovered = true;
    });

    el.addEventListener('mousemove', (e) => {
      // If cursor is directly interacting with a clickable child (link, button, input),
      // freeze tilt so the button does not drift under cursor and cancel the click!
      if (e.target.closest('a, button, input, .social-icon, .join-btn, .copy-btn')) {
        cardData.targetX = 0;
        cardData.targetY = 0;
        cardData.glareOpacity = 0.25;
        return;
      }
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      cardData.targetX = -(y - 0.5) * cardData.maxTilt;
      cardData.targetY = (x - 0.5) * cardData.maxTilt;
      cardData.glareX = x * 100;
      cardData.glareY = y * 100;
      cardData.glareOpacity = 0.7;
    });

    el.addEventListener('mouseleave', () => {
      cardData.isHovered = false;
      cardData.targetX = 0;
      cardData.targetY = 0;
      cardData.glareOpacity = 0;
    });

    return cardData;
  });

  function renderTilt() {
    cards.forEach(card => {
      card.currentX += (card.targetX - card.currentX) * 0.12;
      card.currentY += (card.targetY - card.currentY) * 0.12;

      // Only apply transform when actually active to save CPU and avoid hit-test drift
      if (card.isHovered || Math.abs(card.currentX) > 0.05 || Math.abs(card.currentY) > 0.05) {
        const scale = card.isHovered ? 1.02 : 1;
        card.el.style.transform = `perspective(1000px) rotateX(${card.currentX.toFixed(2)}deg) rotateY(${card.currentY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      } else {
        card.el.style.transform = '';
      }

      if (card.glare) {
        card.glare.style.opacity = card.glareOpacity;
        if (card.isHovered) {
          card.glare.style.background = `radial-gradient(circle at ${card.glareX}% ${card.glareY}%, rgba(255, 255, 255, 0.35) 0%, rgba(0, 245, 212, 0.15) 30%, transparent 65%)`;
        }
      }
    });

    requestAnimationFrame(renderTilt);
  }
  requestAnimationFrame(renderTilt);
})();

// ========================================================
// ULTRA 4K 120FPS 3D CYBER PARTICLES & DEPTH FIELD ENGINE
// ========================================================
(function init3DParticleCanvas() {
  const canvas = document.getElementById('canvas-3d-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }, { passive: true });

  let mouse = { x: width / 2, y: height / 2, moved: false };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.moved = true;
  }, { passive: true });

  const PARTICLE_COUNT = Math.min(45, Math.floor(window.innerWidth / 26));
  const colors = [
    { r: 0, g: 245, b: 212 },   // Mint
    { r: 0, g: 210, b: 255 },   // Cyan
    { r: 0, g: 187, b: 249 },   // Electric Blue
    { r: 255, g: 119, b: 0 }    // Spider-Man Ember
  ];

  class Particle3D {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = (Math.random() - 0.5) * width * 1.4;
      this.y = (Math.random() - 0.5) * height * 1.4;
      this.z = initial ? Math.random() * 800 + 100 : 900;
      this.vx = (Math.random() - 0.5) * 0.45;
      this.vy = (Math.random() - 0.5) * 0.45;
      this.vz = -(Math.random() * 0.8 + 0.3);
      this.size = Math.random() * 2.2 + 1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = Math.random() * 0.5 + 0.35;
    }

    update() {
      this.z += this.vz;
      this.x += this.vx;
      this.y += this.vy;

      if (mouse.moved) {
        const fov = 400;
        const scale = fov / this.z;
        const screenX = this.x * scale + width / 2;
        const screenY = this.y * scale + height / 2;
        const dx = mouse.x - screenX;
        const dy = mouse.y - screenY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 1) {
          const force = (160 - dist) / 160;
          this.x -= (dx / dist) * force * 1.6;
          this.y -= (dy / dist) * force * 1.6;
        }
      }

      if (this.z <= 30 || Math.abs(this.x) > width || Math.abs(this.y) > height) {
        this.reset();
      }
    }

    draw() {
      const fov = 400;
      const scale = fov / this.z;
      const screenX = this.x * scale + width / 2;
      const screenY = this.y * scale + height / 2;

      if (screenX < 0 || screenX > width || screenY < 0 || screenY > height) return;

      const currentSize = Math.max(0.6, this.size * scale);
      const currentAlpha = Math.min(1, this.alpha * (1 - this.z / 950));

      ctx.save();
      ctx.beginPath();
      ctx.arc(screenX, screenY, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${currentAlpha})`;
      ctx.shadowBlur = Math.min(12, 6 * scale);
      ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
      ctx.fill();
      ctx.restore();
    }
  }

  const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle3D());

  function drawConnections() {
    const fov = 400;
    const maxDist = 90;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.2)';
    ctx.lineWidth = 0.75;
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      const s1 = fov / p1.z;
      const x1 = p1.x * s1 + width / 2;
      const y1 = p1.y * s1 + height / 2;

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        if (Math.abs(p1.z - p2.z) > 130) continue;

        const s2 = fov / p2.z;
        const x2 = p2.x * s2 + width / 2;
        const y2 = p2.y * s2 + height / 2;

        const dx = x1 - x2;
        const dy = y1 - y2;
        if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
      }
    }
    ctx.stroke();
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);
    drawConnections();
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

// ========================================================
// REAL-TIME DISCORD LANYARD STATUS & BIO ENGINE (WEBSOCKET + REST)
// ========================================================
(function initDiscordLanyard() {
  const PANEER_DISCORD_ID = '1513183925793722505';
  let discordUserId = localStorage.getItem('paneer_discord_id') || PANEER_DISCORD_ID;

  const statusDot = document.getElementById('discord-status-dot');
  const statusName = document.getElementById('discord-status-name');
  const statusBadge = document.getElementById('discord-status-badge');
  const avatarImg = document.getElementById('discord-avatar-img');
  const decorationImg = document.getElementById('discord-avatar-decoration');
  const displayNameEl = document.getElementById('discord-display-name');
  const usernameEl = document.getElementById('discord-username');
  const bioEmoji = document.getElementById('discord-bio-emoji') || document.getElementById('discord-bubble-emoji');
  const bioText = document.getElementById('discord-bio-text') || document.getElementById('discord-bubble-text');
  const mainStatusIndicator = document.querySelector('.status-indicator');

  // Khôi phục ngay trạng thái Discord gần nhất từ bộ nhớ khi vừa tải trang
  const cachedStatus = localStorage.getItem('paneer_last_discord_status');
  const cachedEmoji = localStorage.getItem('paneer_last_discord_emoji');
  if (cachedStatus && bioText) {
    bioText.textContent = cachedStatus;
    if (cachedEmoji && bioEmoji) bioEmoji.innerHTML = cachedEmoji;
  }

  function updateDiscordUI(data) {
    if (!data) return;
    const { discord_user, discord_status, activities } = data;

    // 1. Trạng thái hoạt động thời gian thực (Online, Idle, DND, Offline)
    const statusMap = {
      online: { label: 'Online', class: 'online' },
      idle: { label: 'Chờ (Idle)', class: 'idle' },
      dnd: { label: 'Đừng làm phiền', class: 'dnd' },
      offline: { label: 'Offline', class: 'offline' }
    };
    const s = statusMap[discord_status] || statusMap.offline;

    if (statusDot) statusDot.className = `lanyard-status-dot ${s.class}`;
    if (statusBadge) statusBadge.className = `lanyard-status-badge ${s.class}`;
    if (statusName) statusName.textContent = s.label;

    // Đồng bộ chấm trạng thái trên avatar chính ở góc thẻ
    if (mainStatusIndicator) {
      mainStatusIndicator.className = `status-indicator ${s.class}`;
      mainStatusIndicator.setAttribute('title', s.label);
    }

    // 2. Avatar tài khoản Discord: đồng bộ cả avatar chính và avatar Discord Live
    if (avatarImg) {
      avatarImg.src = 'avatar.png';
    }
    const mainAvatarEl = document.getElementById('avatar');
    if (mainAvatarEl) {
      mainAvatarEl.src = 'avatar.png';
    }

    // 3. Khung trang trí Avatar: Mũ trùm đầu thần chết sấm xanh ngọc (Grim Reaper Hood)
    const mainDecoEl = document.getElementById('main-avatar-decoration');
    const decoSrc = (discord_user && discord_user.avatar_decoration_data && discord_user.avatar_decoration_data.asset)
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${discord_user.avatar_decoration_data.asset}.png?size=240&passthrough=true`
      : 'decoration-hood.png';

    if (decorationImg) {
      decorationImg.src = decoSrc;
      decorationImg.style.display = 'block';
    }
    if (mainDecoEl) {
      mainDecoEl.src = decoSrc;
      mainDecoEl.style.display = 'block';
    }

    // 4. Tên hiển thị và Username
    if (discord_user) {
      if (displayNameEl) {
        displayNameEl.textContent = discord_user.global_name || discord_user.display_name || discord_user.username;
      }
      if (usernameEl) {
        usernameEl.textContent = `@${discord_user.username}`;
      }
    }

    // 5. Tiểu sử & Trạng thái tùy chỉnh thời gian thực từ Discord
    const customStatus = activities ? activities.find(a => a.type === 4) : null;
    if (customStatus && customStatus.state) {
      const stateText = customStatus.state;
      let emojiHtml = '💬';
      if (customStatus.emoji) {
        if (customStatus.emoji.id) {
          emojiHtml = `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.png?size=32" alt="emoji" style="width:20px;height:20px;vertical-align:middle;display:inline-block;">`;
        } else {
          emojiHtml = customStatus.emoji.name || '💬';
        }
      }

      // Lưu trạng thái mới nhất vào bộ nhớ để khi offline vẫn giữ nguyên
      localStorage.setItem('paneer_last_discord_status', stateText);
      localStorage.setItem('paneer_last_discord_emoji', emojiHtml);

      if (bioText) bioText.textContent = stateText;
      if (bioEmoji) bioEmoji.innerHTML = emojiHtml;
    } else {
      // Nếu Discord đang tắt hoặc offline, khôi phục trạng thái gần nhất paneer từng đặt
      const cachedStatus = localStorage.getItem('paneer_last_discord_status');
      const cachedEmoji = localStorage.getItem('paneer_last_discord_emoji');
      if (cachedStatus && bioText) {
        bioText.textContent = cachedStatus;
        if (cachedEmoji && bioEmoji) bioEmoji.innerHTML = cachedEmoji;
      }
    }
  }

  let ws = null;
  let heartbeatTimer = null;

  function connectLanyard(userId) {
    if (!userId) return;
    try {
      if (ws) { ws.close(); }
      clearInterval(heartbeatTimer);

      // Fetch REST API ngay lập tức
      fetch(`https://api.lanyard.rest/v1/users/${userId}`)
        .then(res => res.json())
        .then(json => {
          if (json && json.success && json.data) {
            updateDiscordUI(json.data);
          }
        })
        .catch(() => {});

      // Mở WebSocket để nhận cập nhật trạng thái thời gian thực
      ws = new WebSocket('wss://api.lanyard.rest/socket');

      ws.onopen = () => {
        ws.send(JSON.stringify({
          op: 2,
          d: { subscribe_to_id: userId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.op === 1) {
            const interval = packet.d.heartbeat_interval;
            heartbeatTimer = setInterval(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 3 }));
              }
            }, interval);
          } else if (packet.op === 0) {
            if (packet.t === 'INIT_STATE' || packet.t === 'PRESENCE_UPDATE') {
              updateDiscordUI(packet.d);
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        clearInterval(heartbeatTimer);
        setTimeout(() => connectLanyard(userId), 6000);
      };
    } catch (err) {}
  }

  window.setDiscordUserId = function(newId) {
    if (newId) {
      localStorage.setItem('paneer_discord_id', newId);
      discordUserId = newId;
      connectLanyard(newId);
    }
  };

  if (discordUserId) {
    connectLanyard(discordUserId);
  }
})();

