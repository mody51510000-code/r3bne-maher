// -------------------------------------------------------------
// NPC and Stalker AI Manager for "رعبني يا ماهر"
// Manages Prey Humans, Stalking Hunters, and Giant Level 5 Boss.
// -------------------------------------------------------------

window.NPCManager = class NPCManager {
  constructor(scene, worldManager) {
    this.scene = scene;
    this.worldManager = worldManager;
    this.npcs = [];
    this.hunter = null;
    this.boss = null;
    
    this.threatRadarDot = document.getElementById('radar-threat-dot');
    this.radarText = document.getElementById('radar-text');
    this.radarGlow = document.getElementById('danger-radar-glow');

    // Boss HUD references
    this.bossHUD = document.getElementById('boss-hud');
    this.bossHealthBarFill = document.getElementById('boss-health-bar-fill');
    this.bossHealthVal = document.getElementById('boss-health-val');

    // Materials
    this.humanMat = new THREE.MeshStandardMaterial({ color: 0xddaa88, roughness: 0.8 });
    this.shirtColors = [0x3388ff, 0xff8833, 0xaa33ff, 0x33aa33];
    this.pantsMat = new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.9 });
    
    this.flashlightBeamMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.bossLaserMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }

  // Spawns human NPCs or the Boss based on level
  spawnNPCs(level) {
    // Clear existing NPCs
    this.npcs.forEach(npc => {
      this.scene.remove(npc.mesh);
    });
    this.npcs = [];

    if (this.hunter) {
      this.scene.remove(this.hunter.mesh);
      this.hunter = null;
    }

    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.boss = null;
    }

    // Hide Boss HUD by default
    this.bossHUD.classList.add('hidden');

    if (level < 5) {
      // Standard NPC Spawns (Level 1-4)
      // Level 1: 4 normal humans
      // Level 2: 6 humans (2 defenders)
      // Level 3: 8 humans (3 defenders, plus Hunter stalker)
      // Level 4: 10 humans (5 defenders, plus Hunter stalker)
      const npcCount = 3 + level * 2;
      let defenderLimit = 0;
      if (level === 2) defenderLimit = 2;
      if (level === 3) defenderLimit = 3;
      if (level === 4) defenderLimit = 5;

      for (let i = 0; i < npcCount; i++) {
        const pos = this.worldManager.getRandomWalkablePosition();
        pos.y = 0;

        const isDefender = i < defenderLimit;
        const npc = this.createHumanMesh(isDefender, i);
        npc.position.copy(pos);
        this.scene.add(npc);

        const originalColor = isDefender ? 0x334433 : this.shirtColors[i % this.shirtColors.length];
        this.npcs.push({
          mesh: npc,
          isDefender: isDefender,
          state: 'WANDERING',
          speed: 1.4 + (Math.random() * 0.3),
          targetPos: pos.clone(),
          wanderTimer: 0,
          scareTimer: 0,
          height: 1.6,
          radius: 0.35,
          direction: new THREE.Vector3(1, 0, 0),
          patrolAngle: 0,
          originalColor: originalColor
        });
      }

      // Spawn Ghost Hunter stalker in Level 3 and 4
      if (level >= 3) {
        this.spawnGhostHunter();
      }
    } 
    else {
      // Level 5: Boss Fight in the Cemetery
      this.spawnBoss();
    }
  }

  spawnGhostHunter() {
    const pos = this.worldManager.getRandomWalkablePosition();
    pos.y = 0;
    const mesh = this.createHunterMesh(1.0, 0x111115); // Normal scale
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.hunter = {
      mesh: mesh,
      speed: 1.9,
      radius: 0.4,
      direction: new THREE.Vector3(1, 0, 0),
    };
  }

  spawnBoss() {
    const pos = this.worldManager.getRandomWalkablePosition();
    pos.y = 0;

    // Boss is 1.6x larger with heavy metallic armor
    const mesh = this.createHunterMesh(1.6, 0x331111); 
    mesh.position.copy(pos);
    this.scene.add(mesh);

    // Give Boss a giant spotlight beam (Proton Sweeper)
    const spotlight = new THREE.SpotLight(0xff0044, 18.0, 16.0, Math.PI / 4, 0.4, 1.0);
    spotlight.position.set(0.4, 1.6, 0.6);
    spotlight.castShadow = true;
    
    const target = new THREE.Object3D();
    target.position.set(0.4, 1.6, 6.0);
    mesh.add(target);
    spotlight.target = target;
    mesh.add(spotlight);

    // Visible laser sweep cone
    const beamGeo = new THREE.ConeGeometry(5.0, 14.0, 16, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 7.0);
    const beam = new THREE.Mesh(beamGeo, this.bossLaserMat);
    beam.position.set(0.4, 1.6, 0.6);
    beam.name = "boss-laser-beam";
    mesh.add(beam);

    this.boss = {
      mesh: mesh,
      health: 100,
      speed: 2.3, // Moves aggressively
      radius: 0.8,
      direction: new THREE.Vector3(1, 0, 0),
      state: 'SEARCHING', // SEARCHING, CHASING, STUNNED
      stateTimer: 3.0,
      targetPos: pos.clone(),
      stunTimer: 0,
      laserAngle: 0,
      spotlight: spotlight,
      laserBeam: beam
    };

    // Show Boss HUD
    this.bossHUD.classList.remove('hidden');
    this.updateBossHUD();
  }

  updateBossHUD() {
    this.bossHealthBarFill.style.width = `${this.boss.health}%`;
    this.bossHealthVal.innerText = `${this.boss.health}%`;
  }

  createHumanMesh(isDefender, id) {
    const group = new THREE.Group();
    group.name = `human-${id}`;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), this.humanMat);
    head.position.y = 1.45;
    group.add(head);

    const shirtColor = this.shirtColors[id % this.shirtColors.length];
    const shirtMat = new THREE.MeshStandardMaterial({ color: isDefender ? 0x334433 : shirtColor, roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.6, 16), shirtMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.name = "torso-mesh";
    group.add(torso);

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8), this.pantsMat);
    leftLeg.position.set(-0.1, 0.375, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.1;
    group.add(rightLeg);

    if (isDefender) {
      const flashlight = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.3), new THREE.MeshStandardMaterial({ color: 0xaa8800, metalness: 0.8 }));
      flashlight.position.set(0.25, 1.0, 0.2);
      flashlight.rotation.x = Math.PI / 2;
      flashlight.name = "flashlight-prop";
      group.add(flashlight);

      const spotlight = new THREE.SpotLight(0xffffee, 8.0, 9.0, Math.PI / 6, 0.5, 1.0);
      spotlight.position.set(0.25, 1.0, 0.3);
      spotlight.castShadow = true;
      
      const target = new THREE.Object3D();
      target.position.set(0.25, 1.0, 4.0);
      group.add(target);
      spotlight.target = target;
      group.add(spotlight);

      const beamGeo = new THREE.ConeGeometry(1.8, 7.0, 16, 1, true);
      beamGeo.rotateX(Math.PI / 2);
      beamGeo.translate(0, 0, 3.5);
      const beam = new THREE.Mesh(beamGeo, this.flashlightBeamMat);
      beam.position.set(0.25, 1.0, 0.3);
      beam.name = "flashlight-beam";
      group.add(beam);
    }

    return group;
  }

  createHunterMesh(scale = 1.0, armorColor = 0x111115) {
    const group = new THREE.Group();
    group.scale.set(scale, scale, scale);

    const armorMat = new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.5, metalness: 0.9 });
    const visorMat = new THREE.MeshBasicMaterial({ color: scale > 1.2 ? 0xff00ff : 0xff3333 }); // Purple visor for boss

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), armorMat);
    head.position.y = 1.45;
    group.add(head);

    // Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.1), visorMat);
    visor.position.set(0, 1.48, 0.18);
    group.add(visor);

    // Heavy Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.65, 16), armorMat);
    torso.position.y = 1.025;
    torso.castShadow = true;
    group.add(torso);

    // Backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x330022, emissive: 0xaa0066, emissiveIntensity: 0.4 }));
    pack.position.set(0, 1.1, -0.22);
    group.add(pack);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8), armorMat);
    leftLeg.position.set(-0.12, 0.35, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.12;
    group.add(rightLeg);

    // Hose/Weapon
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    hose.position.set(0.25, 0.95, 0.3);
    hose.rotation.x = Math.PI / 2.2;
    group.add(hose);

    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1), visorMat);
    muzzle.position.set(0.25, 0.95, 0.55);
    muzzle.rotation.x = Math.PI / 2.2;
    group.add(muzzle);

    return group;
  }

  update(time, delta, playerPos, playerRotationY, onDamage) {
    this.updateNPCs(time, delta, playerPos, onDamage);
    this.updateHunter(delta, playerPos, playerRotationY);
    this.updateBoss(time, delta, playerPos, playerRotationY, onDamage);
  }

  updateNPCs(time, delta, playerPos, onDamage) {
    this.npcs.forEach(npc => {
      const distToPlayer = npc.mesh.position.distanceTo(playerPos);
      
      if (npc.state === 'SCARED') {
        npc.scareTimer -= delta;
        if (npc.scareTimer <= 0) {
          npc.state = 'WANDERING';
          npc.speed = 1.5;
          
          // Restore original shirt color
          const torso = npc.mesh.getObjectByName("torso-mesh");
          if (torso && torso.material) {
            torso.material.color.setHex(npc.originalColor);
          }
        } else {
          // Flee
          const fleeDir = new THREE.Vector3().subVectors(npc.mesh.position, playerPos);
          fleeDir.y = 0;
          fleeDir.normalize();
          
          npc.mesh.rotation.y = Math.atan2(fleeDir.x, fleeDir.z);
          
          const newPos = npc.mesh.position.clone().addScaledVector(fleeDir, npc.speed * delta);
          const collision = this.worldManager.checkCollision(newPos.x, newPos.z, npc.radius);
          if (!collision.collision) {
            npc.mesh.position.copy(newPos);
          } else {
            const perpendicular = new THREE.Vector3(-fleeDir.z, 0, fleeDir.x);
            npc.mesh.position.addScaledVector(perpendicular, npc.speed * delta);
          }
          return;
        }
      }

      if (npc.state === 'WANDERING') {
        if (npc.isDefender) {
          npc.patrolAngle = Math.sin(time * 1.8) * (Math.PI / 4.5);
          const beam = npc.mesh.getObjectByName("flashlight-beam");
          const prop = npc.mesh.getObjectByName("flashlight-prop");
          
          if (beam) beam.rotation.y = npc.patrolAngle;
          if (prop) prop.rotation.y = npc.patrolAngle;

          // Flashlight vision cone check
          if (distToPlayer < 7.5) {
            const beamForward = new THREE.Vector3(0, 0, 1).applyQuaternion(npc.mesh.quaternion);
            beamForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), npc.patrolAngle);
            
            const toPlayer = new THREE.Vector3().subVectors(playerPos, npc.mesh.position);
            toPlayer.y = 0;
            const dist = toPlayer.length();
            toPlayer.normalize();

            const dot = toPlayer.dot(beamForward);
            if (dot > Math.cos(Math.PI / 6.5) && dist < 6.8) {
              // Raycast
              let hitWall = false;
              const steps = 6;
              for (let step = 1; step <= steps; step++) {
                const checkPt = npc.mesh.position.clone().addScaledVector(toPlayer, (dist / steps) * step);
                const gridX = Math.round(checkPt.x / this.worldManager.cellSize);
                const gridZ = Math.round(checkPt.z / this.worldManager.cellSize);
                if (this.worldManager.grid[gridZ] && this.worldManager.grid[gridZ][gridX] === 1) {
                  hitWall = true;
                  break;
                }
              }

              if (!hitWall) {
                onDamage(delta * 22); // damage in light
                audio.playStun();
                const light = npc.mesh.children.find(child => child.isSpotLight);
                if (light) light.color.setHex(0xff3333);
                if (beam) beam.material.color.setHex(0xff3333);
              }
            } else {
              const light = npc.mesh.children.find(child => child.isSpotLight);
              if (light) light.color.setHex(0xffffee);
              if (beam) beam.material.color.setHex(0xffffee);
            }
          }
        }

        const distToTarget = npc.mesh.position.distanceTo(npc.targetPos);
        if (distToTarget < 0.2) {
          npc.wanderTimer -= delta;
          if (npc.wanderTimer <= 0) {
            const newTarget = this.worldManager.getRandomWalkablePosition();
            npc.targetPos.copy(newTarget);
            npc.wanderTimer = Math.random() * 3.5 + 1.0;
          }
        } else {
          const walkDir = new THREE.Vector3().subVectors(npc.targetPos, npc.mesh.position);
          walkDir.y = 0;
          walkDir.normalize();
          
          npc.mesh.rotation.y = Math.atan2(walkDir.x, walkDir.z);
          
          const nextPos = npc.mesh.position.clone().addScaledVector(walkDir, npc.speed * delta);
          const collision = this.worldManager.checkCollision(nextPos.x, nextPos.z, npc.radius);
          if (!collision.collision) {
            npc.mesh.position.copy(nextPos);
          } else {
            npc.targetPos.copy(npc.mesh.position);
            npc.wanderTimer = 0;
          }
        }
      }
    });
  }

  updateHunter(delta, playerPos, playerRotationY) {
    if (!this.hunter) {
      // only clear standard radar warning if Boss is not active
      if (!this.boss) {
        this.threatRadarDot.classList.add('hidden');
        this.radarText.innerText = "آمن";
        this.radarGlow.className = "radar-glow green";
        audio.updateDangerLevel(0);
      }
      return;
    }

    const distToPlayer = this.hunter.mesh.position.distanceTo(playerPos);
    
    // Track player
    const walkDir = new THREE.Vector3().subVectors(playerPos, this.hunter.mesh.position);
    walkDir.y = 0;
    walkDir.normalize();
    this.hunter.mesh.rotation.y = Math.atan2(walkDir.x, walkDir.z);
    
    const nextPos = this.hunter.mesh.position.clone().addScaledVector(walkDir, this.hunter.speed * delta);
    const collision = this.worldManager.checkCollision(nextPos.x, nextPos.z, this.hunter.radius);
    if (!collision.collision) {
      this.hunter.mesh.position.copy(nextPos);
    } else {
      this.hunter.mesh.position.addScaledVector(new THREE.Vector3(collision.resolveX, 0, collision.resolveZ), 1.0);
    }

    const playerForward = new THREE.Vector3(Math.sin(playerRotationY), 0, Math.cos(playerRotationY)).normalize();
    const playerBackward = playerForward.clone().negate();
    const toHunter = new THREE.Vector3().subVectors(this.hunter.mesh.position, playerPos);
    toHunter.y = 0;
    const distance = toHunter.length();
    toHunter.normalize();
    
    const behindFactor = Math.max(0, playerBackward.dot(toHunter));
    const rawDanger = Math.max(0, 1.0 - (distance / 16.0));
    const totalDanger = rawDanger * (0.3 + 0.7 * behindFactor);
    audio.updateDangerLevel(totalDanger);

    this.updateRadarUI(distance, toHunter, playerRotationY, rawDanger);
  }

  updateBoss(time, delta, playerPos, playerRotationY, onDamage) {
    if (!this.boss) return;

    // 1. Process STUNNED state
    if (this.boss.state === 'STUNNED') {
      this.boss.stunTimer -= delta;
      
      // Make mesh flash red/white visually
      const factor = Math.sin(time * 30) * 0.5 + 0.5;
      this.boss.mesh.children.forEach(child => {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(factor, 0, 0);
          child.material.emissiveIntensity = 2.0;
        }
      });

      if (this.boss.stunTimer <= 0) {
        this.boss.state = 'SEARCHING';
        this.boss.stateTimer = 4.0;
        // Restore standard colors
        this.boss.mesh.children.forEach(child => {
          if (child.material && child.material.emissive) {
            child.material.emissive.setRGB(0.66, 0, 0.4);
            child.material.emissiveIntensity = 0.4;
          }
        });
      }
      
      // Stand still, no movement
      this.updateBossRadarWarning(playerPos, playerRotationY);
      return;
    }

    // 2. SEARCHING State (wandering and sweeping laser)
    const distToPlayer = this.boss.mesh.position.distanceTo(playerPos);
    
    // Sweep the giant laser beam left-right
    this.boss.laserAngle = Math.sin(time * 2.8) * (Math.PI / 4); // 45 degree sweep
    if (this.boss.laserBeam) this.boss.laserBeam.rotation.y = this.boss.laserAngle;
    if (this.boss.spotlight) {
      // Modify target offset
      const localTarget = this.boss.mesh.getObjectByName("flashlight-prop") || this.boss.mesh.children[0];
      const targetLocalPos = new THREE.Vector3(
        0.4 + Math.sin(this.boss.laserAngle) * 6.0,
        1.6,
        6.0
      );
    }

    // AI navigation logic
    this.boss.stateTimer -= delta;
    if (this.boss.stateTimer <= 0) {
      if (distToPlayer < 12.0) {
        // Agro Chase
        this.boss.state = 'CHASING';
        this.boss.stateTimer = 5.0;
      } else {
        // Pick new random spot in cemetery
        this.boss.targetPos.copy(this.worldManager.getRandomWalkablePosition());
        this.boss.stateTimer = Math.random() * 5.0 + 2.0;
      }
    }

    let currentSpeed = this.boss.speed;
    let targetMove = this.boss.targetPos;

    if (this.boss.state === 'CHASING') {
      currentSpeed = this.boss.speed * 1.35; // Run faster during chase!
      targetMove = playerPos;
    }

    const walkDir = new THREE.Vector3().subVectors(targetMove, this.boss.mesh.position);
    walkDir.y = 0;
    walkDir.normalize();
    
    this.boss.mesh.rotation.y = Math.atan2(walkDir.x, walkDir.z);
    
    const nextPos = this.boss.mesh.position.clone().addScaledVector(walkDir, currentSpeed * delta);
    const collision = this.worldManager.checkCollision(nextPos.x, nextPos.z, this.boss.radius);
    if (!collision.collision) {
      this.boss.mesh.position.copy(nextPos);
    } else {
      this.boss.mesh.position.addScaledVector(new THREE.Vector3(collision.resolveX, 0, collision.resolveZ), 1.0);
    }

    // 3. Laser intersection check (Proton Sweeper hits player)
    if (distToPlayer < 12.0) {
      const beamForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.boss.mesh.quaternion);
      beamForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.boss.laserAngle);
      
      const toPlayer = new THREE.Vector3().subVectors(playerPos, this.boss.mesh.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      toPlayer.normalize();

      const dot = toPlayer.dot(beamForward);
      // Sweeper hits in 30 degree cone (cos(30) = 0.866)
      if (dot > Math.cos(Math.PI / 6.0) && dist < 11.5) {
        // Quick raycast
        let hitWall = false;
        const steps = 6;
        for (let step = 1; step <= steps; step++) {
          const checkPt = this.boss.mesh.position.clone().addScaledVector(toPlayer, (dist / steps) * step);
          const gridX = Math.round(checkPt.x / this.worldManager.cellSize);
          const gridZ = Math.round(checkPt.z / this.worldManager.cellSize);
          if (this.worldManager.grid[gridZ] && this.worldManager.grid[gridZ][gridX] === 1) {
            hitWall = true;
            break;
          }
        }

        if (!hitWall) {
          // Proton Sweeper deals HUGE damage! 60% per second!
          onDamage(delta * 55); 
          audio.playStun();
        }
      }
    }

    // 4. Update warning and proximity audio
    this.updateBossRadarWarning(playerPos, playerRotationY);
  }

  updateBossRadarWarning(playerPos, playerRotationY) {
    const toBoss = new THREE.Vector3().subVectors(this.boss.mesh.position, playerPos);
    toBoss.y = 0;
    const distance = toBoss.length();
    toBoss.normalize();

    const playerForward = new THREE.Vector3(Math.sin(playerRotationY), 0, Math.cos(playerRotationY)).normalize();
    const playerBackward = playerForward.clone().negate();
    
    const behindFactor = Math.max(0, playerBackward.dot(toBoss));
    const rawDanger = Math.max(0, 1.0 - (distance / 16.0));
    
    // Boss counts as high danger!
    const totalDanger = rawDanger * (0.2 + 0.8 * behindFactor);
    audio.updateDangerLevel(totalDanger);

    this.updateRadarUI(distance, toBoss, playerRotationY, rawDanger);
  }

  updateRadarUI(distance, toThreat, playerRotationY, rawDanger) {
    if (distance > 16.0) {
      this.threatRadarDot.classList.add('hidden');
      this.radarText.innerText = "آمن";
      this.radarGlow.className = "radar-glow green";
      return;
    }

    this.threatRadarDot.classList.remove('hidden');

    const angleToThreat = Math.atan2(toThreat.x, toThreat.z);
    const relativeAngle = angleToThreat - playerRotationY + Math.PI; 
    const normalizedDistance = (distance / 16.0) * 45; 
    
    const dotX = 50 + Math.sin(relativeAngle) * normalizedDistance;
    const dotY = 50 - Math.cos(relativeAngle) * normalizedDistance;
    
    this.threatRadarDot.setAttribute('cx', dotX);
    this.threatRadarDot.setAttribute('cy', dotY);

    if (distance > 8.0) {
      this.radarText.innerText = "يقترب";
      this.radarGlow.className = "radar-glow yellow";
    } else {
      this.radarText.innerText = "خطر!";
      this.radarGlow.className = "radar-glow red-pulse";
    }
  }

  // Check if player scares any nearby humans (or hits the Boss from behind!)
  scareNearbyHumans(playerPos, scareRadius, cameraYaw) {
    // If Boss is active (Level 5)
    if (this.boss) {
      const dist = this.boss.mesh.position.distanceTo(playerPos);
      if (dist < scareRadius && this.boss.state !== 'STUNNED') {
        
        // We must check if player is BEHIND the boss.
        // Boss forward vector:
        const bossForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.boss.mesh.quaternion).normalize();
        
        // Vector pointing from boss to player
        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.boss.mesh.position);
        toPlayer.y = 0;
        toPlayer.normalize();

        // Dot product: if negative, player is behind the boss!
        // bossForward dot toPlayer < -0.3 (allows a wide 120-degree angle from behind)
        const dot = bossForward.dot(toPlayer);

        if (dot < -0.2) {
          // Success! Boss is hit from behind!
          this.boss.health -= 20;
          this.updateBossHUD();

          // Flash HUD red/white shake
          this.bossHUD.classList.add('shaking');
          setTimeout(() => this.bossHUD.classList.remove('shaking'), 800);

          if (this.boss.health <= 0) {
            // Boss defeated!
            this.scene.remove(this.boss.mesh);
            this.boss = null;
            this.bossHUD.classList.add('hidden');
            audio.playLevelUp();
            return 999; // code to trigger Victory
          } else {
            // Stun boss
            this.boss.state = 'STUNNED';
            this.boss.stunTimer = 1.5; // Stun for 1.5s
            audio.playScare();
            
            // Show alert
            const alertEl = document.getElementById('screen-alert');
            alertEl.innerText = "💥 أصبت الزعيم من الخلف!";
            alertEl.classList.add('show');
            setTimeout(() => alertEl.classList.remove('show'), 1500);

            return 0; // successfully hit but not dead
          }
        } else {
          // Player tried to scare boss from front! Shielded or caught!
          // Boss sweeps quickly to capture player
          audio.playStun();
          return -1; // Failed scare
        }
      }
      return 0;
    }

    // Normal humans scare logic (Level 1-4)
    let scaredCount = 0;
    
    this.npcs.forEach(npc => {
      if (npc.state !== 'SCARED') {
        const dist = npc.mesh.position.distanceTo(playerPos);
        if (dist < scareRadius) {
          npc.state = 'SCARED';
          npc.speed = 3.8;
          npc.scareTimer = 4.0;
          
          scaredCount++;
          audio.playScare();
          
          // Flash torso to red/pink
          const torso = npc.mesh.getObjectByName("torso-mesh");
          if (torso && torso.material) {
            torso.material.color.setHex(0xff0044);
          }
        }
      }
    });

    return scaredCount;
  }
}
