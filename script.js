document.addEventListener('DOMContentLoaded', () => {

  // 画面要素の取得
  const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    score: document.getElementById('score-screen'),
    scoreHistory: document.getElementById('score-history-screen') // スコア履歴画面を追加
  };

  // 画面切り替え関数
  function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
      screens[key].classList.remove('active');
    });
    screens[screenName].classList.add('active');
  }

  let questions = [];
  let score = 0;
  let counter = 0;
  let usedIndexes = [];

  // JSON読み込み
  fetch('quiz.json')
    .then(response => response.json())
    .then(data => {
      questions = data;
      checkProgress(); // 読み込み後に進捗確認
    })
    .catch(error => {
      console.error('クイズデータの読み込みに失敗しました:', error);
      alert('クイズデータの読み込みに失敗しました。');
    });

  // --- Button Event Listeners ---

  document.getElementById('start-btn').onclick = () => {
    resetProgress();
    showScreen('quiz');
    showQuestionScreen();
  };

  document.getElementById('continue-btn').onclick = () => {
    loadProgress();
    showScreen('quiz');
    showQuestionScreen();
  };

  document.getElementById('reset-btn').onclick = () => {
    if (confirm('本当にすべての進捗をリセットしますか？')) {
      resetProgress();
      checkProgress();
      alert('進捗をリセットしました。');
    }
  };

  document.getElementById('show-scores-btn').onclick = () => {
    displayScoreHistory();
    showScreen('scoreHistory');
  };

  document.getElementById('back-to-start-btn').onclick = () => {
    showScreen('start');
  };

  document.getElementById('next-btn').onclick = showQuestionScreen;

  document.getElementById('restart-btn').onclick = () => {
    resetProgress();
    showScreen('quiz');
    showQuestionScreen();
  };

  document.getElementById('quit-btn-score').onclick = () => {
    showScreen('start');
    checkProgress();
  };

  document.getElementById('quit-btn').onclick = () => {
    if (confirm('クイズを中断してスタート画面に戻りますか？（進捗は保存されます）')) {
      showScreen('start');
      checkProgress();
    }
  };

  // --- Progress & Score History Functions ---

  function checkProgress() {
    // 中断したクイズの進捗を確認
    const savedCounter = parseInt(localStorage.getItem('quiz_counter')) || 0;
    const continueBtn = document.getElementById('continue-btn');
    const resetBtn = document.getElementById('reset-btn');
    if (savedCounter > 0 && savedCounter < 10) {
      continueBtn.style.display = 'block';
      resetBtn.style.display = 'block';
    } else {
      continueBtn.style.display = 'none';
      resetBtn.style.display = 'none';
    }

    // スコア履歴の有無を確認
    const scoreHistory = JSON.parse(localStorage.getItem('quiz_scores_history')) || [];
    const showScoresBtn = document.getElementById('show-scores-btn');
    if (scoreHistory.length > 0) {
      showScoresBtn.style.display = 'block';
    } else {
      showScoresBtn.style.display = 'none';
    }
  }

  function saveProgress() {
    localStorage.setItem('quiz_score', score);
    localStorage.setItem('quiz_counter', counter);
    localStorage.setItem('quiz_usedIndexes', JSON.stringify(usedIndexes));
  }

  function loadProgress() {
    score = parseInt(localStorage.getItem('quiz_score')) || 0;
    counter = parseInt(localStorage.getItem('quiz_counter')) || 0;
    usedIndexes = JSON.parse(localStorage.getItem('quiz_usedIndexes')) || [];
  }

  function resetProgress() {
    score = 0;
    counter = 0;
    usedIndexes = [];
    localStorage.removeItem('quiz_score');
    localStorage.removeItem('quiz_counter');
    localStorage.removeItem('quiz_usedIndexes');
  }

  function saveFinalScore() {
    let scoreHistory = JSON.parse(localStorage.getItem('quiz_scores_history')) || [];
    const newScore = {
      score: score,
      date: new Date().toLocaleString('ja-JP')
    };
    scoreHistory.unshift(newScore);
    scoreHistory = scoreHistory.slice(0, 5);
    localStorage.setItem('quiz_scores_history', JSON.stringify(scoreHistory));
  }

  function displayScoreHistory() {
    const scoreHistory = JSON.parse(localStorage.getItem('quiz_scores_history')) || [];
    const scoreList = document.getElementById('score-list');
    scoreList.innerHTML = '';

    if (scoreHistory.length === 0) {
      scoreList.innerHTML = '<li class="no-scores">まだスコア履歴がありません。</li>';
    } else {
      scoreHistory.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.score} / 10 点</span> <span class="score-date">${item.date}</span>`;
        scoreList.appendChild(li);
      });
    }
  }

  // --- Quiz Logic Functions ---

  function getRandomQuestion() {
    if (counter >= 10) {
      showScore();
      return null;
    }

    let index;
    do {
      index = Math.floor(Math.random() * questions.length);
    } while (usedIndexes.includes(index));

    usedIndexes.push(index);
    counter++;
    saveProgress();
    return questions[index];
  }

  function showQuestionScreen() {
    const q = getRandomQuestion();
    if (!q) return;

    document.getElementById('question').textContent = `${counter}. ${q.question}`;
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';

    Object.keys(q.options).forEach(key => {
      const btn = document.createElement('button');
      btn.textContent = q.options[key];
      btn.onclick = () => checkAnswer(q, key);
      choicesDiv.appendChild(btn);
    });

    document.getElementById('explanation').textContent = '';
    document.getElementById('area').textContent = '';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('quit-btn').style.display = 'inline-block';
  }

  function checkAnswer(q, selectedKey) {
    const feedbackContainer = document.getElementById('feedback-container');
    const correctFeedback = document.getElementById('feedback-correct');
    const incorrectFeedback = document.getElementById('feedback-incorrect');

    const buttons = document.getElementById('choices').getElementsByTagName('button');
    for (let btn of buttons) {
      btn.disabled = true;
    }

    if (q.correct[selectedKey] === 1) {
      correctFeedback.style.display = 'block';
      feedbackContainer.style.display = 'flex';
      score++;
    } else {
      incorrectFeedback.style.display = 'block';
      feedbackContainer.style.display = 'flex';
    }

    setTimeout(() => {
      correctFeedback.style.display = 'none';
      incorrectFeedback.style.display = 'none';
      feedbackContainer.style.display = 'none';

      document.getElementById('explanation').textContent = q.explanation;
      document.getElementById('area').textContent = '生産地: ' + q.area;
      document.getElementById('next-btn').style.display = 'inline-block';
      saveProgress();
    }, 1000);
  }

  function showScore() {
    showScreen('score');
    document.getElementById('score').textContent = score;
    saveFinalScore();
    resetProgress();
  }

  // 初期化
  showScreen('start');
});
