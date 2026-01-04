import { gamepad, getJoysickAxis, isMappingDown, keyInputDown } from "../input";

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
    up ||= isMappingDown(api.settings.up) ||
      getJoysickAxis("move", "y") < -api.settings.deadzone;
    right ||= isMappingDown(api.settings.right) ||
      getJoysickAxis("move", "x") > api.settings.deadzone;
    left ||= isMappingDown(api.settings.left) ||
      getJoysickAxis("move", "x") < -api.settings.deadzone;
    down ||= isMappingDown(api.settings.down) ||
      getJoysickAxis("move", "y") > api.settings.deadzone;

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
      (Math.atan2(getJoysickAxis("move", "y"), getJoysickAxis("move", "x")) *
          180 / Math.PI +
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
