import { gamepad, inputCooldown, keyInputDown } from "../input";

const getMagnitude = () => {
  if (gamepad === null) return 0;
  if (api.stores.session.mapStyle == "platformer") {
    return Math.abs(gamepad.axes[0]);
  }
  return Math.sqrt(gamepad.axes[0] ** 2 + gamepad.axes[1] ** 2);
};

let jumped = false;

const normalSpeed = 310;

export const getPhysicsInput = (): Gimloader.Stores.TickInput => {
  let jumpPressed = keyInputDown("up") && api.settings.keyboard;
  let right = keyInputDown("right") && api.settings.keyboard;
  let left = keyInputDown("left") && api.settings.keyboard;
  let down = keyInputDown("down") && api.settings.keyboard &&
    api.stores.session.mapStyle == "topDown";

  if (gamepad !== null) {
    if (gamepad?.buttons[3].pressed) {
      api.stores.phaser.scene.worldManager.devices.allDevices.find((d) =>
        d.state.text === "Answer Questions"
      )?.buttonClicked();
    } else if (gamepad?.buttons[8].pressed) {
      (document.querySelector('[aria-label="Leaderboard"]') as HTMLDivElement)
        .click();
    }

    if (!inputCooldown) {
      if (gamepad?.buttons[4].pressed) {
        api.stores.me.inventory.activeInteractiveSlot--;
        if (api.stores.me.inventory.activeInteractiveSlot < 0) {
          api.stores.me.inventory.activeInteractiveSlot =
            api.stores.me.inventory.slots.size - 1;
        }

        api.net.send("SET_ACTIVE_INTERACTIVE_ITEM", {
          slotNum: api.stores.me.inventory.activeInteractiveSlot,
        });

        inputCooldown.value = true;
        setTimeout(() => inputCooldown.value = false, 200);
      } else if (gamepad?.buttons[5].pressed) {
        api.stores.me.inventory.activeInteractiveSlot++;
        if (
          api.stores.me.inventory.activeInteractiveSlot >=
            api.stores.me.inventory.slots.size
        ) {
          api.stores.me.inventory.activeInteractiveSlot = 0;
        }

        api.net.send("SET_ACTIVE_INTERACTIVE_ITEM", {
          slotNum: api.stores.me.inventory.activeInteractiveSlot,
        });

        inputCooldown.value = true;
        setTimeout(() => inputCooldown.value = false, 200);
      }
    }

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
      (api.settings.precisePlatformer ||
        api.settings.preciseTopdown == "on" ||
        api.settings.preciseTopdown == "speed")
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
    (api.settings.preciseTopdown == "on" ||
      api.settings.preciseTopdown == "direction")
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

  if (
    !api.stores.me.inventory.slots.get("energy")?.amount &&
    !api.plugins.isEnabled("Desynchronize") &&
    api.stores.session.phase === "game"
  ) {
    return { angle: null, jump: false, _jumpKeyPressed: false };
  }

  return {
    angle: physicsAngle,
    jump: api.stores.session.mapStyle == "platformer" ? shouldJump : false,
    _jumpKeyPressed: api.stores.session.mapStyle == "platformer"
      ? jumpPressed
      : false,
  };
};
