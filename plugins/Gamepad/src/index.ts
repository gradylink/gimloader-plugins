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

const getMagnitude = () => {
  if (gamepad === null) return 0;
  if (api.stores.session.mapStyle == "platformer") {
    return Math.abs(gamepad.axes[0]);
  }
  return Math.sqrt(gamepad.axes[0] ** 2 + gamepad.axes[1] ** 2);
};

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
    let down = (keys.has("KeyS") || keys.has("ArrowDown")) &&
      api.settings.keyboard && api.stores.session.mapStyle == "topDown";

    if (gamepad !== null) {
      gamepad = navigator.getGamepads()[gamepad.index];

      jumpPressed ||= ((gamepad?.buttons[0].pressed ||
        gamepad?.buttons[1].pressed) &&
        api.stores.session.mapStyle == "platformer") ||
        gamepad?.buttons[12].pressed ||
        (gamepad?.axes[1]! < -api.settings.deadzone &&
          (api.settings.joystickJump ||
            api.stores.session.mapStyle == "topDown"));
      right ||= gamepad?.buttons[15].pressed ||
        gamepad?.axes[0]! > api.settings.deadzone;
      left ||= gamepad?.buttons[14].pressed ||
        gamepad?.axes[0]! < -api.settings.deadzone;
      down ||= (gamepad?.buttons[13].pressed ||
        gamepad?.axes[1]! > api.settings.deadzone) &&
        api.stores.session.mapStyle == "topDown";

      if (
        getMagnitude() > api.settings.deadzone &&
        api.settings.preciseJoysticks
      ) {
        api.stores.me.movementSpeed = normalSpeed *
          Math.max(
            getMagnitude(),
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

    if (left && right && (jumpPressed || down)) {
      left = true;
      right = false;
      jumpPressed = true;
      down = false;
    }

    if (
      api.stores.session.mapStyle === "topDown" && gamepad !== null &&
      getMagnitude() > api.settings.deadzone &&
      api.settings.preciseJoysticks
    ) {
      physicsAngle =
        (Math.atan2(gamepad.axes[1], gamepad.axes[0]) * 180 / Math.PI +
          360) %
        360;
    } else if (
      (down || jumpPressed || left || right) && !(left && right) &&
      !(down && jumpPressed)
    ) {
      physicsAngle =
        (Math.atan2(+down - +jumpPressed, +right - +left) * 180 / Math.PI +
          360) % 360;
    }

    return {
      angle: physicsAngle,
      jump: api.stores.session.mapStyle == "platformer" ? shouldJump : false,
      _jumpKeyPressed: api.stores.session.mapStyle == "platformer"
        ? jumpPressed
        : false,
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
