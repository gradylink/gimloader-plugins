let gamepad: Gamepad | null = null;
let jumped = false;

const normalSpeed = 310;

api.settings.create([
  {
    type: "toggle",
    id: "preciseJoysticks",
    title: "Precise Joystick Inputs",
    description: "Using this invalidates speedruns.",
    default: true,
  },
  {
    type: "toggle",
    id: "keyboard",
    title: "Keyboard Input",
    default: true,
  },
  {
    type: "toggle",
    id: "joystickJump",
    title: "Jump With Joystick",
    default: false,
  },
  {
    type: "slider",
    id: "deadzone",
    title: "Joystick Deadzone",
    default: 0.5,
    min: 0.05,
    max: 0.95,
    step: 0.05,
  },
]);

const keys = new Set<string>();

window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

let originalGetPhysicsInput:
  | (() => {
    angle: number | null;
    jump: boolean;
    _jumpKeyPressed: boolean;
  })
  | null = null;

api.net.onLoad(() => {
  originalGetPhysicsInput =
    api.stores.phaser.scene.inputManager.getPhysicsInput;
  api.stores.phaser.scene.inputManager.getPhysicsInput = () => {
    let jumpPressed = (keys.has("KeyW") || keys.has("ArrowUp") ||
      keys.has("Space")) && api.settings.keyboard;
    let right = (keys.has("KeyD") || keys.has("ArrowRight")) &&
      api.settings.keyboard;
    let left = (keys.has("KeyA") || keys.has("ArrowLeft")) &&
      api.settings.keyboard;

    if (gamepad !== null) {
      gamepad = navigator.getGamepads()[gamepad.index];

      jumpPressed ||= gamepad?.buttons[0].pressed ||
        gamepad?.buttons[1].pressed || gamepad?.buttons[12].pressed ||
        (gamepad?.axes[1]! < -api.settings.deadzone &&
          api.settings.joystickJump);
      right ||= gamepad?.buttons[15].pressed ||
        gamepad?.axes[0]! > api.settings.deadzone;
      left ||= gamepad?.buttons[14].pressed ||
        gamepad?.axes[0]! < -api.settings.deadzone;

      if (api.stores.me.movementSpeed !== normalSpeed) {
        console.log(api.stores.me.movementSpeed);
      }

      if (
        Math.abs(gamepad?.axes[0]!) > api.settings.deadzone &&
        api.settings.preciseJoysticks
      ) {
        api.stores.me.movementSpeed = normalSpeed *
          Math.max(
            Math.abs(gamepad?.axes[0]!),
            api.plugins.isEnabled("Desynchronize")
              ? 0
              : 0.65, /* Slowest allowed speed based on my testing. */
          );
      } else {
        api.stores.me.movementSpeed = normalSpeed;
      }
    }

    const shouldJump = jumpPressed && !jumped;

    jumped = jumpPressed;

    // Generate Physics Stuff, Stolen from DLDTAS
    let physicsAngle: number | null = null;

    if (right && !left && !jumpPressed) physicsAngle = 0;
    else if (!right && left && !jumpPressed) physicsAngle = 180;
    else if (!right && !left && jumpPressed) physicsAngle = 270;
    else if (right && !left && jumpPressed) physicsAngle = 315;
    else if (
      (!right && left && jumpPressed) || (right && left && jumpPressed)
    ) physicsAngle = 225;

    return {
      angle: physicsAngle,
      jump: shouldJump,
      _jumpKeyPressed: jumpPressed,
    };
  };
});

api.onStop(() => {
  if (originalGetPhysicsInput !== null) {
    api.stores.phaser.scene.inputManager.getPhysicsInput =
      originalGetPhysicsInput;
  }
});

window.addEventListener("gamepadconnected", (e) => {
  gamepad = e.gamepad;
});
