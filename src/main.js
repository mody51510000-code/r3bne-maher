// -------------------------------------------------------------
// Main Game Engine Orchestrator for "رعبني يا ماهر"
// Manages three.js scene, game loop, UI screens, & level states.
// -------------------------------------------------------------



class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    
    // Game States: 'SOUND_INIT', 'MENU', 'CUSTOMIZE', 'PLAYING', 'GAMEOVER', 'VICTORY'
    this.state = 'SOUND_INIT';
    
    // Level & Stats
    this.level = 1;
    this.health = 100;
    this.scaredCount = 0;
    this.scaredGoal = 4;
    this.totalScared = 0;
    
    // Customization configurations
    this.customizerConfig = {
      shape: 'blob',
      color: '#00ffcc',
      eyes: 'two-glow',
      accessory: 'none'
    };

    // 3D Objects references
    this.playerGroup = null;
    this.customizerPreviewGroup = null;
    this.menuParticles = null;
    this.gameplayParticles = null;
    this.playerFlashlight = null;
    this.directionalLight = null;

    // Flashlight state
    this.isFlashlightOn = true;

    // Camera perspective: 'first-person' or 'third-person'
    this.cameraPerspective = 'first-person';

    // Managers
    this.worldManager = null;
    this.npcManager = null;

    // Player movement
    this.playerSpeed = 3.5;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDuration = 0.2;
    this.isDashing = false;

    // Camera angles (Third person)
    this.cameraYaw = 0.0;
    this.cameraPitch = 0.2; // slight down angle
    this.cameraDistance = 3.8;
    this.cameraMinPitch = -0.3;
    this.cameraMaxPitch = 0.8;

    this.initThree();
    this.bindUI();
    this.setupMenuScene();
    this.animate();
  }

  // Initialize WebGL Renderer & Scene
  initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    // Creepy dense horror fog
    this.scene.background = new THREE.Color(0x040407);
    this.scene.fog = new THREE.FogExp2(0x040407, 0.09);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    
    // Handle Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Setup basic elements for Menu and Customizer background
  setupMenuScene() {
    // Sidelight for character customization preview
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 5, 5);
    this.scene.add(this.directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(ambientLight);

    // Build Floating dust particles for main menu background
    const pGeo = new THREE.BufferGeometry();
    const pCount = 80;
    const positions = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 15;
      positions[i + 1] = (Math.random() - 0.5) * 10 + 2;
      positions[i + 2] = (Math.random() - 0.5) * 15;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xff0055,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.menuParticles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.menuParticles);

    // Initial character customization preview object
    this.rebuildCustomizerPreview();
  }

  rebuildCustomizerPreview() {
    if (this.customizerPreviewGroup) {
      this.scene.remove(this.customizerPreviewGroup);
    }
    
    this.customizerPreviewGroup = CharacterCustomizer.createGhost(this.customizerConfig);
    // Put preview character in front of menu camera coordinates
    this.customizerPreviewGroup.position.set(0, 0.8, -2.5);
    this.scene.add(this.customizerPreviewGroup);
  }

  // Bind Buttons & UI Clicks
  bindUI() {
    // 1. Audio Init button
    document.getElementById('btn-init-audio').addEventListener('click', () => {
      audio.init();
      audio.playUIClick();
      this.changeState('MENU');
    });

    // 2. Start button (Transition to Customizer)
    document.getElementById('btn-start').addEventListener('click', () => {
      audio.playUIClick();
      this.changeState('CUSTOMIZE');
    });

    // 3. Tutorial buttons
    document.getElementById('btn-tutorial').addEventListener('click', () => {
      audio.playUIClick();
      document.getElementById('tutorial-modal').classList.add('active');
    });

    document.getElementById('btn-close-tutorial').addEventListener('click', () => {
      audio.playUIClick();
      document.getElementById('tutorial-modal').classList.remove('active');
    });

    // 4. Customizer options listeners
    const bindOptions = (elementId, configKey) => {
      const parent = document.getElementById(elementId);
      parent.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        audio.playUIHover();
        
        // Remove active class from sibling buttons
        parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update configuration value
        const val = btn.dataset.value;
        this.customizerConfig[configKey] = val;
        
        // Dynamic color changes particles
        if (configKey === 'color') {
          this.menuParticles.material.color.setHex(parseInt(val.replace('#', '0x')));
        }

        // Rebuild character preview mesh
        this.rebuildCustomizerPreview();
        this.updateCustomizerStats();
      });
    };

    bindOptions('group-shape', 'shape');
    bindOptions('group-eyes', 'eyes');
    bindOptions('group-accessories', 'accessory');
    bindOptions('group-color', 'color');

    // Bind camera perspective choice in customizer
    const cameraParent = document.getElementById('group-camera');
    cameraParent.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      audio.playUIClick();
      cameraParent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.cameraPerspective = btn.dataset.value;
    });

    // 5. Enter Game button
    document.getElementById('btn-enter-game').addEventListener('click', () => {
      audio.playUIClick();
      this.changeState('PLAYING');
    });

    // 6. Game Over restart buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
      audio.playUIClick();
      this.resetGame();
      this.changeState('PLAYING');
    });

    document.getElementById('btn-go-menu').addEventListener('click', () => {
      audio.playUIClick();
      this.resetGame();
      this.changeState('MENU');
    });

    // 7. Victory restart buttons
    document.getElementById('btn-victory-restart').addEventListener('click', () => {
      audio.playUIClick();
      this.resetGame();
      this.changeState('PLAYING');
    });

    document.getElementById('btn-vic-menu').addEventListener('click', () => {
      audio.playUIClick();
      this.resetGame();
      this.changeState('MENU');
    });

    const mobileFlashlight = document.getElementById('btn-mobile-flashlight');
    if (mobileFlashlight) {
      mobileFlashlight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.toggleFlashlight();
      });
    }

    const hudCameraToggle = document.getElementById('btn-hud-camera-toggle');
    if (hudCameraToggle) {
      hudCameraToggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleCameraPerspective();
      });
    }
  }

  updateCustomizerStats() {
    let speed = 50;
    let range = 50;
    let regen = 50;

    let speedText = "متوسط";
    let rangeText = "متوسط";
    let regenText = "متوسط";

    // 1. Calculate values based on Shape
    if (this.customizerConfig.shape === 'blob') {
      speed = 50;
      range = 50;
      regen = 50;
    } else if (this.customizerConfig.shape === 'spiky') {
      speed = 80;
      range = 35;
      regen = 30;
      speedText = "سريع جداً";
      rangeText = "صغير";
      regenText = "ضعيف";
    } else if (this.customizerConfig.shape === 'demon') {
      speed = 30;
      range = 85;
      regen = 70;
      speedText = "بطيء";
      rangeText = "هائل";
      regenText = "ممتاز";
    }

    // 2. Adjustments based on Accessories
    if (this.customizerConfig.accessory === 'horns') {
      speed += 10;
      range += 15;
      if (speedText === "متوسط") speedText = "سريع";
      else if (speedText === "سريع جداً") speedText = "خارق";
      if (rangeText === "متوسط") rangeText = "كبير";
      else if (rangeText === "صغير") rangeText = "متوسط";
    } else if (this.customizerConfig.accessory === 'halo') {
      regen += 25;
      if (regenText === "متوسط") regenText = "قوي";
      else if (regenText === "ممتاز") regenText = "خارق";
    }

    // Cap values
    speed = Math.min(100, Math.max(0, speed));
    range = Math.min(100, Math.max(0, range));
    regen = Math.min(100, Math.max(0, regen));

    // Update DOM
    document.getElementById('stat-speed-bar').style.width = `${speed}%`;
    document.getElementById('stat-speed-val').innerText = speedText;

    document.getElementById('stat-range-bar').style.width = `${range}%`;
    document.getElementById('stat-range-val').innerText = rangeText;

    document.getElementById('stat-regen-bar').style.width = `${regen}%`;
    document.getElementById('stat-regen-val').innerText = regenText;
  }

  toggleFlashlight() {
    this.isFlashlightOn = !this.isFlashlightOn;
    if (this.playerFlashlight) {
      this.playerFlashlight.visible = this.isFlashlightOn;
    }
    audio.playUIClick();

    const mobileBtn = document.getElementById('btn-mobile-flashlight');
    if (mobileBtn) {
      if (this.isFlashlightOn) {
        mobileBtn.style.boxShadow = '0 0 15px rgba(221, 170, 0, 0.9)';
        mobileBtn.style.background = 'linear-gradient(135deg, #ccaa00 0%, #775500 100%)';
      } else {
        mobileBtn.style.boxShadow = 'none';
        mobileBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      }
    }
  }

  toggleCameraPerspective() {
    if (this.cameraPerspective === 'first-person') {
      this.cameraPerspective = 'third-person';
    } else {
      this.cameraPerspective = 'first-person';
    }
    
    // Update player visibility
    if (this.playerGroup) {
      this.playerGroup.visible = (this.cameraPerspective === 'third-person');
    }
    
    audio.playUIClick();
    
    // Update HUD text
    const textEl = document.getElementById('hud-camera-text');
    if (textEl) {
      textEl.innerText = this.cameraPerspective === 'first-person' ? "شخص أول" : "شخص ثالث";
    }
  }

  // State Transition Manager
  changeState(newState) {
    // Hide all HUDs/screens
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    document.getElementById('hud').classList.remove('active');
    
    this.state = newState;

    if (newState === 'MENU') {
      document.getElementById('menu-screen').classList.add('active');
      // Setup menu camera view looking at ghost
      this.camera.position.set(0, 1.2, 0);
      this.camera.lookAt(new THREE.Vector3(0, 0.8, -2.5));
    } 
    else if (newState === 'CUSTOMIZE') {
      document.getElementById('customizer-screen').classList.add('active');
      this.rebuildCustomizerPreview();
      this.updateCustomizerStats();
      // Side focus view camera
      this.camera.position.set(1.1, 1.2, -1.5);
      this.camera.lookAt(new THREE.Vector3(0, 0.8, -2.5));
    } 
    else if (newState === 'PLAYING') {
      document.getElementById('hud').classList.add('active');
      this.setupWorld();
    } 
    else if (newState === 'GAMEOVER') {
      audio.playGameOver();
      document.getElementById('gameover-screen').classList.add('active');
      
      // Set Stats
      document.getElementById('go-stat-level').innerText = this.level;
      document.getElementById('go-stat-scared').innerText = this.totalScared;

      // Ensure Boss HUD is hidden
      document.getElementById('boss-hud').classList.add('hidden');

      // Unlock pointer lock
      document.exitPointerLock();
    } 
    else if (newState === 'VICTORY') {
      audio.playVictory();
      document.getElementById('victory-screen').classList.add('active');
      
      // Ensure Boss HUD is hidden
      document.getElementById('boss-hud').classList.add('hidden');

      document.getElementById('vic-stat-scared').innerText = this.totalScared;
      
      document.exitPointerLock();
    }
  }

  // Clear scene and build 3D game house level
  setupWorld() {
    // 1. Remove preview object
    if (this.customizerPreviewGroup) {
      this.scene.remove(this.customizerPreviewGroup);
      this.customizerPreviewGroup = null;
    }
    if (this.menuParticles) {
      this.scene.remove(this.menuParticles);
      this.menuParticles = null;
    }
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
      this.directionalLight = null;
    }

    // 2. Initialize World managers
    if (!this.worldManager) {
      this.worldManager = new WorldManager(this.scene);
    }
    if (!this.npcManager) {
      this.npcManager = new NPCManager(this.scene, this.worldManager);
    }

    // 3. Build Player Ghost mesh based on customizer choices
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
    }
    this.playerGroup = CharacterCustomizer.createGhost(this.customizerConfig);
    // Hide player model only in First-Person mode
    this.playerGroup.visible = (this.cameraPerspective === 'third-person');
    this.scene.add(this.playerGroup);

    // Sync HUD camera text
    const cameraTextEl = document.getElementById('hud-camera-text');
    if (cameraTextEl) {
      cameraTextEl.innerText = this.cameraPerspective === 'first-person' ? "شخص أول" : "شخص ثالث";
    }

    // 3.6. Setup player flashlight
    if (this.playerFlashlight) {
      this.scene.remove(this.playerFlashlight.target);
      this.scene.remove(this.playerFlashlight);
    }
    
    this.playerFlashlight = new THREE.SpotLight(0xffffff, 4.0, 16.0, Math.PI / 4.8, 0.45, 1.0);
    this.playerFlashlight.castShadow = true;
    this.playerFlashlight.shadow.bias = -0.001;
    this.playerFlashlight.shadow.mapSize.width = 512;
    this.playerFlashlight.shadow.mapSize.height = 512;

    const flashlightTarget = new THREE.Object3D();
    this.scene.add(flashlightTarget);
    this.playerFlashlight.target = flashlightTarget;
    this.scene.add(this.playerFlashlight);

    // Sync initial flashlight state
    this.playerFlashlight.visible = this.isFlashlightOn;

    // Reset mobile button styling
    const mobileBtn = document.getElementById('btn-mobile-flashlight');
    if (mobileBtn) {
      if (this.isFlashlightOn) {
        mobileBtn.style.boxShadow = '0 0 15px rgba(221, 170, 0, 0.9)';
        mobileBtn.style.background = 'linear-gradient(135deg, #ccaa00 0%, #775500 100%)';
      } else {
        mobileBtn.style.boxShadow = 'none';
        mobileBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      }
    }

    // 3.7. Pre-allocate scare shockwave ring mesh (to avoid dynamic allocations/disposals causing freezes)
    if (this.scareShockwave) {
      this.scene.remove(this.scareShockwave);
    }
    const waveGeo = new THREE.RingGeometry(0.1, 0.4, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: parseInt(this.customizerConfig.color.replace('#', '0x')),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    this.scareShockwave = new THREE.Mesh(waveGeo, waveMat);
    this.scareShockwave.rotation.x = Math.PI / 2;
    this.scareShockwave.position.y = 0.1; // flat on floor
    this.scene.add(this.scareShockwave);
    this.scareShockwaveTimer = 0.0;

    // 3.5. Build floating gameplay dust particles
    if (this.gameplayParticles) {
      this.scene.remove(this.gameplayParticles);
    }
    const gpGeo = new THREE.BufferGeometry();
    const gpCount = 180;
    const gpPositions = new Float32Array(gpCount * 3);
    const totalW = this.worldManager.gridWidth * this.worldManager.cellSize;
    const totalH = this.worldManager.gridHeight * this.worldManager.cellSize;

    for (let i = 0; i < gpCount * 3; i += 3) {
      gpPositions[i] = Math.random() * totalW - this.worldManager.cellSize;
      gpPositions[i + 1] = Math.random() * 2.6 + 0.2; // float between floor and ceiling
      gpPositions[i + 2] = Math.random() * totalH - this.worldManager.cellSize;
    }

    gpGeo.setAttribute('position', new THREE.BufferAttribute(gpPositions, 3));
    const gpMat = new THREE.PointsMaterial({
      color: parseInt(this.customizerConfig.color.replace('#', '0x')),
      size: 0.05,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    this.gameplayParticles = new THREE.Points(gpGeo, gpMat);
    this.scene.add(this.gameplayParticles);

    // Spawn player at a walkable cell
    const spawnPos = this.worldManager.getRandomWalkablePosition();
    this.playerGroup.position.copy(spawnPos);

    // Load NPCs for Level
    this.npcManager.spawnNPCs(this.level);

    // Sync HUD indicators
    this.updateHUD();

    // Reset game controls variables
    this.cameraYaw = Math.PI; // point facing room
    this.cameraPitch = 0.0;
    this.health = 100;
    this.scaredCount = 0;
    this.scaredGoal = 2 + this.level * 2; // Level 1 = 4, Level 2 = 6, Level 3 = 8, Level 4 = 10, Level 5 = Boss Fight
    
    this.updateHUD();
    
    // Show Screen Alert
    let mapName = "البيت";
    if (this.level === 2) mapName = "المدرسة";
    else if (this.level === 3) mapName = "البيت المسكون";
    else if (this.level === 4) mapName = "القصر الملكي";
    else if (this.level === 5) mapName = "المقبرة المظلمة";

    this.showScreenAlert(`المستوى ${this.level} (${mapName}): ابدأ الاستكشاف!`);
  }

  resetGame() {
    this.level = 1;
    this.totalScared = 0;
    this.health = 100;
    this.scaredCount = 0;

    // Clear world group elements
    if (this.worldManager) {
      this.scene.remove(this.worldManager.worldGroup);
      this.worldManager = null;
    }
    if (this.npcManager) {
      if (this.npcManager.npcs) {
        this.npcManager.npcs.forEach(npc => this.scene.remove(npc.mesh));
      }
      if (this.npcManager.hunter) {
        this.scene.remove(this.npcManager.hunter.mesh);
      }
      this.npcManager = null;
    }
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
      this.playerGroup = null;
    }
    if (this.playerFlashlight) {
      this.scene.remove(this.playerFlashlight.target);
      this.scene.remove(this.playerFlashlight);
      this.playerFlashlight = null;
    }
    if (this.gameplayParticles) {
      this.scene.remove(this.gameplayParticles);
      this.gameplayParticles = null;
    }
    if (this.scareShockwave) {
      this.scene.remove(this.scareShockwave);
      this.scareShockwave.geometry.dispose();
      this.scareShockwave.material.dispose();
      this.scareShockwave = null;
    }

    // Re-create menu preview items
    this.setupMenuScene();
  }

  // Update HTML HUD values
  updateHUD() {
    document.getElementById('hud-level-val').innerText = this.level;

    // Update Avatar HUD glow color dynamically
    const avatarGlow = document.getElementById('hud-avatar-glow');
    if (avatarGlow) {
      avatarGlow.style.color = this.customizerConfig.color;
      avatarGlow.style.borderColor = this.customizerConfig.color;
      avatarGlow.style.boxShadow = `0 0 10px ${this.customizerConfig.color}`;
    }

    const scareLabel = document.getElementById('hud-scare-label');
    if (scareLabel) {
      if (this.level === 5) {
        scareLabel.innerText = "قتال الزعيم:";
        document.getElementById('hud-scare-val').innerText = "مواجهة ⚔️";
        document.getElementById('hud-scare-progress').style.width = `100%`;
      } else {
        scareLabel.innerText = "عداد الخوف:";
        document.getElementById('hud-scare-val').innerText = `${this.scaredCount} / ${this.scaredGoal}`;
        const scarePercentage = (this.scaredCount / this.scaredGoal) * 100;
        document.getElementById('hud-scare-progress').style.width = `${scarePercentage}%`;
      }
    }

    const healthBar = document.getElementById('hud-health-bar');
    healthBar.style.width = `${Math.max(0, this.health)}%`;
    
    // Color flash health bar if low
    if (this.health < 30) {
      healthBar.style.background = 'linear-gradient(90deg, #ff3333 0%, #aa0000 100%)';
    } else {
      healthBar.style.background = 'linear-gradient(90deg, #39ff14 0%, #00cc66 100%)';
    }
  }

  showScreenAlert(text) {
    const alertEl = document.getElementById('screen-alert');
    alertEl.innerText = text;
    alertEl.classList.add('show');
    
    setTimeout(() => {
      alertEl.classList.remove('show');
    }, 3000);
  }

  // Trigger scare actions
  triggerScare() {
    // 1. Play shockwave audio
    audio.playScare();

    // 2. Play 3D visual shockwave particles at player
    this.spawnScareParticleShockwave();

    // 3. Scare NPCs in proximity
    let radius = 3.5;
    if (this.customizerConfig.shape === 'spiky') radius = 2.8; // smaller
    else if (this.customizerConfig.shape === 'demon') radius = 5.0; // huge
    
    if (this.customizerConfig.accessory === 'horns') radius += 0.6; // horns boost range!
    
    const count = this.npcManager.scareNearbyHumans(this.playerGroup.position, radius, this.cameraYaw);

    if (count === 999) {
      // Boss Defeated! Win Game
      this.changeState('VICTORY');
    }
    else if (count > 0) {
      this.scaredCount += count;
      this.totalScared += count;
      this.updateHUD();

      // Check level win condition
      if (this.scaredCount >= this.scaredGoal) {
        this.nextLevel();
      }
    }
  }

  spawnScareParticleShockwave() {
    if (this.scareShockwave) {
      this.scareShockwave.position.copy(this.playerGroup.position);
      this.scareShockwave.position.y = 0.1; // flat on floor
      this.scareShockwave.scale.set(1, 1, 1);
      this.scareShockwave.material.opacity = 0.8;
      this.scareShockwaveTimer = 0.4; // 0.4 seconds animation
    }
  }

  nextLevel() {
    audio.playLevelUp();
    this.level++;

    if (this.level > 5) {
      this.changeState('VICTORY');
    } else {
      this.scaredCount = 0;
      this.scaredGoal = 2 + this.level * 2;
      
      // Re-initialize level maps & NPCs
      this.worldManager.generateMap(this.level);
      this.npcManager.spawnNPCs(this.level);
      this.updateHUD();

      // Reset player position to a safe spot in the new level
      const spawnPos = this.worldManager.getRandomWalkablePosition();
      this.playerGroup.position.copy(spawnPos);

      // Warning alerts
      if (this.level === 2) {
        this.showScreenAlert("المستوى 2 (المدرسة): احذر! البشر يحملون الكشافات 🔦");
      } else if (this.level === 3) {
        this.showScreenAlert("المستوى 3 (البيت المسكون): صائد الأشباح يلاحقك من الخلف 🚨");
      } else if (this.level === 4) {
        this.showScreenAlert("المستوى 4 (القصر الملكي): الغرف مليئة بالحراس وصائدي الأشباح 🏰");
      } else if (this.level === 5) {
        this.showScreenAlert("المستوى الأخير (المقبرة): اهزم زعيم صائدي الأشباح من الخلف! ⚔️");
      }
    }
  }

  damagePlayer(amount) {
    let damageFactor = 1.0;
    if (this.customizerConfig.shape === 'spiky') damageFactor = 1.35; // vulnerable to light!
    else if (this.customizerConfig.shape === 'demon') damageFactor = 0.65; // resistant to light!
    
    if (this.customizerConfig.accessory === 'halo') damageFactor -= 0.25; // halo light protection!
    
    this.health -= amount * damageFactor;
    this.updateHUD();

    // Damage flash red screen vignette
    const damageOverlay = document.getElementById('damage-vignette');
    damageOverlay.classList.add('damaged');
    setTimeout(() => {
      damageOverlay.classList.remove('damaged');
    }, 150);

    if (this.health <= 0) {
      this.changeState('GAMEOVER');
    }
  }

  // Primary animation game tick loop
  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // State dependent logic
    if (this.state === 'SOUND_INIT' || this.state === 'MENU' || this.state === 'CUSTOMIZE') {
      // Keep menu particles floating
      if (this.menuParticles) {
        const positions = this.menuParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= delta * 0.25; // float down
          if (positions[i] < -3) positions[i] = 7; // reset
        }
        this.menuParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Animate customizer 3D preview model
      if (this.customizerPreviewGroup) {
        CharacterCustomizer.animateGhost(this.customizerPreviewGroup, time);
        // Slowly rotate model so player sees all angles
        this.customizerPreviewGroup.rotation.y = time * 0.6;
      }

      this.renderer.render(this.scene, this.camera);
    } 
    else if (this.state === 'PLAYING') {
      this.updateGameplay(time, delta);
    }
  }

  updateGameplay(time, delta) {
    // 1. Process player dash cooldown
    if (this.dashCooldown > 0) this.dashCooldown -= delta;
    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // 2. Handle Inputs
    // Dash trigger
    if (input.dashTriggered && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTimer = this.dashDuration;
      this.dashCooldown = 1.6; // 1.6s cooldown
      
      // Play a quick dash synth swoosh
      audio.playStun(); // quick high buzz
    }

    // Scare trigger
    if (input.scareTriggered) {
      this.triggerScare();
    }

    // Flashlight trigger
    if (input.flashlightTriggered) {
      this.toggleFlashlight();
    }

    // Camera view toggle trigger
    if (input.cameraToggleTriggered) {
      this.toggleCameraPerspective();
    }

    // Retrieve movement axis from keyboard or virtual joystick
    const move = input.getMovement();
    
    // Convert movement inputs relative to camera horizontal yaw angle
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw).normalize();
    
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, -move.z) // forward/back
      .addScaledVector(right, move.x)     // side strafe
      .normalize();

    // Apply movement speeds dynamically based on Customizer stats
    let baseSpeed = this.playerSpeed; // default 3.5
    if (this.customizerConfig.shape === 'spiky') baseSpeed = 4.3; // fast
    else if (this.customizerConfig.shape === 'demon') baseSpeed = 2.8; // slow
    
    if (this.customizerConfig.accessory === 'horns') baseSpeed += 0.4; // horns speed boost!
    
    const speed = (this.isDashing ? baseSpeed * 2.4 : baseSpeed);
    
    if (moveDir.lengthSq() > 0.01) {
      // Calculate target position
      const nextPos = this.playerGroup.position.clone().addScaledVector(moveDir, speed * delta);
      
      // Wall collision resolution
      const coll = this.worldManager.checkCollision(nextPos.x, nextPos.z, 0.45); // Player radius 0.45m
      
      if (!coll.collision) {
        this.playerGroup.position.copy(nextPos);
      } else {
        // Resolve and slide
        this.playerGroup.position.addScaledVector(new THREE.Vector3(coll.resolveX, 0, coll.resolveZ), 1.0);
      }

      if (this.cameraPerspective === 'third-person') {
        // Rotate player group towards movement direction
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        // Smoothly slerp rotation
        let diff = targetAngle - this.playerGroup.rotation.y;
        // Normalize angle difference to -PI to PI
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.playerGroup.rotation.y += diff * 0.15;
      }
    }

    // Animate pre-allocated scare shockwave ring mesh (smooth, no WebGL freezing)
    if (this.scareShockwave && this.scareShockwaveTimer > 0) {
      this.scareShockwaveTimer -= delta;
      this.scareShockwave.scale.addScalar(delta * 22.0); // expand ring
      this.scareShockwave.material.opacity = Math.max(0, (this.scareShockwaveTimer / 0.4) * 0.8); // fade out
    }

    // Proximity automatic scaring check (scares humans when walking into them!)
    let autoRadius = 2.3;
    if (this.customizerConfig.shape === 'spiky') autoRadius = 1.8;
    else if (this.customizerConfig.shape === 'demon') autoRadius = 2.8;
    
    if (this.customizerConfig.accessory === 'horns') autoRadius += 0.5;

    const autoCount = this.npcManager.scareNearbyHumans(this.playerGroup.position, autoRadius, this.cameraYaw);
    if (autoCount === 999) {
      // Boss Defeated!
      this.changeState('VICTORY');
    } else if (autoCount > 0) {
      this.scaredCount += autoCount;
      this.totalScared += autoCount;
      this.updateHUD();
      this.spawnScareParticleShockwave();
      
      if (this.scaredCount >= this.scaredGoal) {
        this.nextLevel();
      }
    }

    // Drift gameplay dust particles
    if (this.gameplayParticles) {
      const positions = this.gameplayParticles.geometry.attributes.position.array;
      const totalW = this.worldManager.gridWidth * this.worldManager.cellSize;
      const totalH = this.worldManager.gridHeight * this.worldManager.cellSize;

      for (let i = 0; i < positions.length; i += 3) {
        // Slow float up
        positions[i + 1] += delta * 0.08;
        // Small horizontal sway
        positions[i] += Math.sin(time * 0.8 + i) * 0.003;
        positions[i + 2] += Math.cos(time * 0.8 + i) * 0.003;

        // Wrap around ceiling
        if (positions[i + 1] > 2.8) {
          positions[i + 1] = 0.2;
          positions[i] = Math.random() * totalW - this.worldManager.cellSize;
          positions[i + 2] = Math.random() * totalH - this.worldManager.cellSize;
        }
      }
      this.gameplayParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Health regenerates slowly when in shadow
    let regenRate = 3.5; // default 3.5%/s
    if (this.customizerConfig.shape === 'spiky') regenRate = 2.0; // weak regen
    else if (this.customizerConfig.shape === 'demon') regenRate = 5.0; // strong regen
    
    if (this.customizerConfig.accessory === 'halo') regenRate += 3.0; // halo boost healing!

    if (this.health < 100) {
      this.health = Math.min(100, this.health + delta * regenRate);
      this.updateHUD();
    }

    // 3. Camera view update based on perspective
    this.cameraYaw -= input.mouseDeltaX * input.sensitivity;
    this.cameraPitch = Math.max(-0.75, Math.min(0.75, this.cameraPitch - input.mouseDeltaY * input.sensitivity));
    
    const lookDir = new THREE.Vector3(0, 0, -1)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraPitch)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    if (this.cameraPerspective === 'first-person') {
      // Set player group rotation directly to match camera yaw
      this.playerGroup.rotation.y = this.cameraYaw;
  
      // Set camera position exactly inside player's head pivot height
      this.camera.position.copy(this.playerGroup.position);
      this.camera.position.y += 1.2; // 1.2m head height
  
      const lookTarget = this.camera.position.clone().add(lookDir);
      this.camera.lookAt(lookTarget);
    } else {
      // Third-person camera view
      const offset = new THREE.Vector3(0, 0, this.cameraDistance)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraPitch)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
  
      const targetCamPos = this.playerGroup.position.clone().add(offset);
      targetCamPos.y = Math.max(0.4, targetCamPos.y); // Cap camera from clipping underground
  
      // Camera Collision Resolution (Avoid camera going through walls)
      const camColl = this.worldManager.checkCollision(targetCamPos.x, targetCamPos.z, 0.3);
      if (camColl.collision) {
        targetCamPos.x += camColl.resolveX;
        targetCamPos.z += camColl.resolveZ;
      }
  
      this.camera.position.copy(targetCamPos);
      const lookTarget = this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      this.camera.lookAt(lookTarget);
    }

    // Update player flashlight position & target to look where the camera looks
    if (this.playerFlashlight) {
      if (this.isFlashlightOn) {
        this.playerFlashlight.visible = true;
        this.playerFlashlight.position.copy(this.camera.position);
        this.playerFlashlight.target.position.copy(this.camera.position).add(lookDir);
      } else {
        this.playerFlashlight.visible = false;
      }
    }

    // 4. Update Game Managers
    this.worldManager.update(time, delta);
    
    // Update NPCs & Stalker
    this.npcManager.update(time, delta, this.playerGroup.position, this.cameraYaw, (dmg) => {
      this.damagePlayer(dmg * delta);
    });

    // Check game over if Stalker catches player from behind
    if (this.npcManager.hunter) {
      const hunterPos = this.npcManager.hunter.mesh.position;
      const dist = this.playerGroup.position.distanceTo(hunterPos);
      if (dist < 1.05) {
        // Caught! Jump scare & Game Over
        this.changeState('GAMEOVER');
      }

      // Update screen threat pulse vignette
      const proximityVal = Math.max(0, 1.0 - (dist / 12.0)); // 0 to 1 scaling inside 12m
      const vignette = document.getElementById('danger-vignette');
      
      if (proximityVal > 0.05) {
        vignette.classList.add('danger');
        // Pulse opacity matching the danger
        const speed = 0.5 + proximityVal * 4.5;
        const opacity = proximityVal * 0.85;
        vignette.style.animationDuration = `${1.0 / speed}s`;
      } else {
        vignette.classList.remove('danger');
        vignette.style.boxShadow = 'inset 0 0 100px rgba(0, 0, 0, 1)';
      }
    } else {
      document.getElementById('danger-vignette').classList.remove('danger');
    }

    // Animate ghost meshes
    CharacterCustomizer.animateGhost(this.playerGroup, time);
    
    // Clear keyboard/mouse frame triggers
    input.clear();

    // 5. Render frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game Engine
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
