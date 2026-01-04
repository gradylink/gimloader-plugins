import { aimCursorUpdate } from "./aimCursor";
import { gamepad, initGamepad, updateGamepad } from "./input";
import { getPhysicsInput as getTopdownPhysicsInput } from "./movement/topdown";
import { answeringQuestions, handleUIInput, initUI } from "./ui";
import { handlePlatformerInput } from "./movement/platformer";

const mappingOptions: { label: string; value: string }[] = [
  { label: "A", value: "0" },
  { label: "B", value: "1" },
  { label: "X", value: "2" },
  { label: "Y", value: "3" },
  { label: "Left Bumper", value: "4" },
  { label: "Right Bumper", value: "5" },
  { label: "Left trigger", value: "6" },
  { label: "Right trigger", value: "7" },
  { label: "Select/View", value: "8" },
  { label: "Start/Menu", value: "9" },
  { label: "Left Stick Pressed", value: "10" },
  { label: "Right Stick Pressed", value: "11" },
  { label: "DPAD Up", value: "12" },
  { label: "DPAD Down", value: "13" },
  { label: "DPAD Left", value: "14" },
  { label: "DPAD Right", value: "15" },
];

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
  {
    type: "group",
    title: "Mappings",
    settings: [
      {
        type: "multiselect",
        title: "Left",
        id: "left",
        options: mappingOptions,
        default: ["14"],
      },
      {
        type: "multiselect",
        title: "Right",
        id: "right",
        options: mappingOptions,
        default: ["15"],
      },
      {
        type: "multiselect",
        title: "Up",
        id: "up",
        options: mappingOptions,
        default: ["12"],
      },
      {
        type: "multiselect",
        title: "Down",
        id: "down",
        options: mappingOptions,
        default: ["13"],
      },
      {
        type: "multiselect",
        title: "Jump",
        id: "jump",
        options: mappingOptions,
        default: ["12", "0", "1"],
      },
      {
        type: "multiselect",
        title: "Answer Questions",
        id: "questions",
        options: mappingOptions,
        default: ["3"],
      },
      {
        type: "multiselect",
        title: "Consume/Use",
        id: "consume",
        options: mappingOptions,
        default: ["6"],
      },
      {
        type: "multiselect",
        title: "Fire",
        id: "fire",
        options: mappingOptions,
        default: ["7"],
      },
      {
        type: "multiselect",
        title: "Hotbar Left",
        id: "inventoryLeft",
        options: mappingOptions,
        default: ["4"],
      },
      {
        type: "multiselect",
        title: "Hotbar Right",
        id: "inventoryRight",
        options: mappingOptions,
        default: ["5"],
      },
      {
        type: "multiselect",
        title: "UI Select",
        id: "select",
        options: mappingOptions,
        default: ["0"],
      },
      {
        type: "toggle",
        title: "Swap Joysticks",
        id: "swapJoysticks",
        default: false,
      },
      {
        type: "toggle",
        title: "Invert Vertical Look",
        id: "invertLook",
        default: false,
      },
    ],
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

    handleUIInput();

    if (answeringQuestions) {
      return { angle: null, jump: false, _jumpKeyPressed: false };
    }

    if (gamepad !== null) {
      if (gamepad.buttons[3].pressed) {
        api.stores.phaser.scene.worldManager.devices.allDevices.find((d) =>
          d.state.text === "Answer Questions"
        )?.buttonClicked();
      } else if (gamepad.buttons[8].pressed) {
        (document.querySelector('[aria-label="Leaderboard"]') as HTMLDivElement)
          .click();
      }
    }

    if (api.stores.session.mapStyle === "platformer") {
      handlePlatformerInput();
      return originalGetPhysicsInput!();
    }

    return getTopdownPhysicsInput();
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
initUI();
