document.addEventListener('DOMContentLoaded', () => {

  // 画面要素の取得
  const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    score: document.getElementById('score-screen'),
    scoreHistory: document.getElementById('score-history-screen'),
    review: document.getElementById('review-screen')
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
  let userAnswers = []; // ユーザーの回答を保存する配列

  // JSON読み込み
  fetch('quiz.json')
    .then(response => response.json())
    .then(data => {
      questions = data;
      checkProgress();
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

  document.getElementById('reset-all-btn').onclick = () => {
    if (confirm('本当にすべての進捗と履歴をリセットしますか？この操作は元に戻せません。')) {
      resetProgress();
      localStorage.removeItem('quiz_scores_history');
      checkProgress();
      alert('すべてのデータをリセットしました。');
    }
  };

  document.getElementById('reset-progress-btn').onclick = () => {
    if (confirm('中断したクイズをリセットしますか？スコア履歴は消えません。')) {
      resetProgress();
      checkProgress();
      alert('クイズの進捗をリセットしました。');
    }
  };

  document.getElementById('show-scores-btn').onclick = () => {
    displayScoreHistory();
    showScreen('scoreHistory');
  };

  document.getElementById('back-to-start-btn').onclick = () => {
    showScreen('start');
  };
  
  document.getElementById('back-to-history-btn').onclick = () => {
    showScreen('scoreHistory');
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
      saveProgress();
      showScreen('start');
      checkProgress();
    }
  };

  // --- Progress & Score History Functions ---

  function checkProgress() {
    const savedCounter = parseInt(localStorage.getItem('quiz_counter')) || 0;
    const scoreHistory = JSON.parse(localStorage.getItem('quiz_scores_history')) || [];

    const continueBtn = document.getElementById('continue-btn');
    const resetProgressBtn = document.getElementById('reset-progress-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');
    const showScoresBtn = document.getElementById('show-scores-btn');

    if (savedCounter > 0 && savedCounter < 10) {
      continueBtn.style.display = 'block';
      resetProgressBtn.style.display = 'block';
    } else {
      continueBtn.style.display = 'none';
      resetProgressBtn.style.display = 'none';
    }

    if (savedCounter > 0 || scoreHistory.length > 0) {
        resetAllBtn.style.display = 'block';
    } else {
        resetAllBtn.style.display = 'none';
    }

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
    localStorage.setItem('quiz_userAnswers', JSON.stringify(userAnswers));
  }

  function loadProgress() {
    score = parseInt(localStorage.getItem('quiz_score')) || 0;
    counter = parseInt(localStorage.getItem('quiz_counter')) || 0;
    usedIndexes = JSON.parse(localStorage.getItem('quiz_usedIndexes')) || [];
    userAnswers = JSON.parse(localStorage.getItem('quiz_userAnswers')) || [];
  }

  function resetProgress() {
    score = 0;
    counter = 0;
    usedIndexes = [];
    userAnswers = [];
    localStorage.removeItem('quiz_score');
    localStorage.removeItem('quiz_counter');
    localStorage.removeItem('quiz_usedIndexes');
    localStorage.removeItem('quiz_userAnswers');
  }

  function saveFinalScore() {
    let scoreHistory = JSON.parse(localStorage.getItem('quiz_scores_history')) || [];
    const newScore = {
      score: score,
      date: new Date().toLocaleString('ja-JP'),
      questions: usedIndexes,
      answers: userAnswers
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
        const button = document.createElement('button');
        button.innerHTML = `<span>${item.score} / 10 点</span> <span class="score-date">${item.date}</span>`;
        
        if (item.questions && item.answers && item.questions.length > 0) {
          button.onclick = () => showQuizReview(item.questions, item.answers, 1);
        } else {
          button.disabled = true;
          button.title = 'この履歴には詳細データがありません。';
        }
        
        li.appendChild(button);
        scoreList.appendChild(li);
      });
    }
  }
  
  function showQuizReview(questionIndexes, answers, page) {
    showScreen('review');
    const reviewDetails = document.getElementById('review-details');
    reviewDetails.innerHTML = '';
    reviewDetails.scrollTop = 0;

    const itemsPerPage = 5;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedIndexes = questionIndexes.slice(start, end);

    paginatedIndexes.forEach((qIndex, i) => {
      const q = questions.find(item => item.index === qIndex);
      const userAnswer = answers.find(ans => ans.questionIndex === qIndex);
      if (!q) return;

      const reviewItem = document.createElement('div');
      reviewItem.className = 'review-item';

      let correctOptionText = '';
      for (const key in q.correct) {
        if (q.correct[key] === 1) {
          correctOptionText = q.options[key];
          break;
        }
      }

      let userAnswerText = '無回答';
      let userAnswerClass = 'incorrect';
      if (userAnswer) {
        userAnswerText = q.options[userAnswer.selectedKey];
        if (q.correct[userAnswer.selectedKey] === 1) {
          userAnswerClass = 'correct';
        }
      }

      reviewItem.innerHTML = `
        <p class="review-question">${start + i + 1}. ${q.question}</p>
        <p class="review-user-answer ${userAnswerClass}">あなたの回答: ${userAnswerText}</p>
        <p class="review-correct-answer">正解: ${correctOptionText}</p>
        <p class="review-explanation">${q.explanation}</p>
      `;
      reviewDetails.appendChild(reviewItem);
    });

    const pageInfo = document.getElementById('review-page-info');
    const prevBtn = document.getElementById('prev-review-btn');
    const nextBtn = document.getElementById('next-review-btn');

    pageInfo.textContent = `ページ ${page} / 2`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === 2;

    prevBtn.onclick = () => showQuizReview(questionIndexes, answers, page - 1);
    nextBtn.onclick = () => showQuizReview(questionIndexes, answers, page + 1);
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
    } while (usedIndexes.includes(questions[index].index));

    usedIndexes.push(questions[index].index);
    counter++;
    return questions[index];
  }

  function showQuestionScreen() {
    document.getElementById('next-btn').textContent = '次の問題';
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

    // ヒント機能の初期化
    const hintBtn = document.getElementById('hint-btn');
    const hintText = document.getElementById('hint-text');
    hintBtn.style.display = 'inline-block';
    hintText.style.display = 'none';
    hintBtn.disabled = false;
    hintBtn.onclick = () => {
      hintText.textContent = q.hint;
      hintText.style.display = 'block';
      hintBtn.style.display = 'none';
    };
  }

  function checkAnswer(q, selectedKey) {
    userAnswers.push({ questionIndex: q.index, selectedKey: selectedKey });
    saveProgress();

    const feedbackContainer = document.getElementById('feedback-container');
    const correctFeedback = document.getElementById('feedback-correct');
    const incorrectFeedback = document.getElementById('feedback-incorrect');

    const buttons = document.getElementById('choices').getElementsByTagName('button');
    for (let btn of buttons) {
      btn.disabled = true;
    }
    
    // 回答後はヒントボタンを無効化
    document.getElementById('hint-btn').disabled = true;

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

      // ヒントを非表示にする
      document.getElementById('hint-btn').style.display = 'none';
      document.getElementById('hint-text').style.display = 'none';

      document.getElementById('explanation').textContent = q.explanation;
      document.getElementById('area').textContent = '生産地: ' + q.area;
      const nextBtn = document.getElementById('next-btn');
      if (counter >= 10) {
        nextBtn.textContent = '終了';
      }
      nextBtn.style.display = 'inline-block';
      saveProgress();
    }, 1000);
  }

  function showScore() {
    saveFinalScore();
    showScreen('score');
    document.getElementById('score').textContent = score;
    resetProgress();
  }

  // 初期化
  showScreen('start');
  checkProgress();
});
