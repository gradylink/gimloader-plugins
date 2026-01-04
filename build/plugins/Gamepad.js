/**
 * @name Gamepad
 * @description Controller Support For Gimkit.
 * @author grady.link
 * @version 0.12.0
 * @downloadUrl https://raw.githubusercontent.com/gradylink/gimloader-plugins/refs/heads/main/build/plugins/Gamepad.js
 */

// plugins/Gamepad/src/input.ts
var gamepad = navigator.getGamepads().length > 0 ? navigator.getGamepads()[0] : null;
var inputCooldown = { value: false };
var initGamepad = () => {
  window.addEventListener("gamepadconnected", (e) => {
    gamepad = e.gamepad;
  });
};
var updateGamepad = () => {
  gamepad = navigator.getGamepads()[gamepad.index];
};
var keyInputDown = (direction) => {
  const phaserKeyMap = {
    up: [
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ],
    down: [
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.S
    ],
    left: [
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.A
    ],
    right: [
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.D
    ]
  };
  for (const keycode of phaserKeyMap[direction]) {
    if (api.stores.phaser.scene.inputManager.keyboard.heldKeys.has(keycode)) {
      return true;
    }
  }
  return false;
};
var isMappingDown = (mapping) => {
  if (gamepad === null) return false;
  for (const button of mapping) {
    if (gamepad.buttons[parseInt(button)].pressed) return true;
  }
  return false;
};
var getJoysickAxis = (joystick, axis) => {
  if (gamepad === null) return 0;
  if (api.settings.swapJoysticks) {
    return gamepad.axes[(joystick === "move" ? 2 : 0) + (axis === "x" ? 0 : 1)] * (joystick === "look" && axis === "y" && api.settings.invertLook ? -1 : 1);
  }
  return gamepad.axes[(joystick === "move" ? 0 : 2) + (axis === "x" ? 0 : 1)] * (joystick === "look" && axis === "y" && api.settings.invertLook ? -1 : 1);
};

// plugins/Gamepad/src/aimCursor.ts
var leftTriggerWasPressed = false;
var aimCursorUpdate = () => {
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
  aimCursor.aimCursor.visible = aimCursor.scene.game.canvas.style.cursor == "none";
  aimCursor.aimCursorWorldPos = aimCursor.scene.cameraHelper.mainCamera.getWorldPoint(
    aimCursor.x ** aimCursor.scene.resizeManager.usedDpi,
    aimCursor.y ** aimCursor.scene.resizeManager.usedDpi
  );
  api.stores.phaser.scene.inputManager.mouse.worldX = aimCursor.aimCursorWorldPos.x;
  api.stores.phaser.scene.inputManager.mouse.worldY = aimCursor.aimCursorWorldPos.y;
  const horizontalCenter = window.innerWidth * aimCursor.scene.resizeManager.usedDpi / 2;
  const verticalCenter = window.innerHeight * aimCursor.scene.resizeManager.usedDpi / 2;
  aimCursor.centerShiftX = horizontalCenter - aimCursor.x;
  aimCursor.centerShiftY = verticalCenter - aimCursor.y;
  if (gamepad === null) return;
  api.stores.phaser.scene.input.mousePointer.isDown = gamepad.buttons[7].pressed || api.stores.phaser.scene.inputManager.mouse.isHoldingDown;
  if (gamepad.buttons[6].pressed && !api.stores.me.inventory.interactiveSlots.get(
    api.stores.me.inventory.activeInteractiveSlot.toString()
  )?.waiting) {
    const devices = api.stores.phaser.scene.worldManager.devices;
    const body = api.stores.phaser.mainCharacter.body;
    const device = devices.interactives.findClosestInteractiveDevice(
      devices.devicesInView,
      body.x,
      body.y
    );
    if (device) {
      if (api.plugins.isEnabled("InstantUse")) {
        device.interactiveZones.onInteraction?.();
      } else {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            bubbles: true,
            cancelable: true
          })
        );
      }
    } else {
      api.net.send("CONSUME", {
        "x": Math.round(
          aimCursor.aimCursorWorldPos.x * 0.015625 - 0.5
        ),
        "y": Math.round(
          aimCursor.aimCursorWorldPos.y * 0.015625 - 0.5
        )
      });
    }
  } else if (leftTriggerWasPressed) {
    document.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        bubbles: true,
        cancelable: true
      })
    );
  }
  leftTriggerWasPressed = gamepad.buttons[6].pressed;
};

// plugins/Gamepad/src/movement/topdown.ts
var getMagnitude = () => {
  if (gamepad === null) return 0;
  return Math.sqrt(gamepad.axes[0] ** 2 + gamepad.axes[1] ** 2);
};
var normalSpeed = 310;
var getPhysicsInput = () => {
  let up = keyInputDown("up") && api.settings.keyboard;
  let right = keyInputDown("right") && api.settings.keyboard;
  let left = keyInputDown("left") && api.settings.keyboard;
  let down = keyInputDown("down") && api.settings.keyboard;
  if (gamepad !== null) {
    up ||= isMappingDown(api.settings.up) || getJoysickAxis("move", "y") < -api.settings.deadzone;
    right ||= isMappingDown(api.settings.right) || getJoysickAxis("move", "x") > api.settings.deadzone;
    left ||= isMappingDown(api.settings.left) || getJoysickAxis("move", "x") < -api.settings.deadzone;
    down ||= isMappingDown(api.settings.down) || getJoysickAxis("move", "y") > api.settings.deadzone;
    if (getMagnitude() > api.settings.deadzone && (api.settings.preciseTopdown == "on" || api.settings.preciseTopdown == "speed")) {
      api.stores.me.movementSpeed = normalSpeed * Math.max(
        getMagnitude(),
        api.plugins.isEnabled("Desynchronize") ? 0 : 0.65
        /* Slowest allowed speed based on my testing. */
      );
    } else {
      api.stores.me.movementSpeed = normalSpeed;
    }
  }
  let physicsAngle = null;
  if (left && right && (up || down)) {
    left = true;
    right = false;
    up = true;
    down = false;
  }
  if (gamepad !== null && getMagnitude() > api.settings.deadzone && (api.settings.preciseTopdown == "on" || api.settings.preciseTopdown == "direction")) {
    physicsAngle = (Math.atan2(getJoysickAxis("move", "y"), getJoysickAxis("move", "x")) * 180 / Math.PI + 360) % 360;
  } else if ((down || up || left || right) && !(left && right) && !(down && up)) {
    physicsAngle = (Math.atan2(+down - +up, +right - +left) * 180 / Math.PI + 360) % 360;
  }
  if (!api.stores.me.inventory.slots.get("energy")?.amount && !api.plugins.isEnabled("Desynchronize") && api.stores.session.phase === "game") {
    return { angle: null, jump: false, _jumpKeyPressed: false };
  }
  return {
    angle: physicsAngle,
    jump: false,
    _jumpKeyPressed: false
  };
};

// plugins/Gamepad/src/ui.ts
var answeringQuestions = false;
var selectedAnswer = 0 /* TopLeft */;
var updateSelectedAnswer = () => {
  inputCooldown.value = true;
  setTimeout(() => inputCooldown.value = false, 100);
  if (selectedAnswer < 0) selectedAnswer = 0;
  else if (selectedAnswer > 3) selectedAnswer = 3;
  document.querySelectorAll("[answercolors]").forEach((answer) => {
    answer.parentElement.style.border = parseInt(answer.getAttribute("position")) == selectedAnswer ? "4px solid white" : "none";
  });
};
var initUI = () => {
  const questionsObserver = new MutationObserver(() => {
    const wasAnsweringQuestions = answeringQuestions;
    answeringQuestions = document.querySelector("[answercolors]") != null;
    if (answeringQuestions && !wasAnsweringQuestions) updateSelectedAnswer();
  });
  questionsObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
};
var handleUIInput = () => {
  if (gamepad === null || inputCooldown.value) return;
  if (isMappingDown(api.settings.inventoryLeft)) {
    api.stores.me.inventory.activeInteractiveSlot--;
    if (api.stores.me.inventory.activeInteractiveSlot < 0) {
      api.stores.me.inventory.activeInteractiveSlot = api.stores.me.inventory.slots.size - 1;
    }
    api.net.send("SET_ACTIVE_INTERACTIVE_ITEM", {
      slotNum: api.stores.me.inventory.activeInteractiveSlot
    });
    inputCooldown.value = true;
    setTimeout(() => inputCooldown.value = false, 200);
  } else if (isMappingDown(api.settings.inventoryRight)) {
    api.stores.me.inventory.activeInteractiveSlot++;
    if (api.stores.me.inventory.activeInteractiveSlot >= api.stores.me.inventory.slots.size) {
      api.stores.me.inventory.activeInteractiveSlot = 0;
    }
    api.net.send("SET_ACTIVE_INTERACTIVE_ITEM", {
      slotNum: api.stores.me.inventory.activeInteractiveSlot
    });
    inputCooldown.value = true;
    setTimeout(() => inputCooldown.value = false, 200);
  }
  if (!answeringQuestions) return;
  if (isMappingDown(api.settings.select)) {
    const selectedQuestionText = document.querySelector(
      `[answercolors][position="${selectedAnswer}"]`
    )?.querySelector("span")?.textContent;
    const answer = JSON.parse(
      api.stores.phaser.scene.worldManager.devices.allDevices.find((d) => typeof d.state.questions == "string")?.state.questions
    ).find(
      (question) => question._id == api.stores.me.deviceUI.current.props.currentQuestionId
    )?.answers.find((answer2) => answer2.text == selectedQuestionText);
    if (answer?.correct) {
      api.notification.success({ message: "Correct!" });
      api.net.send("MESSAGE_FOR_DEVICE", {
        key: "answered",
        deviceId: api.stores.me.deviceUI.current.deviceId,
        data: {
          answer: answer._id
        }
      });
    } else {
      api.notification.error({ message: "Incorrect!" });
    }
    document.querySelector(".anticon-close").click();
    api.stores.phaser.scene.worldManager.devices.allDevices.find(
      (d) => d.state.text === "Answer Questions"
    )?.buttonClicked();
    inputCooldown.value = true;
    setTimeout(() => inputCooldown.value = false, 350);
  }
  if (isMappingDown(api.settings.up) || getJoysickAxis("move", "y") < -api.settings.deadzone) {
    selectedAnswer -= 2;
    updateSelectedAnswer();
  }
  if (isMappingDown(api.settings.down) || getJoysickAxis("move", "y") > api.settings.deadzone) {
    selectedAnswer += 2;
    updateSelectedAnswer();
  }
  if (isMappingDown(api.settings.right) || getJoysickAxis("move", "x") > api.settings.deadzone) {
    selectedAnswer++;
    updateSelectedAnswer();
  }
  if (isMappingDown(api.settings.left) || getJoysickAxis("move", "x") < -api.settings.deadzone) {
    selectedAnswer--;
    updateSelectedAnswer();
  }
};
api.rewriter.runInScope("App", (code, run) => {
  if (!code.includes("Press Enter")) return;
  const afterName = code.indexOf('={tapText:"Tap"');
  const beforeName = code.lastIndexOf(",", afterName) + 1;
  const name = code.slice(beforeName, afterName);
  run(`${name}.keyText = "Press LT"; ${name}.keyHoldText = "Press LT & Hold";`);
  api.onStop(() => {
    run(
      `${name}.keyText = "Press Enter"; ${name}.keyHoldText = "Press Enter & Hold";`
    );
  });
});

// plugins/Gamepad/src/movement/platformer.ts
var normalSpeed2 = 310;
var previousFrame = {
  left: false,
  right: false,
  jump: false
};
var handlePlatformerInput = () => {
  if (gamepad === null) return;
  const left = isMappingDown(api.settings.left) || getJoysickAxis("move", "x") < -api.settings.deadzone;
  const right = isMappingDown(api.settings.right) || getJoysickAxis("move", "x") > api.settings.deadzone;
  const jump = isMappingDown(api.settings.jump) || getJoysickAxis("move", "y") < -api.settings.deadzone && api.settings.joystickJump;
  if (!previousFrame.left && left) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.add(
      Phaser.Input.Keyboard.KeyCodes.LEFT
    );
  } else if (previousFrame.left && !left) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.delete(
      Phaser.Input.Keyboard.KeyCodes.LEFT
    );
  }
  if (!previousFrame.right && right) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.add(
      Phaser.Input.Keyboard.KeyCodes.RIGHT
    );
  } else if (previousFrame.right && !right) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.delete(
      Phaser.Input.Keyboard.KeyCodes.RIGHT
    );
  }
  if (!previousFrame.jump && jump) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.add(
      Phaser.Input.Keyboard.KeyCodes.UP
    );
  } else if (previousFrame.jump && !jump) {
    api.stores.phaser.scene.inputManager.keyboard.heldKeys.delete(
      Phaser.Input.Keyboard.KeyCodes.UP
    );
  }
  if (gamepad.axes[0] > api.settings.deadzone && api.settings.precisePlatformer) {
    api.stores.me.movementSpeed = normalSpeed2 * Math.max(
      gamepad.axes[0],
      api.plugins.isEnabled("Desynchronize") ? 0 : 0.65
      /* Slowest allowed speed based on my testing. */
    );
  } else {
    api.stores.me.movementSpeed = normalSpeed2;
  }
  previousFrame.left = left;
  previousFrame.right = right;
  previousFrame.jump = jump;
};

// plugins/Gamepad/src/index.ts
var mappingOptions = [
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
  { label: "DPAD Right", value: "15" }
];
api.settings.create([
  {
    type: "toggle",
    id: "precisePlatformer",
    title: "Platformer Precise Joystick Inputs",
    description: "Using this invalidates speedruns.",
    default: true
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
      { label: "Precise Speed", value: "speed" }
    ]
  },
  {
    type: "toggle",
    id: "keyboard",
    title: "Keyboard Input",
    default: true
  },
  {
    type: "toggle",
    id: "joystickJump",
    title: "Jump With Joystick",
    default: false
  },
  {
    type: "slider",
    id: "deadzone",
    title: "Joystick Deadzone",
    default: 0.5,
    min: 0.05,
    max: 0.95,
    step: 0.05
  },
  {
    type: "slider",
    id: "lookSensitivity",
    title: "Look Sensitivity",
    default: 10,
    min: 1,
    max: 25,
    step: 1
  },
  {
    type: "toggle",
    id: "rumble",
    title: "Rumble",
    default: true,
    description: "Keep in mind some browsers/controllers do not support this setting."
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
        default: ["14"]
      },
      {
        type: "multiselect",
        title: "Right",
        id: "right",
        options: mappingOptions,
        default: ["15"]
      },
      {
        type: "multiselect",
        title: "Up",
        id: "up",
        options: mappingOptions,
        default: ["12"]
      },
      {
        type: "multiselect",
        title: "Down",
        id: "down",
        options: mappingOptions,
        default: ["13"]
      },
      {
        type: "multiselect",
        title: "Jump",
        id: "jump",
        options: mappingOptions,
        default: ["12", "0", "1"]
      },
      {
        type: "multiselect",
        title: "Answer Questions",
        id: "questions",
        options: mappingOptions,
        default: ["3"]
      },
      {
        type: "multiselect",
        title: "Consume/Use",
        id: "consume",
        options: mappingOptions,
        default: ["6"]
      },
      {
        type: "multiselect",
        title: "Fire",
        id: "fire",
        options: mappingOptions,
        default: ["7"]
      },
      {
        type: "multiselect",
        title: "Hotbar Left",
        id: "inventoryLeft",
        options: mappingOptions,
        default: ["4"]
      },
      {
        type: "multiselect",
        title: "Hotbar Right",
        id: "inventoryRight",
        options: mappingOptions,
        default: ["5"]
      },
      {
        type: "multiselect",
        title: "UI Select",
        id: "select",
        options: mappingOptions,
        default: ["0"]
      },
      {
        type: "toggle",
        title: "Swap Joysticks",
        id: "swapJoysticks",
        default: false
      },
      {
        type: "toggle",
        title: "Invert Vertical Look",
        id: "invertLook",
        default: false
      }
    ]
  }
]);
var originalGetPhysicsInput = null;
var originalAimCursorUpdate = null;
api.net.on("PROJECTILE_CHANGES", (data) => {
  if (data.hit.length == 0 || data.hit[0].hits[0].characterId != GL.stores.phaser.mainCharacter.id || !gamepad || !gamepad.vibrationActuator || !api.settings.rumble) return;
  gamepad.vibrationActuator.playEffect("dual-rumble", {
    startDelay: 0,
    duration: 100,
    weakMagnitude: 0.75,
    strongMagnitude: 0.5
  });
});
api.net.onLoad(() => {
  const aimCursor = api.stores.phaser.scene.inputManager.aimCursor;
  originalAimCursorUpdate = aimCursor.update;
  aimCursor.update = () => aimCursorUpdate();
  originalGetPhysicsInput = api.stores.phaser.scene.inputManager.getPhysicsInput;
  api.stores.phaser.scene.inputManager.getPhysicsInput = () => {
    if (api.stores.session.gameSession.phase === "results") {
      return { angle: null, jump: false, _jumpKeyPressed: false };
    }
    if (gamepad !== null) updateGamepad();
    if (document.querySelector(
      ".fa-times, :not(.ant-notification-notice-close) >.anticon-close, button:has(.lucide-x)"
    )) {
      if (gamepad !== null && gamepad.buttons[1].pressed) {
        document.querySelector(
          ".fa-times, :not(.ant-notification-notice-close) > .anticon-close, button:has(.lucide-x)"
        ).click();
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
        api.stores.phaser.scene.worldManager.devices.allDevices.find(
          (d) => d.state.text === "Answer Questions"
        )?.buttonClicked();
      } else if (gamepad.buttons[8].pressed) {
        document.querySelector('[aria-label="Leaderboard"]').click();
      }
    }
    if (api.stores.session.mapStyle === "platformer") {
      handlePlatformerInput();
      return originalGetPhysicsInput();
    }
    return getPhysicsInput();
  };
});
api.onStop(() => {
  if (originalGetPhysicsInput !== null) {
    api.stores.phaser.scene.inputManager.getPhysicsInput = originalGetPhysicsInput;
  }
  if (originalAimCursorUpdate !== null) {
    api.stores.phaser.scene.inputManager.aimCursor.update = originalAimCursorUpdate;
  }
});
initGamepad();
initUI();
