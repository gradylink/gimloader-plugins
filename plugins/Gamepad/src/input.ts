export let gamepad: Gamepad | null = navigator.getGamepads().length > 0
  ? navigator.getGamepads()[0]
  : null;

export const inputCooldown: { value: boolean } = { value: false };

export const initGamepad = () => {
  window.addEventListener("gamepadconnected", (e) => {
    gamepad = e.gamepad;
  });
};

export const updateGamepad = () => {
  gamepad = navigator.getGamepads()[gamepad!.index];
};

type PhaserKeyCode = typeof Phaser.Input.Keyboard.KeyCodes[
  keyof typeof Phaser.Input.Keyboard.KeyCodes
];

const phaserKeyMap: {
  up: PhaserKeyCode[];
  down: PhaserKeyCode[];
  left: PhaserKeyCode[];
  right: PhaserKeyCode[];
} = {
  up: [
    Phaser.Input.Keyboard.KeyCodes.UP,
    Phaser.Input.Keyboard.KeyCodes.W,
    Phaser.Input.Keyboard.KeyCodes.SPACE,
  ],
  down: [
    Phaser.Input.Keyboard.KeyCodes.DOWN,
    Phaser.Input.Keyboard.KeyCodes.S,
  ],
  left: [
    Phaser.Input.Keyboard.KeyCodes.LEFT,
    Phaser.Input.Keyboard.KeyCodes.A,
  ],
  right: [
    Phaser.Input.Keyboard.KeyCodes.RIGHT,
    Phaser.Input.Keyboard.KeyCodes.D,
  ],
};

export const keyInputDown = (
  direction: "up" | "down" | "left" | "right",
): boolean => {
  for (const keycode of phaserKeyMap[direction]) {
    if (api.stores.phaser.scene.inputManager.keyboard.heldKeys.has(keycode)) {
      return true;
    }
  }

  return false;
};
