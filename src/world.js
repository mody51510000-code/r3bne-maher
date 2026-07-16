// -------------------------------------------------------------
// 3D House Generator & Collision Manager for "رعبني يا ماهر"
// Generates walls, floors, lights, and procedural furniture for 5 maps.
// -------------------------------------------------------------

window.WorldManager = class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.cellSize = 4; // 4 meters per cell
    this.gridWidth = 14;
    this.gridHeight = 14;
    this.level = 1;
    
    // 0 = walkable, 1 = wall, 2 = obstacle/furniture
    this.grid = [];
    
    this.flickeringLights = [];
    this.interactableProps = [];
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // Dark materials
    this.wallMaterial = new THREE.MeshStandardMaterial({ color: 0x181822, roughness: 0.9, metalness: 0.1 });
    this.floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0e0e15, roughness: 0.7, metalness: 0.1 });
    this.ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9 });
    this.furnitureMaterial = new THREE.MeshStandardMaterial({ color: 0x221710, roughness: 0.6, metalness: 0.1 });
  }

  generateMap(level) {
    this.level = level;

    // 1. Clear previous objects
    while (this.worldGroup.children.length > 0) {
      const obj = this.worldGroup.children[0];
      this.worldGroup.remove(obj);
    }
    this.flickeringLights = [];
    this.interactableProps = [];

    // 2. Select Grid Map Layout
    this.initializeGridForLevel(level);

    // 3. Generate Level Theme Materials & Environmental Settings
    this.setupThemeMaterials(level);

    // 4. Generate Ground & Ceiling
    const totalWidth = this.gridWidth * this.cellSize;
    const totalHeight = this.gridHeight * this.cellSize;

    const floorGeo = new THREE.PlaneGeometry(totalWidth, totalHeight);
    const floor = new THREE.Mesh(floorGeo, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(totalWidth / 2 - this.cellSize / 2, 0, totalHeight / 2 - this.cellSize / 2);
    floor.receiveShadow = true;
    this.worldGroup.add(floor);

    // No ceiling for cemetery (Level 5) to show spooky night sky, others have ceiling
    if (level < 5) {
      const ceilingGeo = new THREE.PlaneGeometry(totalWidth, totalHeight);
      const ceiling = new THREE.Mesh(ceilingGeo, this.ceilingMaterial);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(totalWidth / 2 - this.cellSize / 2, 3.0, totalHeight / 2 - this.cellSize / 2);
      this.worldGroup.add(ceiling);
    } else {
      // Cemetery: Spooky giant Moon in the distance
      const moonGeo = new THREE.SphereGeometry(2.5, 32, 32);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xddf0ff });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(totalWidth / 2, 18.0, -10.0);
      this.worldGroup.add(moon);

      const moonLight = new THREE.DirectionalLight(0x7799bb, 0.45);
      moonLight.position.set(totalWidth / 2, 25.0, -10.0);
      this.worldGroup.add(moonLight);
    }

    // 5. Generate walls and props
    const wallGeo = new THREE.BoxGeometry(this.cellSize, 3.0, this.cellSize);

    for (let z = 0; z < this.gridHeight; z++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (z >= this.grid.length || x >= this.grid[z].length) continue;
        const type = this.grid[z][x];
        const posX = x * this.cellSize;
        const posZ = z * this.cellSize;

        if (type === 1) {
          // Wall
          const wall = new THREE.Mesh(wallGeo, this.wallMaterial);
          wall.position.set(posX, 1.5, posZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.worldGroup.add(wall);
        } 
        else if (type === 2) {
          // Level-themed obstacles
          this.createThemeObstacle(level, posX, posZ);
        }
      }
    }

    // 6. Spawn Level Lighting
    this.spawnThemeLighting(level);
  }

  initializeGridForLevel(level) {
    // 5 different map structures
    if (level === 1) {
      // Normal House layout
      this.gridWidth = 14;
      this.gridHeight = 14;
      this.grid = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,2,0,0,1,0,2,2,0,0,2,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,0,1,1,1,1,0,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,1],
        [1,0,2,2,0,0,1,0,2,2,0,2,0,1],
        [1,0,0,2,0,0,0,0,2,0,0,2,0,1],
        [1,1,1,1,0,1,1,0,1,1,0,1,1,1],
        [1,0,0,0,0,1,0,0,0,1,0,0,0,1],
        [1,0,2,0,0,1,0,2,0,1,0,2,0,1],
        [1,0,2,0,0,0,0,2,0,0,0,2,0,1],
        [1,0,0,0,0,1,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    } 
    else if (level === 2) {
      // School layout (Hallways and Classrooms)
      this.gridWidth = 14;
      this.gridHeight = 14;
      this.grid = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,0,1,0,0,1],
        [1,0,2,2,0,0,0,2,2,0,0,0,2,1],
        [1,0,2,2,0,1,0,2,2,0,1,0,2,1],
        [1,1,1,1,0,1,1,1,1,0,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,0,1,1,1,1,0,1,1,1,1],
        [1,0,2,2,0,1,0,2,2,0,1,0,2,1],
        [1,0,2,2,0,0,0,2,2,0,0,0,2,1],
        [1,0,0,0,0,1,0,0,0,0,1,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    } 
    else if (level === 3) {
      // Haunted House layout (dense maze)
      this.gridWidth = 14;
      this.gridHeight = 14;
      this.grid = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,1],
        [1,0,2,2,1,0,1,0,1,1,2,2,0,1],
        [1,0,2,2,1,0,0,0,0,1,2,2,0,1],
        [1,1,0,1,1,1,0,1,1,1,1,0,1,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,0,1],
        [1,0,2,0,0,0,0,0,0,0,2,2,0,1],
        [1,0,2,1,1,1,0,1,1,1,2,2,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,0,1],
        [1,1,0,1,1,1,0,1,1,1,1,0,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    } 
    else if (level === 4) {
      // Palace (large chambers, throne hall)
      this.gridWidth = 14;
      this.gridHeight = 14;
      this.grid = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1,1,0,0,0,0,0,1],
        [1,0,2,2,0,0,0,0,0,0,2,2,0,1],
        [1,0,2,0,0,0,0,0,0,0,0,2,0,1],
        [1,0,0,0,1,1,0,0,1,1,0,0,0,1],
        [1,1,0,1,1,1,0,0,1,1,1,0,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,2,2,0,0,0,0,0,0,2,2,0,1],
        [1,0,2,2,0,1,1,1,1,0,2,2,0,1],
        [1,0,0,0,0,1,1,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    } 
    else {
      // Cemetery courtyard (open field for boss fight)
      this.gridWidth = 14;
      this.gridHeight = 14;
      this.grid = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,2,2,0,0,0,0,0,0,2,2,0,1],
        [1,0,2,2,0,0,0,0,0,0,2,2,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,2,2,0,0,0,0,0,0,2,2,0,1],
        [1,0,2,2,0,0,0,0,0,0,2,2,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
    }
  }

  setupThemeMaterials(level) {
    if (level === 1) {
      // House
      this.floorMaterial.color.setHex(0x1a120c); // Wood brown
      this.floorMaterial.roughness = 0.6;
      this.wallMaterial.color.setHex(0x2b2b3a); // Blue-grey wallpaper
    } 
    else if (level === 2) {
      // School
      this.floorMaterial.color.setHex(0x3a404a); // Light grey linoleum tiles
      this.floorMaterial.roughness = 0.4;
      this.wallMaterial.color.setHex(0x354a3e); // Classroom green paint
    } 
    else if (level === 3) {
      // Haunted House
      this.floorMaterial.color.setHex(0x100a0e); // Rotting dark purple
      this.floorMaterial.roughness = 0.95;
      this.wallMaterial.color.setHex(0x150022); // Deep dark violet
    } 
    else if (level === 4) {
      // Palace
      this.floorMaterial.color.setHex(0x660011); // Royal crimson red
      this.floorMaterial.roughness = 0.7;
      this.wallMaterial.color.setHex(0x554400); // Gold-veined wall
    } 
    else {
      // Cemetery
      this.floorMaterial.color.setHex(0x0a140d); // Dark moss/grass green
      this.floorMaterial.roughness = 0.99;
      // Cemetery walls look like stone fences
      this.wallMaterial.color.setHex(0x181a18); 
    }
  }

  createThemeObstacle(level, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    if (level === 1) {
      // House Furniture (Couch, Table, Bookcase)
      const type = Math.floor(Math.random() * 3);
      if (type === 0) {
        // Bookshelf
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.8), this.furnitureMaterial);
        shelf.position.y = 1.1;
        shelf.castShadow = true;
        group.add(shelf);
      } else if (type === 1) {
        // Table
        const table = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.2), this.furnitureMaterial);
        table.position.y = 0.75;
        table.castShadow = true;
        group.add(table);
      } else {
        // Sofa
        const sofaMat = new THREE.MeshStandardMaterial({ color: 0x331a1a, roughness: 0.9 });
        const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.0), sofaMat);
        sofa.position.y = 0.25;
        sofa.castShadow = true;
        group.add(sofa);
      }
    } 
    else if (level === 2) {
      // School Desk & Blackboard
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 1.0), this.furnitureMaterial);
      desk.position.y = 0.375;
      desk.castShadow = true;
      group.add(desk);

      // Blackboard prop
      const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x112211, roughness: 0.9 }));
      board.position.set(0, 1.6, 0.4);
      board.castShadow = true;
      group.add(board);
    } 
    else if (level === 3) {
      // Haunted Spooky Decays
      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.0), this.furnitureMaterial);
      chest.position.y = 0.5;
      chest.castShadow = true;
      group.add(chest);

      // Spooky statue base (Cylinder)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }));
      base.position.y = 0.6;
      base.castShadow = true;
      group.add(base);
    } 
    else if (level === 4) {
      // Palace Columns (Thick Pillars)
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3.0, 16), new THREE.MeshStandardMaterial({ color: 0x887722, roughness: 0.3, metalness: 0.8 }));
      column.position.y = 1.5;
      column.castShadow = true;
      column.receiveShadow = true;
      group.add(column);
      
      // Golden Throne
      const throneMat = new THREE.MeshStandardMaterial({ color: 0x990000, roughness: 0.5, metalness: 0.9 });
      const throne = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.0), throneMat);
      throne.position.set(0, 0.8, -0.2);
      throne.castShadow = true;
      group.add(throne);
    } 
    else {
      // Cemetery Tombstones (Stone Graves) & Dead trees
      const type = Math.floor(Math.random() * 2);
      const tombMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
      
      if (type === 0) {
        // Cross Headstone
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.25), tombMat);
        slab.position.y = 0.6;
        slab.castShadow = true;
        group.add(slab);
        
        // crossbar
        const cross = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.2), tombMat);
        cross.position.set(0, 0.9, 0.05);
        cross.castShadow = true;
        group.add(cross);
      } else {
        // Standard rounded grave marker
        const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16), tombMat);
        marker.position.y = 0.5;
        marker.rotation.x = Math.PI / 2; // lay flat-ish
        marker.castShadow = true;
        group.add(marker);
      }
    }

    this.worldGroup.add(group);
  }

  spawnThemeLighting(level) {
    if (level === 1) {
      // Flickering normal bulbs
      this.addFlickeringLight(3 * this.cellSize, 3 * this.cellSize, 0.4, 0xffeedd);
      this.addFlickeringLight(8 * this.cellSize, 6 * this.cellSize, 0.35, 0xffeedd);
      this.addFlickeringLight(1 * this.cellSize, 10 * this.cellSize, 0.4, 0xffeedd);
      this.addFlickeringLight(11 * this.cellSize, 11 * this.cellSize, 0.25, 0xffeedd);
      
      const houseLight = new THREE.AmbientLight(0x050510, 0.15);
      this.worldGroup.add(houseLight);
    } 
    else if (level === 2) {
      // Fluorescent cool white/blue tubes
      this.addFlickeringLight(2 * this.cellSize, 5 * this.cellSize, 0.6, 0xddeeff);
      this.addFlickeringLight(11 * this.cellSize, 5 * this.cellSize, 0.6, 0xddeeff);
      this.addFlickeringLight(6 * this.cellSize, 2 * this.cellSize, 0.45, 0xddeeff);
      this.addFlickeringLight(6 * this.cellSize, 11 * this.cellSize, 0.45, 0xddeeff);

      const schoolLight = new THREE.AmbientLight(0x0c0d12, 0.15);
      this.worldGroup.add(schoolLight);
    } 
    else if (level === 3) {
      // Haunted green/purple flickers
      this.addFlickeringLight(3 * this.cellSize, 2 * this.cellSize, 0.5, 0x33ff55); // neon green
      this.addFlickeringLight(10 * this.cellSize, 2 * this.cellSize, 0.5, 0xaa33ff); // purple
      this.addFlickeringLight(2 * this.cellSize, 8 * this.cellSize, 0.45, 0xaa33ff);
      this.addFlickeringLight(11 * this.cellSize, 9 * this.cellSize, 0.5, 0x33ff55);

      const hauntLight = new THREE.AmbientLight(0x08020a, 0.1);
      this.worldGroup.add(hauntLight);
    } 
    else if (level === 4) {
      // Luxurious golden warm lights
      this.addFlickeringLight(1 * this.cellSize, 1 * this.cellSize, 0.8, 0xffaa00);
      this.addFlickeringLight(12 * this.cellSize, 1 * this.cellSize, 0.8, 0xffaa00);
      this.addFlickeringLight(6 * this.cellSize, 6 * this.cellSize, 0.9, 0xffdd44); // Center chandelier
      this.addFlickeringLight(1 * this.cellSize, 11 * this.cellSize, 0.8, 0xffaa00);
      this.addFlickeringLight(12 * this.cellSize, 11 * this.cellSize, 0.8, 0xffaa00);

      const palaceLight = new THREE.AmbientLight(0x181205, 0.2);
      this.worldGroup.add(palaceLight);
    } 
    else {
      // Cemetery glowing will-o'-the-wisps (hovering cyan sparks)
      this.addFlickeringLight(2 * this.cellSize, 2 * this.cellSize, 0.35, 0x00ffcc);
      this.addFlickeringLight(11 * this.cellSize, 2 * this.cellSize, 0.35, 0x00ffcc);
      this.addFlickeringLight(1 * this.cellSize, 10 * this.cellSize, 0.35, 0x00ffcc);
      this.addFlickeringLight(11 * this.cellSize, 10 * this.cellSize, 0.35, 0x00ffcc);

      // Low moonlight ambient
      const moonAmb = new THREE.AmbientLight(0x101a2b, 0.22);
      this.worldGroup.add(moonAmb);
    }
  }

  addFlickeringLight(x, z, baseIntensity = 0.5, colorHex = 0xffeedd) {
    const lightGroup = new THREE.Group();
    lightGroup.position.set(x, 2.9, z);

    // Bulb model
    const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    lightGroup.add(bulb);

    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.15), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    socket.position.y = 0.1;
    lightGroup.add(socket);

    // Light source
    const pointLight = new THREE.PointLight(colorHex, baseIntensity, 12.0);
    pointLight.position.set(0, -0.2, 0);
    pointLight.castShadow = true;
    pointLight.shadow.bias = -0.002;
    pointLight.shadow.mapSize.width = 256;
    pointLight.shadow.mapSize.height = 256;
    lightGroup.add(pointLight);

    this.worldGroup.add(lightGroup);

    this.flickeringLights.push({
      light: pointLight,
      bulb: bulb,
      baseIntensity: baseIntensity,
      colorHex: colorHex,
      flickerTimer: 0
    });
  }

  update(time, delta) {
    // Animate lights flickering
    this.flickeringLights.forEach(item => {
      item.flickerTimer -= delta;
      if (item.flickerTimer <= 0) {
        const rand = Math.random();
        if (rand < 0.15) {
          // Sharp flicker off
          item.light.intensity = 0;
          item.bulb.material.color.setHex(0x111111);
          item.flickerTimer = Math.random() * 0.12 + 0.03;
        } 
        else if (rand < 0.3) {
          // Dim flicker
          item.light.intensity = item.baseIntensity * 0.3;
          item.bulb.material.color.setHex(0x554433);
          item.flickerTimer = Math.random() * 0.2;
        } 
        else {
          // Full light
          item.light.intensity = item.baseIntensity;
          item.bulb.material.color.setHex(item.colorHex);
          item.flickerTimer = Math.random() * 2.0 + 0.5;
        }
      }
    });
  }

  checkCollision(x, z, radius) {
    const gridX = Math.round(x / this.cellSize);
    const gridZ = Math.round(z / this.cellSize);

    // Out of bounds check
    if (gridX < 0 || gridX >= this.gridWidth || gridZ < 0 || gridZ >= this.gridHeight) {
      return true;
    }

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cz = gridZ + dz;
        const cx = gridX + dx;

        if (cx < 0 || cx >= this.gridWidth || cz < 0 || cz >= this.gridHeight) continue;

        const cellType = this.grid[cz][cx];
        if (cellType === 1 || cellType === 2) {
          const cellX = cx * this.cellSize;
          const cellZ = cz * this.cellSize;

          const minX = cellX - this.cellSize / 2;
          const maxX = cellX + this.cellSize / 2;
          const minZ = cellZ - this.cellSize / 2;
          const maxZ = cellZ + this.cellSize / 2;

          const closestX = Math.max(minX, Math.min(x, maxX));
          const closestZ = Math.max(minZ, Math.min(z, maxZ));

          const distX = x - closestX;
          const distZ = z - closestZ;
          const distanceSq = distX * distX + distZ * distZ;

          if (distanceSq < radius * radius) {
            return {
              collision: true,
              resolveX: distX === 0 ? 0 : (distX / Math.sqrt(distanceSq)) * (radius - Math.sqrt(distanceSq)),
              resolveZ: distZ === 0 ? 0 : (distZ / Math.sqrt(distanceSq)) * (radius - Math.sqrt(distanceSq)),
            };
          }
        }
      }
    }

    return { collision: false, resolveX: 0, resolveZ: 0 };
  }

  getRandomWalkablePosition() {
    const walkableCells = [];
    for (let z = 0; z < this.gridHeight; z++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[z] && this.grid[z][x] === 0) {
          walkableCells.push({ x, z });
        }
      }
    }

    if (walkableCells.length === 0) return new THREE.Vector3(0, 0, 0);

    const cell = walkableCells[Math.floor(Math.random() * walkableCells.length)];
    return new THREE.Vector3(cell.x * this.cellSize, 0, cell.z * this.cellSize);
  }
}
