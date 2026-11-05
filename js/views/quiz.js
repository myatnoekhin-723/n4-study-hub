// Quiz mode inside the Review view: multiple choice, Japanese -> meaning.
// The result is saved only when the quiz is finished, so leaving half-way
// saves nothing.

import { addQuizResult, buildQuiz, quizAvailability, scoreQuiz } from '../logic.js';
import { byId, el } from './dom.js';

// getCategory: returns the category chosen in the Review toolbar ('' = all)
export function createQuiz(app, getCategory) {
  const startPanel = byId('quiz-start');
  const startText = byId('quiz-start-text');
  const startButton = byId('quiz-start-button');
  const questionPanel = byId('quiz-question');
  const progress = byId('quiz-progress');
  const prompt = byId('quiz-prompt');
  const choicesBox = byId('quiz-choices');
  const feedback = byId('quiz-feedback');
  const nextButton = byId('quiz-next');
  const resultPanel = byId('quiz-result');
  const scoreText = byId('quiz-score');
  const restartButton = byId('quiz-restart');

  // The current quiz
  let questions = [];
  let index = 0;
  let pickedChoices = []; // choice text picked for each question

  function showPanel(panel) {
    [startPanel, questionPanel, resultPanel].forEach((other) => {
      other.hidden = other !== panel;
    });
  }

  function reset() {
    questions = [];
    index = 0;
    pickedChoices = [];

    const category = getCategory();
    const availability = quizAvailability(app.data.cards, category);
    startText.textContent = availability.ok
      ? `${availability.questionCount} question${availability.questionCount === 1 ? '' : 's'} from ${category || 'all categories'}.`
      : availability.reason;
    startButton.disabled = !availability.ok;
    showPanel(startPanel);
  }

  function start() {
    questions = buildQuiz(app.data.cards, getCategory());
    index = 0;
    pickedChoices = [];
    showPanel(questionPanel);
    showQuestion();
  }

  function showQuestion() {
    const question = questions[index];
    progress.textContent = `Question ${index + 1} of ${questions.length}`;
    prompt.textContent = question.prompt;
    feedback.textContent = '';
    feedback.className = 'quiz-feedback';
    nextButton.hidden = true;
    nextButton.textContent = index === questions.length - 1 ? 'See score' : 'Next question';

    choicesBox.replaceChildren(
      ...question.choices.map((choice) => {
        const button = el('button', 'button quiz-choice', choice);
        button.type = 'button';
        button.dataset.choice = choice;
        return button;
      })
    );
    choicesBox.querySelector('button').focus();
  }

  function choose(choice) {
    if (pickedChoices[index] !== undefined) return; // already answered
    const question = questions[index];
    pickedChoices[index] = choice;
    const isCorrect = choice === question.answer;

    choicesBox.querySelectorAll('button').forEach((button) => {
      button.disabled = true;
      if (button.dataset.choice === question.answer) button.classList.add('is-correct');
      if (button.dataset.choice === choice && !isCorrect) button.classList.add('is-wrong');
    });

    feedback.textContent = isCorrect
      ? 'Correct!'
      : `Not quite. ${question.prompt} (${question.reading}) means "${question.answer}".`;
    feedback.className = `quiz-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`;
    nextButton.hidden = false;
    nextButton.focus();
  }

  function goNext() {
    if (index < questions.length - 1) {
      index += 1;
      showQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    const score = scoreQuiz(questions, pickedChoices);
    app.data.quizHistory = addQuizResult(app.data.quizHistory, {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      category: getCategory() || null,
      total: score.total,
      correct: score.correct,
    });
    app.save();

    scoreText.textContent = `You scored ${score.correct} / ${score.total} (${score.percent}%).`;
    showPanel(resultPanel);
    restartButton.focus();
  }

  function onChoiceClick(event) {
    const button = event.target.closest('button[data-choice]');
    if (button) choose(button.dataset.choice);
  }

  startButton.addEventListener('click', start);
  choicesBox.addEventListener('click', onChoiceClick);
  nextButton.addEventListener('click', goNext);
  restartButton.addEventListener('click', reset);

  return { reset };
}
