import { aimCursorUpdate } from "./aimCursor";
import { gamepad, initGamepad, inputCooldown, updateGamepad } from "./input";
import { getPhysicsInput } from "./movement/topdown";
import { answeringQuestions, handleUIInput } from "./ui";

api.settings.create([
  {
    type: "toggle",
    id: "precisePlatformer",
    title: "Platformer Precise Joystick Inputs",
    description: "Using this invalidates speedruns.",
    default: true,
  },
  {
    type: "dropdown",
    id: "preciseTopdown",
    title: "Top Down Precise Joystick Inputs",
    description: 'Only the "Precise Direction" option is allowed in speedruns.',
    default: "on",
    options: [
      { label: "On", value: "on" },
      { label: "Off", value: "off" },
      { label: "Precise Direction", value: "direction" },
      { label: "Precise Speed", value: "speed" },
    ],
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
  {
    type: "slider",
    id: "lookSensitivity",
    title: "Look Sensitivity",
    default: 10,
    min: 1,
    max: 25,
    step: 1,
  },
  {
    type: "toggle",
    id: "rumble",
    title: "Rumble",
    default: true,
    description:
      "Keep in mind some browsers/controllers do not support this setting.",
  },
]);

let originalGetPhysicsInput:
  | (() => {
    angle: number | null;
    jump: boolean;
    _jumpKeyPressed: boolean;
  })
  | null = null;

let originalAimCursorUpdate: (() => void) | null = null;

api.net.on("PROJECTILE_CHANGES", (data) => {
  if (
    data.hit.length == 0 ||
    data.hit[0].hits[0].characterId != GL.stores.phaser.mainCharacter.id ||
    !gamepad || !gamepad.vibrationActuator || !api.settings.rumble
  ) return;

  gamepad.vibrationActuator.playEffect("dual-rumble", {
    startDelay: 0,
    duration: 100,
    weakMagnitude: 0.75,
    strongMagnitude: 0.5,
  });
});

api.net.onLoad(() => {
  const aimCursor = api.stores.phaser.scene.inputManager.aimCursor;
  originalAimCursorUpdate = aimCursor.update;
  aimCursor.update = () => aimCursorUpdate();

  originalGetPhysicsInput =
    api.stores.phaser.scene.inputManager.getPhysicsInput;
  api.stores.phaser.scene.inputManager.getPhysicsInput = () => {
    if (api.stores.session.gameSession.phase === "results") {
      return { angle: null, jump: false, _jumpKeyPressed: false };
    }

    if (gamepad !== null) updateGamepad();

    if (
      document.querySelector(
        ".fa-times, :not(.ant-notification-notice-close) >.anticon-close, button:has(.lucide-x)",
      )
    ) {
      if (gamepad !== null && gamepad.buttons[1].pressed) {
        (document.querySelector(
          ".fa-times, :not(.ant-notification-notice-close) > .anticon-close, button:has(.lucide-x)",
        ) as HTMLElement)
          .click();
      }

      if (!answeringQuestions) {
        return { angle: null, jump: false, _jumpKeyPressed: false };
      }
    }
    if (answeringQuestions) {
      handleUIInput();

      return { angle: null, jump: false, _jumpKeyPressed: false };
    }

    return getPhysicsInput();
  };
});

api.onStop(() => {
  if (originalGetPhysicsInput !== null) {
    api.stores.phaser.scene.inputManager.getPhysicsInput =
      originalGetPhysicsInput;
  }
  if (originalAimCursorUpdate !== null) {
    api.stores.phaser.scene.inputManager.aimCursor.update =
      originalAimCursorUpdate;
  }
});

initGamepad();
