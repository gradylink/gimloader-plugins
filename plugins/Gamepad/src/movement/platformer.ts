import { gamepad, getJoysickAxis, isMappingDown } from "../input";

const normalSpeed = 310;

let previousFrame = {
  left: false,
  right: false,
  jump: false,
};

export const handlePlatformerInput = () => {
  if (gamepad === null) return;

  const left = isMappingDown(api.settings.left) ||
    getJoysickAxis("move", "x") < -api.settings.deadzone;
  const right = isMappingDown(api.settings.right) ||
    getJoysickAxis("move", "x") > api.settings.deadzone;
  const jump = isMappingDown(api.settings.jump) ||
    (getJoysickAxis("move", "y") < -api.settings.deadzone &&
      api.settings.joystickJump);

  if (!previousFrame.left && left) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.add(
      Phaser.Input.Keyboard.KeyCodes.LEFT,
    );
  } else if (previousFrame.left && !left) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.delete(
      Phaser.Input.Keyboard.KeyCodes.LEFT,
    );
  }

  if (!previousFrame.right && right) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.add(
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    );
  } else if (previousFrame.right && !right) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.delete(
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    );
  }

  if (!previousFrame.jump && jump) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.add(
      Phaser.Input.Keyboard.KeyCodes.UP,
    );
  } else if (previousFrame.jump && !jump) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.delete(
      Phaser.Input.Keyboard.KeyCodes.UP,
    );
  }

  if (
    gamepad.axes[0] > api.settings.deadzone && api.settings.precisePlatformer
  ) {
    api.stores.me.movementSpeed = normalSpeed *
      Math.max(
        gamepad.axes[0],
        api.plugins.isEnabled("Desynchronize")
          ? 0
          : 0.65, /* Slowest allowed speed based on my testing. */
      );
  } else {
    api.stores.me.movementSpeed = normalSpeed;
  }

  previousFrame.left = left;
  previousFrame.right = right;
  previousFrame.jump = jump;
};
