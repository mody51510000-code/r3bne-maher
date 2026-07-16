// -------------------------------------------------------------
// Input Controller for "رعبني يا ماهر"
// Manages Keyboard, Mouse Look, and Touch Joystick/Swipe for mobile.
// -------------------------------------------------------------

class InputController {
  constructor() {
    this.keys = {};
    
    // Mouse movement
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.sensitivity = 0.002;
    this.isPointerLocked = false;

    // Mobile inputs
    this.isMobile = false;
    this.joystickActive = false;
    this.joystickStart = { x: 0, y: 0 };
    this.joystickValue = { x: 0, y: 0 }; // Values between -1 and 1
    this.joystickMaxDist = 45; // Max radius in pixels
    
    // Touch swipe controls (right side of screen)
    this.lookTouchId = null;
    this.lookTouchLast = { x: 0, y: 0 };
    this.touchSensitivity = 0.006;
    
    // Action flags
    this.scareTriggered = false;
    this.dashTriggered = false;
    this.flashlightTriggered = false;
    this.cameraToggleTriggered = false;

    this.init();
  }

  init() {
    // 1. Detect if mobile/touch device
    this.detectDevice();

    // 2. Keyboard listeners
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      // Prevent browser scrolling on space/arrows
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      
      // Triggers
      if (e.code === 'Space') {
        this.scareTriggered = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.dashTriggered = true;
      }
      if (e.code === 'KeyF') {
        this.flashlightTriggered = true;
      }
      if (e.code === 'KeyV') {
        this.cameraToggleTriggered = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 3. Mouse Lock & Listeners (PC)
    const canvas = document.getElementById('game-canvas');
    
    canvas.addEventListener('click', () => {
      if (!this.isMobile && !this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    // 4. Mobile Controls setup
    if (this.isMobile) {
      this.setupMobileControls();
    }
  }

  detectDevice() {
    const ua = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIPad = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
    
    this.isMobile = isMobileUA || isIPad;
    const mobileUI = document.getElementById('mobile-controls');
    if (mobileUI) {
      mobileUI.style.display = this.isMobile ? 'flex' : 'none';
    }
  }

  setupMobileControls() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const btnScare = document.getElementById('btn-mobile-scare');
    const btnDash = document.getElementById('btn-mobile-dash');
    const btnFlashlight = document.getElementById('btn-mobile-flashlight');

    // Action button listeners
    btnScare.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.scareTriggered = true;
    });
    
    btnDash.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.dashTriggered = true;
    });

    if (btnFlashlight) {
      btnFlashlight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.flashlightTriggered = true;
      });
    }

    // Virtual Joystick listeners
    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.targetTouches[0];
      const rect = joystickZone.getBoundingClientRect();
      // Center of the joystick base
      this.joystickStart.x = rect.left + rect.width / 2;
      this.joystickStart.y = rect.top + rect.height / 2;
      this.joystickActive = true;
      
      this.updateJoystick(touch.clientX, touch.clientY, joystickKnob);
    });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;
      const touch = e.targetTouches[0];
      this.updateJoystick(touch.clientX, touch.clientY, joystickKnob);
    });

    const resetJoystick = (e) => {
      if (e) e.preventDefault();
      this.joystickActive = false;
      this.joystickValue.x = 0;
      this.joystickValue.y = 0;
      joystickKnob.style.transform = 'translate(0px, 0px)';
    };

    joystickZone.addEventListener('touchend', resetJoystick);
    joystickZone.addEventListener('touchcancel', resetJoystick);

    // Camera swipe look (listen on full document but filter to right side or non-joystick areas)
    document.addEventListener('touchstart', (e) => {
      if (this.lookTouchId !== null) return;
      
      // Find a touch that is NOT inside the joystick zone and NOT on buttons
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        // Check if touch is on joystick or action buttons
        if (joystickZone.contains(touch.target) || 
            btnScare.contains(touch.target) || 
            btnDash.contains(touch.target) ||
            (btnFlashlight && btnFlashlight.contains(touch.target))) {
          continue;
        }

        // Target found! Use it for camera look
        this.lookTouchId = touch.identifier;
        this.lookTouchLast.x = touch.clientX;
        this.lookTouchLast.y = touch.clientY;
        break;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (this.lookTouchId === null) return;
      
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === this.lookTouchId) {
          const dx = touch.clientX - this.lookTouchLast.x;
          const dy = touch.clientY - this.lookTouchLast.y;
          
          this.mouseDeltaX += dx * 0.4; // Scale swipe movements
          this.mouseDeltaY += dy * 0.4;
          
          this.lookTouchLast.x = touch.clientX;
          this.lookTouchLast.y = touch.clientY;
          break;
        }
      }
    });

    const endLookTouch = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.lookTouchId) {
          this.lookTouchId = null;
          break;
        }
      }
    };

    document.addEventListener('touchend', endLookTouch);
    document.addEventListener('touchcancel', endLookTouch);
  }

  updateJoystick(clientX, clientY, knobEl) {
    let dx = clientX - this.joystickStart.x;
    let dy = clientY - this.joystickStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.joystickMaxDist) {
      dx = (dx / distance) * this.joystickMaxDist;
      dy = (dy / distance) * this.joystickMaxDist;
    }

    knobEl.style.transform = `translate(${dx}px, ${dy}px)`;

    // Calculate normalized values (-1 to 1)
    this.joystickValue.x = dx / this.joystickMaxDist;
    this.joystickValue.y = dy / this.joystickMaxDist;
  }

  // Called at the end of the frame to reset frame-based triggers
  clear() {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.scareTriggered = false;
    this.dashTriggered = false;
    this.flashlightTriggered = false;
    this.cameraToggleTriggered = false;
  }

  // Get movement direction
  getMovement() {
    let x = 0;
    let z = 0;

    if (this.isMobile) {
      x = this.joystickValue.x;
      z = this.joystickValue.y; // positive is forward, negative is back relative to screen y coordinate
    } else {
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) x = -1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) x = 1;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) z = -1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) z = 1;
      
      // Normalize vector
      if (x !== 0 && z !== 0) {
        const length = Math.sqrt(x * x + z * z);
        x /= length;
        z /= length;
      }
    }

    return { x, z };
  }
}

window.input = new InputController();
