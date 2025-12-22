let gamepad: Gamepad | null = navigator.getGamepads().length > 0
  ? navigator.getGamepads()[0]
  : null;
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

enum SelectedAnswer {
  TopLeft = 0,
  TopRight = 1,
  BottomLeft = 2,
  BottomRight = 3,
}

let answeringQuestions = false;
let selectedAnswer = SelectedAnswer.TopLeft;
let inputCooldown = false;

const updateSelectedAnswer = () => {
  inputCooldown = true;
  setTimeout(() => inputCooldown = false, 100);

  if (selectedAnswer < 0) selectedAnswer = 0;
  else if (selectedAnswer > 3) selectedAnswer = 3;

  document.querySelectorAll("[answercolors]").forEach((answer) => {
    answer.parentElement!.style.border =
      parseInt(answer.getAttribute("position")!) == selectedAnswer
        ? "4px solid white"
        : "none";
  });
};

const questionsObserver = new MutationObserver(() => {
  const wasAnsweringQuestions = answeringQuestions;
  answeringQuestions = document.querySelector("[answercolors]") != null;
  if (answeringQuestions && !wasAnsweringQuestions) updateSelectedAnswer();
});

questionsObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

api.net.onLoad(() => {
  originalGetPhysicsInput =
    api.stores.phaser.scene.inputManager.getPhysicsInput;
  api.stores.phaser.scene.inputManager.getPhysicsInput = () => {
    if (answeringQuestions) {
      if (gamepad !== null) {
        if (gamepad.buttons[1].pressed) {
          (document.querySelector(".anticon-close") as HTMLSpanElement).click();
        } else if (!inputCooldown) {
          if (gamepad.buttons[0].pressed) {
            const selectedQuestionText = document.querySelector(
              `[answercolors][position="${selectedAnswer}"]`,
            )?.querySelector("span")?.textContent;

            const answer = (JSON.parse(
              api.stores.phaser.scene.worldManager.devices.allDevices.find((
                d,
              ) => typeof d.state.questions == "string")?.state.questions,
            ) as {
              __v: number;
              _id: string;
              answers: { _id: string; correct: boolean; text: string }[];
              game: string;
              isActive: boolean;
              position: number;
              source: string;
              text: string;
              type: string;
            }[]).find((question) =>
              question._id ==
                api.stores.me.deviceUI.current.props.currentQuestionId
            )?.answers.find((answer) => answer.text == selectedQuestionText);

            if (answer?.correct) {
              api.notification.success({ message: "Correct!" });

              api.net.send("MESSAGE_FOR_DEVICE", {
                key: "answered",
                deviceId: api.stores.me.deviceUI.current.deviceId,
                data: {
                  answer: answer._id,
                },
              });
            } else {
              api.notification.error({ message: "Incorrect!" });
            }

            (document.querySelector(".anticon-close") as HTMLSpanElement)
              .click();

            api.stores.phaser.scene.worldManager.devices.allDevices.find((d) =>
              d.state.text === "Answer Questions"
            )?.buttonClicked();

            inputCooldown = true;
            setTimeout(() => inputCooldown = false, 350);
          }

          if (
            gamepad.buttons[12].pressed ||
            gamepad.axes[1] < -api.settings.deadzone
          ) {
            selectedAnswer -= 2;
            updateSelectedAnswer();
          }
          if (
            gamepad.buttons[13].pressed ||
            gamepad.axes[1] > api.settings.deadzone
          ) {
            selectedAnswer += 2;
            updateSelectedAnswer();
          }
          if (
            gamepad.buttons[15].pressed ||
            gamepad.axes[0] > api.settings.deadzone
          ) {
            selectedAnswer++;
            updateSelectedAnswer();
          }
          if (
            gamepad.buttons[14].pressed ||
            gamepad.axes[0] < -api.settings.deadzone
          ) {
            selectedAnswer--;
            updateSelectedAnswer();
          }
        }
      }

      return { angle: null, jump: false, _jumpKeyPressed: false };
    }

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

      if (gamepad?.buttons[3].pressed) {
        api.stores.phaser.scene.worldManager.devices.allDevices.find((d) =>
          d.state.text === "Answer Questions"
        )?.buttonClicked();
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
