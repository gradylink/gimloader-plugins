import { gamepad, getJoysickAxis } from "./input";

let leftTriggerWasPressed = false;

export const aimCursorUpdate = () => {
  const aimCursor = api.stores.phaser.scene.inputManager.aimCursor;

  if (gamepad !== null) {
    if (Math.abs(getJoysickAxis("look", "x")) > api.settings.deadzone) {
      aimCursor.x += getJoysickAxis("look", "x") * api.settings.lookSensitivity;
    }
    if (Math.abs(getJoysickAxis("look", "y")) > api.settings.deadzone) {
      aimCursor.y += getJoysickAxis("look", "y") * api.settings.lookSensitivity;
    }
  }
  aimCursor.aimCursor.x = aimCursor.x;
  aimCursor.aimCursor.y = aimCursor.y;

  api.stores.phaser.scene.input.mousePointer.x = aimCursor.x;
  api.stores.phaser.scene.input.mousePointer.y = aimCursor.y;

  aimCursor.aimCursor.alpha = 1;
  aimCursor.aimCursor.visible =
    aimCursor.scene.game.canvas.style.cursor == "none";

  aimCursor.aimCursorWorldPos = aimCursor.scene.cameraHelper.mainCamera
    .getWorldPoint(
      aimCursor.x ** aimCursor.scene.resizeManager.usedDpi,
      aimCursor.y ** aimCursor.scene.resizeManager.usedDpi,
    );

  const horizontalCenter = window.innerWidth *
    aimCursor.scene.resizeManager.usedDpi / 2;
  const verticalCenter = window.innerHeight *
    aimCursor.scene.resizeManager.usedDpi / 2;

  aimCursor.centerShiftX = horizontalCenter - aimCursor.x;
  aimCursor.centerShiftY = verticalCenter - aimCursor.y;

  if (gamepad === null) return;

  api.stores.phaser.scene.input.mousePointer.isDown =
    gamepad.buttons[7].pressed ||
    api.stores.phaser.scene.inputManager.mouse.isHoldingDown;

  // This should probably be moved somewhere else but I might handle dynamic terrain here so idk.
  if (
    gamepad.buttons[6].pressed &&
    !api.stores.me.inventory.interactiveSlots.get(
      api.stores.me.inventory.activeInteractiveSlot.toString(),
    )?.waiting
  ) {
    const devices = api.stores.phaser.scene.worldManager.devices;
    const body = api.stores.phaser.mainCharacter.body;

    const device = devices.interactives.findClosestInteractiveDevice(
      devices.devicesInView,
      body.x,
      body.y,
    );
    if (device) {
      if (api.plugins.isEnabled("InstantUse")) {
        device.interactiveZones.onInteraction?.();
      } else {
        // Couldn't find a better solution than this, preferably we'd find somewhere to preoperly hook in.
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    } else {
      api.net.send("CONSUME", {
        "x": Math.round(
          api.stores.phaser.mainCharacter.body.x * 0.015625 - 0.5,
        ),
        "y": Math.round(
          api.stores.phaser.mainCharacter.body.y * 0.015625 - 0.5,
        ),
      });
    }
  } else if (leftTriggerWasPressed) {
    document.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  leftTriggerWasPressed = gamepad.buttons[6].pressed;
};
