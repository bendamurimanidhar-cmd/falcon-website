/**
 * FALCON-512 / FN-DSA Web Application Controller
 * Handles theme toggling, interactive Alice-Bob pipeline, 
 * interactive 2D lattice canvas, and DSP48E2 arithmetic calculator.
 */

document.addEventListener('DOMContentLoaded', () => {
  initLiveWallpaper();
  initTheme();
  initPipeline();
  initLatticeCanvas();
  initDSPCalculator();
  initNavScroll();
});

/* ==========================================================================
   0. Live 3D Quantum Lattice Wallpaper (Cinematic Background Canvas)
   ========================================================================== */
function initLiveWallpaper() {
  const canvas = document.getElementById('liveWallpaperCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  function handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // Mouse tracking with smooth spring damping
  let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, active: false };
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
  });
  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  // Ripple on click
  let ripples = [];
  window.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'A') {
      ripples.push({ x: e.clientX, y: e.clientY, radius: 0, maxRadius: 320, alpha: 0.65 });
    }
  });

  // Construct 3D Lattice Grid Nodes
  const cols = 16;
  const rows = 10;
  const nodes = [];
  const spacingX = 130;
  const spacingZ = 110;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      nodes.push({
        gridX: c,
        gridY: r,
        baseX: (c - (cols - 1) / 2) * spacingX,
        baseY: 150 + r * 28, // sloping perspective plane
        baseZ: r * spacingZ + 80,
        x: 0,
        y: 0,
        z: 0,
        phase: Math.random() * Math.PI * 2,
        energy: Math.random() * 0.5 + 0.5
      });
    }
  }

  // Energy pulses traveling along the lattice edges
  const pulses = [];
  function spawnPulse() {
    if (pulses.length >= 10) return;
    const fromIndex = Math.floor(Math.random() * nodes.length);
    const nodeFrom = nodes[fromIndex];
    const neighbors = [];
    if (nodeFrom.gridX < cols - 1) neighbors.push(fromIndex + 1);
    if (nodeFrom.gridY < rows - 1) neighbors.push(fromIndex + cols);
    if (neighbors.length > 0) {
      const toIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
      pulses.push({
        from: fromIndex,
        to: toIndex,
        progress: 0,
        speed: 0.012 + Math.random() * 0.018,
        color: Math.random() > 0.4 ? '#00d2ff' : '#2D4CFF'
      });
    }
  }

  const fov = 420;
  let time = 0;

  function render() {
    if (document.hidden) {
      requestAnimationFrame(render);
      return;
    }

    time += 0.016;

    // Smooth mouse interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.04;
    mouse.y += (mouse.targetY - mouse.y) * 0.04;
    const mouseOffsetX = (mouse.x - width / 2) * 0.22;
    const mouseOffsetY = (mouse.y - height / 2) * 0.16;

    ctx.clearRect(0, 0, width, height);

    // Detect dark or light mode
    const isDark = document.documentElement.style.colorScheme === 'dark' || 
                   (!document.documentElement.style.colorScheme && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
                   (document.querySelector('meta[name="color-scheme"]') && document.querySelector('meta[name="color-scheme"]').content.includes('dark'));

    // 1. Update 3D Node positions
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Undulating wave: smooth harmonic motion
      const waveY = Math.sin(time + node.gridX * 0.42 + node.gridY * 0.35) * 40 +
                    Math.cos(time * 0.75 + node.gridX * 0.25) * 20;
      const waveX = Math.cos(time * 0.45 + node.gridY * 0.35) * 12;

      let mx = node.baseX + waveX - mouseOffsetX;
      let my = node.baseY + waveY - mouseOffsetY;
      let mz = node.baseZ;

      // Ripple disturbance
      for (let j = 0; j < ripples.length; j++) {
        const rp = ripples[j];
        const screenEstX = width / 2 + (mx * fov) / mz;
        const screenEstY = height / 2 + (my * fov) / mz;
        const dist = Math.hypot(screenEstX - rp.x, screenEstY - rp.y);
        const diff = Math.abs(dist - rp.radius);
        if (diff < 45) {
          const force = (1 - diff / 45) * rp.alpha * 38;
          my -= force;
        }
      }

      node.x = mx;
      node.y = my;
      node.z = mz;

      // 3D Perspective Projection
      const scale = fov / Math.max(node.z, 50);
      node.screenX = width / 2 + node.x * scale;
      node.screenY = height / 2 + node.y * scale;
      node.scale = scale;
      node.alpha = Math.max(0, Math.min(1, 1.25 - node.z / (rows * spacingZ + 80)));
    }

    // 2. Draw Lattice Connections
    ctx.lineWidth = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const current = nodes[idx];

        // Horizontal neighbor (c + 1)
        if (c < cols - 1) {
          const right = nodes[idx + 1];
          const alpha = ((current.alpha + right.alpha) / 2) * (isDark ? 0.35 : 0.22);
          ctx.strokeStyle = isDark ? `rgba(45, 76, 255, ${alpha})` : `rgba(37, 99, 235, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(current.screenX, current.screenY);
          ctx.lineTo(right.screenX, right.screenY);
          ctx.stroke();
        }

        // Vertical neighbor (r + 1)
        if (r < rows - 1) {
          const down = nodes[idx + cols];
          const alpha = ((current.alpha + down.alpha) / 2) * (isDark ? 0.28 : 0.18);
          ctx.strokeStyle = isDark ? `rgba(0, 210, 255, ${alpha * 0.85})` : `rgba(2, 132, 199, ${alpha * 0.85})`;
          ctx.beginPath();
          ctx.moveTo(current.screenX, current.screenY);
          ctx.lineTo(down.screenX, down.screenY);
          ctx.stroke();
        }
      }
    }

    // 3. Draw Traveling Quantum Pulses
    if (Math.random() < 0.09) spawnPulse();
    for (let p = pulses.length - 1; p >= 0; p--) {
      const pulse = pulses[p];
      pulse.progress += pulse.speed;
      if (pulse.progress >= 1) {
        pulses.splice(p, 1);
        continue;
      }

      const nodeA = nodes[pulse.from];
      const nodeB = nodes[pulse.to];
      const px = nodeA.screenX + (nodeB.screenX - nodeA.screenX) * pulse.progress;
      const py = nodeA.screenY + (nodeB.screenY - nodeA.screenY) * pulse.progress;
      const pScale = (nodeA.scale + nodeB.scale) * 0.5;

      const pulseAlpha = Math.sin(pulse.progress * Math.PI);
      ctx.fillStyle = pulse.color;
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, 2.8 * pScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 4. Draw Lattice Nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.screenX < -20 || node.screenX > width + 20 || node.screenY < -20 || node.screenY > height + 20) continue;

      const radius = Math.max(1.2, 2.6 * node.scale);
      const nodeA = node.alpha * (isDark ? 0.75 : 0.55);
      const pulse = Math.sin(time * 2 + node.phase) * 0.3 + 0.7;

      ctx.fillStyle = isDark ? `rgba(0, 210, 255, ${nodeA * pulse})` : `rgba(37, 99, 235, ${nodeA * pulse})`;
      ctx.beginPath();
      ctx.arc(node.screenX, node.screenY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Occasional bright node with energetic halo
      if (node.energy > 0.8) {
        ctx.strokeStyle = isDark ? `rgba(45, 76, 255, ${nodeA * 0.45})` : `rgba(59, 130, 246, ${nodeA * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, radius * 2.8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 5. Update ripples
    for (let j = ripples.length - 1; j >= 0; j--) {
      const rp = ripples[j];
      rp.radius += 5.5;
      rp.alpha *= 0.96;
      if (rp.radius > rp.maxRadius || rp.alpha < 0.02) {
        ripples.splice(j, 1);
        continue;
      }
      ctx.strokeStyle = isDark ? `rgba(0, 210, 255, ${rp.alpha * 0.45})` : `rgba(37, 99, 235, ${rp.alpha * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

/* ==========================================================================
   1. Theme Management (Modern Web Compliant)
   ========================================================================== */
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const toggleText = document.getElementById('themeToggleText');
  let meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'color-scheme';
    meta.content = 'light dark';
    document.head.appendChild(meta);
  }

  const savedTheme = localStorage.getItem('falcon_theme') || 'auto';
  applyTheme(savedTheme);

  toggleBtn.addEventListener('click', () => {
    const current = localStorage.getItem('falcon_theme') || 'auto';
    let next = 'auto';
    if (current === 'auto') next = 'dark';
    else if (current === 'dark') next = 'light';
    else if (current === 'light') next = 'auto';

    applyTheme(next);
  });

  function applyTheme(theme) {
    localStorage.setItem('falcon_theme', theme);
    const root = document.documentElement;
    if (theme === 'auto') {
      root.removeAttribute('data-theme');
      meta.content = 'light dark';
      toggleText.textContent = 'THEME: AUTO';
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      meta.content = 'dark';
      toggleText.textContent = 'THEME: DARK';
    } else {
      root.setAttribute('data-theme', 'light');
      meta.content = 'light';
      toggleText.textContent = 'THEME: LIGHT';
    }
  }
}

/* ==========================================================================
   2. Interactive Cryptographic Pipeline (Alice & Bob)
   ========================================================================== */
function initPipeline() {
  const presetSelect = document.getElementById('presetSelect');
  const seedInput = document.getElementById('seedInput');
  const msgInput = document.getElementById('msgInput');
  const runBtn = document.getElementById('runPipelineBtn');
  const tamperMsgBtn = document.getElementById('tamperMsgBtn');
  const corruptSigBtn = document.getElementById('corruptSigBtn');
  const restoreBtn = document.getElementById('restoreBtn');
  const statusLabel = document.getElementById('tamperStatusLabel');

  // Preview elements
  const hPreview = document.getElementById('hPreview');
  const rPreview = document.getElementById('rPreview');
  const s2Preview = document.getElementById('s2Preview');
  const s1Preview = document.getElementById('s1Preview');
  const normPreview = document.getElementById('normPreview');
  const betaPreview = document.getElementById('betaPreview');

  // Verdict banner elements
  const verdictBanner = document.getElementById('verdictBanner');
  const verdictHeadline = document.getElementById('verdictHeadline');
  const verdictDetail = document.getElementById('verdictDetail');
  const verdictNormVal = document.getElementById('verdictNormVal');
  const verdictBetaVal = document.getElementById('verdictBetaVal');
  const verdictProofText = document.getElementById('verdictProofText');
  const verdictIcon = document.getElementById('verdictIcon');

  let currentKeypair = null;
  let currentSignature = null;
  let originalMessage = msgInput.value;
  let originalSignature = null;

  function runFullPipeline() {
    const preset = presetSelect.value;
    const seed = seedInput.value;
    const msg = msgInput.value;
    originalMessage = msg;
    statusLabel.textContent = "Status: Untampered";
    statusLabel.style.color = "var(--brand-green)";

    // Stage 1: KeyGen
    currentKeypair = FalconEngine.keygen(preset, seed);
    hPreview.textContent = formatPoly(currentKeypair.h);

    // Stage 2: Alice Signs
    currentSignature = FalconEngine.sign(currentKeypair, msg);
    originalSignature = JSON.parse(JSON.stringify(currentSignature));

    rPreview.textContent = currentSignature.r;
    s2Preview.textContent = formatPoly(currentSignature.s2);

    // Stage 3: Bob Verifies
    verifyAndDisplay(currentKeypair, msg, currentSignature);
  }

  function verifyAndDisplay(keypair, msg, signature) {
    const res = FalconEngine.verify(keypair, msg, signature);

    s1Preview.textContent = formatPoly(res.s1);
    normPreview.textContent = res.norm.toLocaleString();
    betaPreview.textContent = res.beta2.toLocaleString();

    verdictNormVal.textContent = res.norm.toLocaleString();
    verdictBetaVal.textContent = res.beta2.toLocaleString();

    if (res.isValid) {
      verdictBanner.className = "verdict-banner valid";
      verdictHeadline.textContent = "VERIFIED AUTHENTIC";
      verdictDetail.textContent = "Bob confirmed Alice's signature: The distance is well inside the allowable green bullseye limit. Signature accepted!";
      verdictNormVal.style.color = "var(--brand-green)";
      verdictProofText.textContent = "GENUINE SIGNATURE CONFIRMED";
      verdictIcon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
    } else {
      verdictBanner.className = "verdict-banner invalid";
      verdictHeadline.textContent = "REJECTED: FAKE DETECTED";
      verdictDetail.textContent = `Bob rejected the signature! Distance blew up (${res.norm.toLocaleString()} > limit ${res.beta2.toLocaleString()}). Someone changed the message or signature!`;
      verdictNormVal.style.color = "var(--brand-red)";
      verdictProofText.textContent = "FORGERY BLOCKED BY BOB'S VERIFIER";
      verdictIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
    }
  }

  function formatPoly(poly) {
    if (!poly) return "...";
    if (poly.length <= 16) {
      return `[${poly.join(', ')}]`;
    }
    const head = poly.slice(0, 6).join(', ');
    const tail = poly.slice(-4).join(', ');
    return `[${head}, ... ${poly.length - 10} coeffs ..., ${tail}] (n = ${poly.length})`;
  }

  // Event Listeners
  runBtn.addEventListener('click', runFullPipeline);
  presetSelect.addEventListener('change', runFullPipeline);

  // Tamper Message: Change the message without updating the signature
  tamperMsgBtn.addEventListener('click', () => {
    if (!currentKeypair || !currentSignature) runFullPipeline();
    const tamperedMsg = "Authorize settlement of 500,000 PQC tokens to EVE [ADVERSARY]";
    msgInput.value = tamperedMsg;
    statusLabel.textContent = "Status: MESSAGE TAMPERED";
    statusLabel.style.color = "var(--brand-red)";

    // Run verification with the tampered message!
    verifyAndDisplay(currentKeypair, tamperedMsg, currentSignature);
  });

  // Corrupt Signature: Alter coefficients of s2
  corruptSigBtn.addEventListener('click', () => {
    if (!currentKeypair || !currentSignature) runFullPipeline();
    const corruptedSig = JSON.parse(JSON.stringify(currentSignature));
    // Corrupt one coefficient by adding 50
    if (corruptedSig.s2.length > 0) {
      corruptedSig.s2[0] += 75;
    }
    statusLabel.textContent = "Status: SIGNATURE BITSTREAM CORRUPTED";
    statusLabel.style.color = "var(--brand-red)";
    s2Preview.textContent = formatPoly(corruptedSig.s2);

    verifyAndDisplay(currentKeypair, msgInput.value, corruptedSig);
  });

  // Restore Valid State
  restoreBtn.addEventListener('click', () => {
    msgInput.value = originalMessage;
    if (originalSignature) {
      currentSignature = JSON.parse(JSON.stringify(originalSignature));
      s2Preview.textContent = formatPoly(currentSignature.s2);
      verifyAndDisplay(currentKeypair, originalMessage, currentSignature);
      statusLabel.textContent = "Status: Restored to Valid State";
      statusLabel.style.color = "var(--brand-green)";
    } else {
      runFullPipeline();
    }
  });

  // Initial Run
  runFullPipeline();
}

/* ==========================================================================
   3. Interactive 2D Lattice Visualizer (HTML5 Canvas)
   ========================================================================== */
function initLatticeCanvas() {
  const canvas = document.getElementById('latticeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const resetBtn = document.getElementById('resetCanvasBtn');

  // Basis vectors (2D representation)
  // Good basis (nearly orthogonal): b1 = (4, 1), b2 = (-1, 4)
  const b1 = { x: 45, y: 12 };
  const b2 = { x: -12, y: 45 };

  // Bad basis (skewed public key): B1 = b1 + 3*b2, B2 = 4*b1 + b2
  const B1 = { x: b1.x + 3 * b2.x, y: b1.y + 3 * b2.y };
  const B2 = { x: 4 * b1.x + b2.x, y: 4 * b1.y + b2.y };

  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  let origin = { x: width / 2, y: height / 2 };
  let target = { x: origin.x + 35, y: origin.y - 40 };
  let isDragging = false;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    origin = { x: width / 2, y: height / 2 };
    draw();
  }

  window.addEventListener('resize', resize);
  // initial sizing
  setTimeout(resize, 50);

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // 1. Grid Background
    ctx.strokeStyle = "rgba(45, 76, 255, 0.08)";
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Axes
    ctx.strokeStyle = "rgba(150, 165, 195, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // 3. Lattice Points in viewing window
    ctx.fillStyle = "rgba(100, 120, 160, 0.5)";
    const range = 8;
    const latticePoints = [];
    for (let i = -range; i <= range; i++) {
      for (let j = -range; j <= range; j++) {
        const px = origin.x + i * b1.x + j * b2.x;
        const py = origin.y + i * b1.y + j * b2.y;
        if (px >= -20 && px <= width + 20 && py >= -20 && py <= height + 20) {
          latticePoints.push({ x: px, y: py, i, j });
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Secret Good Basis (Blue Vectors)
    drawVector(origin.x, origin.y, b1.x, b1.y, "#2D4CFF", "b₁ (Secret)");
    drawVector(origin.x, origin.y, b2.x, b2.y, "#2D4CFF", "b₂ (Secret)");

    // 5. Public Bad Basis (Red Vectors - Skewed)
    drawVector(origin.x, origin.y, B1.x, B1.y, "rgba(245, 32, 39, 0.7)", "B₁ (Public)");

    // 6. Find Closest Lattice Point to Target c
    let closest = null;
    let minDist = Infinity;
    for (const p of latticePoints) {
      const d = Math.hypot(p.x - target.x, p.y - target.y);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }

    // 7. Target Point c (Cyan)
    ctx.fillStyle = "#00d2ff";
    ctx.shadowColor = "rgba(0, 210, 255, 0.8)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#00d2ff";
    ctx.fillText("Target c = HashToPoint(M)", target.x + 10, target.y - 8);

    // 8. Acceptance Ball of radius beta
    const betaRadius = 48; // scaled visual beta
    ctx.strokeStyle = minDist <= betaRadius ? "rgba(16, 185, 129, 0.6)" : "rgba(245, 32, 39, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, betaRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 9. Sampled Signature Point (Orange)
    if (closest) {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(closest.x, closest.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Vector from target to signature point: (s1, s2)
      ctx.strokeStyle = minDist <= betaRadius ? "#10b981" : "#f52027";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(closest.x, closest.y);
      ctx.stroke();

      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`v ∈ L (Sig lattice vector)`, closest.x + 8, closest.y + 14);

      // Label distance / norm status
      const statusText = minDist <= betaRadius ? `||s|| = ${Math.round(minDist)} <= β (ACCEPT)` : `||s|| = ${Math.round(minDist)} > β (REJECT)`;
      ctx.fillStyle = minDist <= betaRadius ? "#10b981" : "#f52027";
      ctx.fillText(statusText, target.x - 40, target.y + betaRadius + 16);
    }
  }

  function drawVector(ox, oy, dx, dy, color, label) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + dx, oy + dy);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(dy, dx);
    const headLen = 7;
    ctx.beginPath();
    ctx.moveTo(ox + dx, oy + dy);
    ctx.lineTo(
      ox + dx - headLen * Math.cos(angle - Math.PI / 6),
      oy + dy - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      ox + dx - headLen * Math.cos(angle + Math.PI / 6),
      oy + dy - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText(label, ox + dx + 5, oy + dy - 5);
    }
  }

  // Canvas interaction
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    updateTargetPos(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) updateTargetPos(e);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  function updateTargetPos(e) {
    const rect = canvas.getBoundingClientRect();
    target.x = e.clientX - rect.left;
    target.y = e.clientY - rect.top;
    draw();
  }

  resetBtn.addEventListener('click', () => {
    target = { x: origin.x + 35, y: origin.y - 40 };
    draw();
  });
}

/* ==========================================================================
   4. Live DSP48E2 Mantissa Slice Calculator (m13_fpu64.sv)
   ========================================================================== */
function initDSPCalculator() {
  const inputA = document.getElementById('mantissaA');
  const inputB = document.getElementById('mantissaB');
  if (!inputA || !inputB) return;

  function update() {
    let rawA = inputA.value.trim().replace(/^0x/i, '');
    let rawB = inputB.value.trim().replace(/^0x/i, '');

    // Parse BigInt for exact 52-bit mantissa math
    try {
      const valA = BigInt("0x" + rawA);
      const valB = BigInt("0x" + rawB);

      // Mask to 52 bits
      const mask52 = (1n << 52n) - 1n;
      const mA = valA & mask52;
      const mB = valB & mask52;

      // Slice into three 18-bit and 17-bit segments for 6 DSP48E2 slices
      // DSP inputs: 27-bit and 18-bit signed
      // Segment breakdown:
      // a0: 17 bits, a1: 17 bits, a2: 18 bits
      const a0 = mA & 0x1FFFFn;
      const a1 = (mA >> 17n) & 0x1FFFFn;
      const a2 = (mA >> 34n) & 0x3FFFFn;

      const b0 = mB & 0x1FFFFn;
      const b1 = (mB >> 17n) & 0x1FFFFn;
      const b2 = (mB >> 34n) & 0x3FFFFn;

      // 6 partial products:
      // p0 = a0*b0, p1 = a0*b1, p2 = a0*b2, p3 = a1*b0, p4 = a1*b1, p5 = a2*b0 (or similar optimized tile)
      // Display decomposition
    } catch {
      // ignore parse errors
    }
  }

  inputA.addEventListener('input', update);
  inputB.addEventListener('input', update);
  update();
}

/* ==========================================================================
   5. Smooth Scroll Navigation Spy
   ========================================================================== */
function initNavScroll() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach((section) => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      const sectionId = section.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        current = sectionId;
      }
    });

    links.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}
