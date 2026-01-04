import { gamepad, inputCooldown } from "./input";

enum SelectedAnswer {
  TopLeft = 0,
  TopRight = 1,
  BottomLeft = 2,
  BottomRight = 3,
}

export let answeringQuestions = false;
export let selectedAnswer = SelectedAnswer.TopLeft;

const updateSelectedAnswer = () => {
  inputCooldown.value = true;
  setTimeout(() => inputCooldown.value = false, 100);

  if (selectedAnswer < 0) selectedAnswer = 0;
  else if (selectedAnswer > 3) selectedAnswer = 3;

  document.querySelectorAll("[answercolors]").forEach((answer) => {
    answer.parentElement!.style.border =
      parseInt(answer.getAttribute("position")!) == selectedAnswer
        ? "4px solid white"
        : "none";
  });
};

export const initUI = () => {
  // TODO: Correctly use MutationObserver (remove querySelector)
  const questionsObserver = new MutationObserver(() => {
    const wasAnsweringQuestions = answeringQuestions;
    answeringQuestions = document.querySelector("[answercolors]") != null;
    if (answeringQuestions && !wasAnsweringQuestions) updateSelectedAnswer();
  });

  questionsObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

export const handleUIInput = () => {
  if (gamepad === null || inputCooldown) return;

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

    inputCooldown.value = true;
    setTimeout(() => inputCooldown.value = false, 350);
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
};

// @ts-expect-error
api.rewriter.runInScope("App", (code, run) => {
  if (!code.includes("Press Enter")) return;

  const afterName = code.indexOf('={tapText:"Tap"');
  const beforeName = code.lastIndexOf(",", afterName) + 1;
  const name = code.slice(beforeName, afterName);

  run(`${name}.keyText = "Press LT"; ${name}.keyHoldText = "Press LT & Hold";`);
  api.onStop(() => {
    run(
      `${name}.keyText = "Press Enter"; ${name}.keyHoldText = "Press Enter & Hold";`,
    );
  });
});
