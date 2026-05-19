import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

gsap.registerPlugin(ScrollTrigger);

// lenis deva bug peh bug aara!!

const lenis = new window['Lenis']({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
  smoothWheel: true
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

lenis.on('scroll', ScrollTrigger.update);


const MODELS_BASE = './assets/models';
const currencyRegistry = {
  INR: { name: "Indian Rupee" ,symbol: "₹", model: `${MODELS_BASE}/rupee.glb`, baseScale: 1.4, theme: "#14110f" },
  USD: { name: "US Dollar" ,symbol: "$", model: `${MODELS_BASE}/dollar.glb`, baseScale: 0.35, theme: "#08140e" },
  EUR: { name: "Euro" ,symbol: "€", model: `${MODELS_BASE}/euro.glb`, baseScale: 1, theme: "#0b101d" },
  JPY: { name: "Yen" ,symbol: "¥", model: `${MODELS_BASE}/yen.glb`, baseScale: 0.15, theme: "#161616" }
};

const exchangeRates = {
  INR: { INR: 1, USD: 0.012, EUR: 0.011, JPY: 1.73 },
  USD: { INR: 83.35, USD: 1, EUR: 0.92, JPY: 155.80 },
  EUR: { INR: 90.10, USD: 1.08, EUR: 1, JPY: 168.50 },
  JPY: { INR: 0.53, USD: 0.0064, EUR: 0.0059, JPY: 1 }
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 6);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#webgl'),
  alpha: true,
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
keyLight.position.set(5, 5, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 2.0);
fillLight.position.set(-5, 2, 2);
scene.add(fillLight);

const loader = new GLTFLoader();
let loadedModels = {};
let activeGroup = new THREE.Group();
scene.add(activeGroup);

function preloadAssets() {
  Object.keys(currencyRegistry).forEach((key) => {
    loader.load(currencyRegistry[key].model, (gltf) => {
      const mesh = gltf.scene;
      
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      mesh.position.set(-center.x, -center.y, -center.z);

      const pivot = new THREE.Group();
      pivot.add(mesh);

      const customScale = currencyRegistry[key].baseScale;
      pivot.scale.set(customScale, customScale, customScale);

      loadedModels[key] = pivot;
      
      const currentSelected = document.getElementById('currency').value;
      if(key === currentSelected) {
        showModel(key);
      }
    }, undefined, (err) => {
      console.error(`Error loading model ${key}:`, err);
    });
  });
}

function showModel(key) {
  while(activeGroup.children.length > 0) activeGroup.remove(activeGroup.children[0]);
  if (loadedModels[key]) {
    if (key === 'JPY') {
      loadedModels[key].traverse((child) => {
        if (child.isMesh) {
          child.material.roughness = 0.2;
          child.material.metalness = 0.9;
        }
      });
    }
    activeGroup.add(loadedModels[key]);
  }
}


function generateSmartInsights(sourceCurrency) {
  const panel = document.getElementById('aiInsights');
  const textEl = document.getElementById('insightText');
  const badgeEl = document.getElementById('trendBadge');
  
  if (!panel || !textEl || !badgeEl) return;
  panel.classList.add('active');

  const targetCurrency = sourceCurrency === "USD" ? "INR" : "USD";
  const baselineRate = exchangeRates[sourceCurrency][targetCurrency] || 1.0;

  let rates = [];
  let steps = 7;
  
  for (let i = 0; i < steps; i++) {
    const variance = 1 + (Math.sin(i * 0.4) * 0.012) + ((Math.random() - 0.5) * 0.005);
    if (i === steps - 1) {
      rates.push(baselineRate);
    } else {
      rates.push(baselineRate * variance);
    }
  }
  
  const firstRate = rates[0];
  const lastRate = rates[rates.length - 1];
  const changePercent = ((lastRate - firstRate) / firstRate) * 100;

  let insight = "";
  let isUp = changePercent > 0;

  if (changePercent > 0) {
    insight = `${sourceCurrency} strengthened by <span style="color:#00ffaa; font-weight:600;">${changePercent.toFixed(2)}%</span> this week against ${targetCurrency}. <span style="color:rgba(255,255,255,0.4)">Best value parameters triggered across the last 30 days.</span>`;
    badgeEl.textContent = `+${changePercent.toFixed(2)}% STRENGTH`;
    badgeEl.className = "trend-status trend-up";
  } else {
    insight = `${sourceCurrency} weakened by <span style="color:#ff3b30; font-weight:600;">${Math.abs(changePercent).toFixed(2)}%</span> this week against ${targetCurrency}. <span style="color:rgba(255,255,255,0.4)">Support thresholds nearing baseline parameters.</span>`;
    badgeEl.textContent = `${changePercent.toFixed(2)}% SLIP`;
    badgeEl.className = "trend-status trend-down";
  }

  textEl.innerHTML = insight;
  renderSparkline(rates, isUp);
}

function renderSparkline(dataPoints, isUp) {
  const canvas = document.getElementById('sparklineCanvas');
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min === 0 ? 1 : max - min;

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isUp ? '#00ffaa' : '#ff3b30';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  dataPoints.forEach((val, index) => {
    const x = (index / (dataPoints.length - 1)) * (w - 10) + 5;
    const y = h - ((val - min) / range) * (h - 14) - 7;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.lineTo((w - 10) + 5, h);
  ctx.lineTo(5, h);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, isUp ? 'rgba(0, 255, 170, 0.12)' : 'rgba(255, 59, 48, 0.12)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fill();
}


function initAwwwardsTimeline() {
  const amount = Number(document.getElementById('amount').value) || 0;
  const sourceCurrency = document.getElementById('currency').value;
  
  const sortedKeys = [sourceCurrency, ...Object.keys(currencyRegistry).filter(k => k !== sourceCurrency)];

  ScrollTrigger.getAll().forEach(t => t.kill());

  sortedKeys.forEach((currencyKey, idx) => {
    const targetPanelId = `cardText${idx + 1}`; 
    const tar= `tc${idx+1}`;
    const rate = exchangeRates[sourceCurrency][currencyKey];
    const finalValue = (amount * rate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const config = currencyRegistry[currencyKey];

    const element = document.getElementById(targetPanelId);
    if (element) {
      element.innerHTML = 
        `<span style="font-family:var(--font-sans); color:rgba(255,255,255,0.3)">${config.symbol}</span> ${finalValue} <span style="font-family:var(--font-sans); font-size:1.5rem; letter-spacing:2px; font-weight:300;">${currencyKey}</span>`;
    }
    const ele= document.getElementById(tar);
    if(ele){
      ele.innerHTML= `<span style="font-family: var(--font-serif); font-style: italic; font-weight: 300;font-size: 1rem ; color: yellow ">${config.name} `;
    }
    

    ScrollTrigger.create({
      trigger: `#panel${idx + 1}`,
      start: "top center",
      end: "bottom center",
      onEnter: () => {
        showModel(currencyKey);
        gsap.to("body", { backgroundColor: config.theme, duration: 1.2, ease: "power2.out" });
        gsap.to(`#panel${idx + 1} h2`, { translateY: "0%", duration: 1, ease: "power4.out" });
      },
      onEnterBack: () => {
        showModel(currencyKey);
        gsap.to("body", { backgroundColor: config.theme, duration: 1.2, ease: "power2.out" });
        gsap.to(`#panel${idx + 1} h2`, { translateY: "0%", duration: 1, ease: "power4.out" });
      },
      onLeave: () => gsap.to(`#panel${idx + 1} h2`, { translateY: "-110%", duration: 0.8, ease: "power4.in" }),
      onLeaveBack: () => gsap.to(`#panel${idx + 1} h2`, { translateY: "110%", duration: 0.8, ease: "power4.in" })
    });
  });


  generateSmartInsights(sourceCurrency);


  const masterTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: "#panel1",
      endTrigger: "#panel4",
      start: "top top",
      end: "bottom bottom",
      scrub: 1
    }
  });

  masterTimeline
    .to(camera.position, { x: -2, y: 1.5, z: 4, ease: "none" })  
    .to(camera.position, { x: 2, y: 0.5, z: 3.5, ease: "none" }) 
    .to(camera.position, { x: 0, y: 0, z: 5, ease: "none" });    

  lenis.scrollTo('#panel1', { duration: 1.5 });
}

const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', initAwwwardsTimeline);
  console.log("✅ Button click binding active and ready!");
}


const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  
  const elapsed = clock.getElapsedTime();
  if (activeGroup) {
    activeGroup.rotation.y += 0.005;
    activeGroup.position.y = Math.sin(elapsed * 1.5) * 0.08;
  }

  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}


window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;


  camera.aspect = width / height;
  camera.updateProjectionMatrix();


  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


  if (width < 768) {
    camera.position.set(0, 2.2, 7.5); 
  } else {
    camera.position.set(0, 3, 6); 
  }
});

if (window.innerWidth < 768) {
  camera.position.set(0, 2.2, 7.5);
}


preloadAssets();
tick(); 
