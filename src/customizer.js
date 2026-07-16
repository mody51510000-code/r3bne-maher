// -------------------------------------------------------------
// Procedural Character Customizer for "رعبني يا ماهر"
// Builds Three.js meshes dynamically based on UI selections.
// -------------------------------------------------------------

window.CharacterCustomizer = class CharacterCustomizer {
  static createGhost(config) {
    const { shape, color, eyes, accessory } = config;
    const ghostGroup = new THREE.Group();
    ghostGroup.name = "player-ghost";

    // 1. Core Glowing Material
    const glowColor = new THREE.Color(color);
    
    // Ghost Body Material (Glowing neon border)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: glowColor,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: shape === 'spiky' // flat shading for blocky/spiky look
    });

    // 2. Build Body Shape
    let bodyMesh;
    const bodyGroup = new THREE.Group();
    bodyGroup.name = "body-group";
    ghostGroup.add(bodyGroup);

    // Head Sphere (Common to all shapes)
    const headGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const headMesh = new THREE.Mesh(headGeo, bodyMaterial);
    headMesh.position.y = 0.8;
    bodyGroup.add(headMesh);

    if (shape === 'blob') {
      // Floating smooth blob
      const torsoGeo = new THREE.CylinderGeometry(0.4, 0.1, 0.8, 32, 1, true);
      const torsoMesh = new THREE.Mesh(torsoGeo, bodyMaterial);
      torsoMesh.position.y = 0.4;
      bodyGroup.add(torsoMesh);

      // Add floating bottom ripples
      const rippleGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const rippleCount = 5;
      for (let i = 0; i < rippleCount; i++) {
        const ripple = new THREE.Mesh(rippleGeo, bodyMaterial);
        const angle = (i / rippleCount) * Math.PI * 2;
        ripple.position.x = Math.cos(angle) * 0.25;
        ripple.position.z = Math.sin(angle) * 0.25;
        ripple.position.y = 0.05;
        ripple.name = `ripple-${i}`; // to animate in loop
        bodyGroup.add(ripple);
      }
    } 
    else if (shape === 'spiky') {
      // Angular spiky phantom
      const torsoGeo = new THREE.ConeGeometry(0.4, 0.9, 6);
      const torsoMesh = new THREE.Mesh(torsoGeo, bodyMaterial);
      torsoMesh.position.y = 0.45;
      torsoMesh.rotation.y = Math.PI;
      bodyGroup.add(torsoMesh);

      // Add spikes pointing out from the back
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
      const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x050505,
        emissive: glowColor.clone().multiplyScalar(0.7),
        emissiveIntensity: 1.0,
      });

      const spikePositions = [
        { x: 0, y: 0.6, z: -0.3, rx: -0.5, ry: 0, rz: 0 },
        { x: -0.25, y: 0.5, z: -0.2, rx: -0.4, ry: 0.5, rz: 0.3 },
        { x: 0.25, y: 0.5, z: -0.2, rx: -0.4, ry: -0.5, rz: -0.3 },
        { x: 0, y: 0.3, z: -0.25, rx: -0.3, ry: 0, rz: 0 },
      ];

      spikePositions.forEach((pos, i) => {
        const spike = new THREE.Mesh(spikeGeo, spikeMaterial);
        spike.position.set(pos.x, pos.y, pos.z);
        spike.rotation.set(pos.rx, pos.ry, pos.rz);
        bodyGroup.add(spike);
      });
    } 
    else if (shape === 'demon') {
      // Bulkier demonic shadow
      const torsoGeo = new THREE.SphereGeometry(0.35, 16, 16);
      torsoGeo.scale(1.2, 1.5, 1.0);
      const torsoMesh = new THREE.Mesh(torsoGeo, bodyMaterial);
      torsoMesh.position.y = 0.4;
      bodyGroup.add(torsoMesh);

      // Demonic tail
      const tailGeo = new THREE.CylinderGeometry(0.08, 0.01, 0.5, 8);
      const tail = new THREE.Mesh(tailGeo, bodyMaterial);
      tail.position.set(0, 0.1, -0.3);
      tail.rotation.x = -1.0;
      bodyGroup.add(tail);

      // Devil wings/creepy ears
      const wingGeo = new THREE.ConeGeometry(0.12, 0.5, 4);
      const leftWing = new THREE.Mesh(wingGeo, bodyMaterial);
      leftWing.position.set(-0.35, 0.8, -0.1);
      leftWing.rotation.z = 1.2;
      leftWing.rotation.x = -0.3;
      bodyGroup.add(leftWing);

      const rightWing = leftWing.clone();
      rightWing.position.x = 0.35;
      rightWing.rotation.z = -1.2;
      bodyGroup.add(rightWing);
    }

    // 3. Build Eyes
    const eyeGroup = new THREE.Group();
    eyeGroup.name = "eye-group";
    ghostGroup.add(eyeGroup);

    const eyeGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    if (eyes === 'two-glow') {
      // Two small glowing eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 16, 16);
      
      const leftEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
      leftEye.position.set(0.15, 0.85, 0.3);
      eyeGroup.add(leftEye);

      const rightEye = leftEye.clone();
      rightEye.position.x = -0.15;
      eyeGroup.add(rightEye);
    } 
    else if (eyes === 'cyclops') {
      // One large glowing eye in center
      const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeGlowMat);
      eye.position.set(0, 0.85, 0.32);
      eyeGroup.add(eye);
    } 
    else if (eyes === 'hollow') {
      // Dark hollow eye sockets
      const socketGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const socketMat = new THREE.MeshStandardMaterial({
        color: 0x010101,
        roughness: 0.9,
        metalness: 0.0
      });
      
      const leftSocket = new THREE.Mesh(socketGeo, socketMat);
      leftSocket.position.set(0.15, 0.85, 0.3);
      eyeGroup.add(leftSocket);

      const rightSocket = leftSocket.clone();
      rightSocket.position.x = -0.15;
      eyeGroup.add(rightSocket);
    }

    // 4. Build Accessories
    if (accessory === 'horns') {
      // Horns geometry (Cylinder/Cone)
      const hornGeo = new THREE.ConeGeometry(0.08, 0.3, 16);
      const hornMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
      });

      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(0.25, 1.1, 0.1);
      leftHorn.rotation.z = -0.4;
      leftHorn.rotation.x = -0.2;
      ghostGroup.add(leftHorn);

      const rightHorn = leftHorn.clone();
      rightHorn.position.x = -0.25;
      rightHorn.rotation.z = 0.4;
      ghostGroup.add(rightHorn);
    } 
    else if (accessory === 'halo') {
      // Golden Halo floating on top
      const haloGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffdd44
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, 1.25, 0);
      halo.rotation.x = Math.PI / 2;
      halo.name = "halo";
      ghostGroup.add(halo);

      // Light glow from halo
      const haloLight = new THREE.PointLight(0xffdd44, 1.0, 1.5);
      haloLight.position.set(0, 1.3, 0);
      ghostGroup.add(haloLight);
    }

    // Add a local PointLight inside the player to illuminate surroundings
    const playerLight = new THREE.PointLight(glowColor, 2.5, 4.5);
    playerLight.position.set(0, 0.8, 0);
    playerLight.castShadow = true;
    playerLight.shadow.bias = -0.002;
    playerLight.shadow.mapSize.width = 512;
    playerLight.shadow.mapSize.height = 512;
    ghostGroup.add(playerLight);

    return ghostGroup;
  }

  // Animation ticks inside the game loop
  static animateGhost(ghost, time) {
    const bodyGroup = ghost.getObjectByName("body-group");
    const halo = ghost.getObjectByName("halo");

    if (bodyGroup) {
      // Floating up and down
      bodyGroup.position.y = Math.sin(time * 2.5) * 0.06;
      // Gentle bobbing tilt
      bodyGroup.rotation.z = Math.sin(time * 1.5) * 0.03;
      bodyGroup.rotation.x = Math.cos(time * 1.5) * 0.03;

      // Animate ripples at the bottom (blob shape specific)
      for (let i = 0; i < 5; i++) {
        const ripple = bodyGroup.getObjectByName(`ripple-${i}`);
        if (ripple) {
          ripple.position.y = 0.05 + Math.sin(time * 4 + i) * 0.03;
        }
      }
    }

    if (halo) {
      // Bob and rotate
      halo.position.y = 1.25 + Math.sin(time * 2.5) * 0.04;
      halo.rotation.z += 0.01;
    }
  }
}
