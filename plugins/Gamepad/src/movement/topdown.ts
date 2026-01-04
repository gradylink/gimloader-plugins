import { gamepad, inputCooldown, keyInputDown } from "../input";

const getMagnitude = () => {
  if (gamepad === null) return 0;
  return Math.sqrt(gamepad.axes[0] ** 2 + gamepad.axes[1] ** 2);
};

const normalSpeed = 310;

export const getPhysicsInput = (): Gimloader.Stores.TickInput => {
  let up = keyInputDown("up") && api.settings.keyboard;
  let right = keyInputDown("right") && api.settings.keyboard;
  let left = keyInputDown("left") && api.settings.keyboard;
  let down = keyInputDown("down") && api.settings.keyboard;

  if (gamepad !== null) {
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

    up ||= gamepad?.buttons[12].pressed ||
      gamepad?.axes[1]! < -api.settings.deadzone;
    right ||= gamepad?.buttons[15].pressed ||
      gamepad?.axes[0]! > api.settings.deadzone;
    left ||= gamepad?.buttons[14].pressed ||
      gamepad?.axes[0]! < -api.settings.deadzone;
    down ||= gamepad?.buttons[13].pressed ||
      gamepad?.axes[1]! > api.settings.deadzone;

    if (
      getMagnitude() > api.settings.deadzone &&
      (api.settings.preciseTopdown == "on" ||
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

  let physicsAngle: number | null = null;

  if (left && right && (up || down)) {
    left = true;
    right = false;
    up = true;
    down = false;
  }

  if (
    gamepad !== null && getMagnitude() > api.settings.deadzone &&
    (api.settings.preciseTopdown == "on" ||
      api.settings.preciseTopdown == "direction")
  ) {
    physicsAngle =
      (Math.atan2(gamepad.axes[1], gamepad.axes[0]) * 180 / Math.PI +
        360) %
      360;
  } else if (
    (down || up || left || right) && !(left && right) &&
    !(down && up)
  ) {
    physicsAngle = (Math.atan2(+down - +up, +right - +left) * 180 / Math.PI +
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
    jump: false,
    _jumpKeyPressed: false,
  };
};
