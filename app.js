// Core game variables
let deck = [];
let hardQueue = []; // Each item: { card, target }
let newWordCount = 0;
let currentCard = null;
let totalCards = 0;
let correctCount = 0;

// Performance tracking variables
let sessionData = {
  startTime: Date.now(),
  answers: [],
  sessionId: generateSessionId()
};

let performanceData = loadPerformanceData();
let charts = {};

// Generate unique session ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Load performance data from localStorage
function loadPerformanceData() {
  const saved = localStorage.getItem('learnwords_performance');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    sessions: [],
    totalCards: 0,
    totalCorrect: 0,
    streak: { count: 0, lastDate: null },
    dailyStats: {}
  };
}

// Save performance data to localStorage
function savePerformanceData() {
  localStorage.setItem('learnwords_performance', JSON.stringify(performanceData));
}

// Track answer for performance analysis
function trackAnswer(isCorrect, responseTime, card) {
  const answerData = {
    timestamp: Date.now(),
    isCorrect,
    responseTime,
    word: card.original,
    translation: card.translated,
    sessionId: sessionData.sessionId
  };
  
  sessionData.answers.push(answerData);
  
  // Update daily stats
  const today = new Date().toDateString();
  if (!performanceData.dailyStats[today]) {
    performanceData.dailyStats[today] = {
      correct: 0,
      total: 0,
      totalTime: 0,
      sessions: 0
    };
  }
  
  performanceData.dailyStats[today].total++;
  performanceData.dailyStats[today].totalTime += responseTime;
  
  if (isCorrect) {
    performanceData.dailyStats[today].correct++;
  }
}

// End session and save data
function endSession() {
  if (sessionData.answers.length === 0) return;
  
  const sessionSummary = {
    sessionId: sessionData.sessionId,
    startTime: sessionData.startTime,
    endTime: Date.now(),
    totalCards: sessionData.answers.length,
    correctAnswers: sessionData.answers.filter(a => a.isCorrect).length,
    averageResponseTime: sessionData.answers.reduce((sum, a) => sum + a.responseTime, 0) / sessionData.answers.length,
    answers: sessionData.answers
  };
  
  performanceData.sessions.push(sessionSummary);
  performanceData.totalCards += sessionSummary.totalCards;
  performanceData.totalCorrect += sessionSummary.correctAnswers;
  
  // Update streak
  updateStreak();
  
  // Mark session complete in daily stats
  const today = new Date().toDateString();
  if (performanceData.dailyStats[today]) {
    performanceData.dailyStats[today].sessions++;
  }
  
  savePerformanceData();
  updateStatisticsDisplay();
}

// Update study streak
function updateStreak() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  if (performanceData.streak.lastDate === today) {
    // Already studied today, streak continues
    return;
  } else if (performanceData.streak.lastDate === yesterday || performanceData.streak.lastDate === null) {
    // Studied yesterday or first time, increment streak
    performanceData.streak.count++;
    performanceData.streak.lastDate = today;
  } else {
    // Missed a day, reset streak
    performanceData.streak.count = 1;
    performanceData.streak.lastDate = today;
  }
}

// Load the words from the JSON file and shuffle them
function loadCards() {
  fetch('words.json')
    .then(response => response.json())
    .then(data => {
      deck = data;
      totalCards = deck.length;
      shuffle(deck);
      showNextCard();
      updateStats();
      initializeCharts();
    })
    .catch(error => {
      document.getElementById("original-word").textContent = "Error loading cards.";
      console.error("Error loading JSON:", error);
    });
}

// Display the next flashcard
function showNextCard() {
  // Reset UI elements
  document.getElementById("user-answer").value = "";
  document.getElementById("feedback").textContent = "";
  document.getElementById("translated-word").style.display = "none";
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("submit-btn").style.display = "inline-flex";
  document.getElementById("show-btn").style.display = "inline-flex";
  document.getElementById("hard-btn").style.display = "inline-flex";
  document.getElementById("easy-btn").style.display = "inline-flex";
  
  // Check hardQueue: reinsert cards whose target has been reached
  hardQueue = hardQueue.filter(item => {
    if (newWordCount >= item.target) {
      deck.push(item.card);
      return false;
    }
    return true;
  });

  if (deck.length === 0) {
    endSession();
    document.getElementById("flashcard").innerHTML = `
      <h2><i class="fas fa-trophy"></i> Session Complete!</h2>
      <p>You've completed all the flashcards.</p>
      <p><strong>Correct answers:</strong> ${correctCount}/${totalCards}</p>
      <p><strong>Accuracy:</strong> ${Math.round((correctCount/totalCards) * 100)}%</p>
      <button onclick="window.location.reload()"><i class="fas fa-redo"></i> Start Over</button>
      <button onclick="showTab('stats-tab')"><i class="fas fa-chart-line"></i> View Performance</button>
    `;
    return;
  }

  // Get the next card and track timing
  currentCard = deck.shift();
  newWordCount++;
  sessionData.cardStartTime = Date.now();

  // Update the flashcard display with animation
  const wordElement = document.getElementById("original-word");
  
  wordElement.style.opacity = 0;
  
  setTimeout(() => {
    wordElement.textContent = currentCard.original;
    wordElement.style.opacity = 1;
  }, 200);
  
  document.getElementById("translated-word").textContent = currentCard.translated;
  updateProgress();
  
  setTimeout(() => {
    document.getElementById("user-answer").focus();
  }, 300);
  
  updateStats();
}

// Check answer with performance tracking
function checkAnswer() {
  const userInput = document.getElementById("user-answer").value.trim().toLowerCase();
  const correctAnswer = currentCard.translated.trim().toLowerCase();
  const feedbackElement = document.getElementById("feedback");
  const responseTime = Date.now() - sessionData.cardStartTime;
  
  const isCorrect = userInput === correctAnswer;
  
  // Track the answer
  trackAnswer(isCorrect, responseTime, currentCard);
  
  if (isCorrect) {
    feedbackElement.textContent = "Correct! 🎉";
    feedbackElement.style.color = "var(--correct-color)";
    feedbackElement.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
    correctCount++;
  } else {
    feedbackElement.textContent = "Incorrect. Try again or click 'Show Translation'.";
    feedbackElement.style.color = "var(--incorrect-color)";
    feedbackElement.style.backgroundColor = "rgba(244, 67, 54, 0.1)";
  }
  
  feedbackElement.style.padding = "10px";
  feedbackElement.style.borderRadius = "8px";
  feedbackElement.classList.add("pulse");
  
  setTimeout(() => {
    feedbackElement.classList.remove("pulse");
  }, 500);
  
  document.getElementById("next-btn").style.display = "inline-flex";
  document.getElementById("submit-btn").style.display = "none";
}

// Mark the current card as hard
function markAsHard() {
  const target = newWordCount + 10;
  hardQueue.push({ card: currentCard, target: target });
  
  const feedbackElement = document.getElementById("feedback");
  feedbackElement.textContent = "Marked as hard. Will reappear later.";
  feedbackElement.style.color = "var(--hard-color)";
  feedbackElement.style.backgroundColor = "rgba(255, 152, 0, 0.1)";
  feedbackElement.style.padding = "10px";
  feedbackElement.style.borderRadius = "8px";
  
  document.getElementById("next-btn").style.display = "inline-flex";
  document.getElementById("submit-btn").style.display = "none";
  document.getElementById("hard-btn").style.display = "none";
  document.getElementById("easy-btn").style.display = "none";
  
  updateStats();
}

// Mark card as easy
function markAsEasy() {
  const cardInHardQueue = hardQueue.findIndex(item => 
    item.card.original === currentCard.original && 
    item.card.translated === currentCard.translated
  );
  
  const feedbackElement = document.getElementById("feedback");
  
  if (cardInHardQueue !== -1) {
    hardQueue.splice(cardInHardQueue, 1);
    feedbackElement.textContent = "Card removed from hard queue! ✓";
  } else {
    feedbackElement.textContent = "Card marked as easy ✓";
  }
  
  feedbackElement.style.color = "var(--correct-color)";
  feedbackElement.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
  feedbackElement.style.padding = "10px";
  feedbackElement.style.borderRadius = "8px";
  feedbackElement.classList.add("pulse");
  
  setTimeout(() => {
    feedbackElement.classList.remove("pulse");
  }, 500);
  
  document.getElementById("next-btn").style.display = "inline-flex";
  document.getElementById("submit-btn").style.display = "none";
  document.getElementById("hard-btn").style.display = "none";
  document.getElementById("easy-btn").style.display = "none";
  
  updateStats();
}

// Update progress bar
function updateProgress() {
  const progressBar = document.getElementById("progress-bar");
  const progress = (newWordCount / totalCards) * 100;
  progressBar.style.width = `${progress}%`;
}

// Update stats display
function updateStats() {
  document.getElementById("remaining-count").textContent = `Cards remaining: ${deck.length}`;
  document.getElementById("hard-count").textContent = `Hard cards: ${hardQueue.length}`;
}

// Tab switching functionality
function showTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabId).classList.add('active');
  
  // Add active class to corresponding button
  const activeButton = Array.from(document.querySelectorAll('.tab-button'))
    .find(button => button.onclick.toString().includes(tabId));
  if (activeButton) {
    activeButton.classList.add('active');
  }
  
  // Update charts if switching to stats tab
  if (tabId === 'stats-tab') {
    updateStatisticsDisplay();
    updateCharts();
  }
}

// Initialize all charts
function initializeCharts() {
  // Accuracy over time chart
  const accuracyCtx = document.getElementById('accuracyChart').getContext('2d');
  charts.accuracy = new Chart(accuracyCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Accuracy %',
        data: [],
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });

  // Daily study progress chart
  const dailyCtx = document.getElementById('dailyChart').getContext('2d');
  charts.daily = new Chart(dailyCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Cards Studied',
        data: [],
        backgroundColor: '#2196F3',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });

  // Performance distribution pie chart
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  charts.pie = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Incorrect'],
      datasets: [{
        data: [0, 0],
        backgroundColor: ['#4CAF50', '#f44336'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });

  // Response time trends chart
  const timeCtx = document.getElementById('timeChart').getContext('2d');
  charts.time = new Chart(timeCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Average Response Time (seconds)',
        data: [],
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + 's';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
  
  updateCharts();
}

// Update all charts with current data
function updateCharts() {
  if (!charts.accuracy) return;
  
  // Get last 10 sessions for accuracy chart
  const recentSessions = performanceData.sessions.slice(-10);
  charts.accuracy.data.labels = recentSessions.map((_, index) => `Session ${index + 1}`);
  charts.accuracy.data.datasets[0].data = recentSessions.map(session => 
    Math.round((session.correctAnswers / session.totalCards) * 100)
  );
  charts.accuracy.update();
  
  // Get last 7 days for daily chart
  const last7Days = Array.from({length: 7}, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    return date.toDateString();
  });
  
  charts.daily.data.labels = last7Days.map(date => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  });
  charts.daily.data.datasets[0].data = last7Days.map(date => 
    performanceData.dailyStats[date]?.total || 0
  );
  charts.daily.update();
  
  // Update pie chart with overall performance
  const totalCorrect = performanceData.totalCorrect;
  const totalIncorrect = performanceData.totalCards - totalCorrect;
  charts.pie.data.datasets[0].data = [totalCorrect, totalIncorrect];
  charts.pie.update();
  
  // Get average response times for last 10 sessions
  charts.time.data.labels = recentSessions.map((_, index) => `Session ${index + 1}`);
  charts.time.data.datasets[0].data = recentSessions.map(session => 
    Math.round(session.averageResponseTime / 1000 * 10) / 10
  );
  charts.time.update();
}

// Update statistics display
function updateStatisticsDisplay() {
  document.getElementById('total-sessions').textContent = performanceData.sessions.length;
  document.getElementById('total-cards-studied').textContent = performanceData.totalCards;
  
  const avgAccuracy = performanceData.totalCards > 0 
    ? Math.round((performanceData.totalCorrect / performanceData.totalCards) * 100)
    : 0;
  document.getElementById('avg-accuracy').textContent = avgAccuracy + '%';
  document.getElementById('study-streak').textContent = performanceData.streak.count + ' days';
}

// Reset all statistics
function resetStatistics() {
  if (confirm('Are you sure you want to reset all statistics? This action cannot be undone.')) {
    localStorage.removeItem('learnwords_performance');
    performanceData = loadPerformanceData();
    updateStatisticsDisplay();
    updateCharts();
    alert('All statistics have been reset.');
  }
}

// Export statistics data
function exportStatistics() {
  const dataStr = JSON.stringify(performanceData, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `learnwords_stats_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}

// Event listeners for buttons
document.getElementById("submit-btn").addEventListener("click", checkAnswer);
document.getElementById("user-answer").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    checkAnswer();
  }
});

document.getElementById("show-btn").addEventListener("click", () => {
  const translatedElement = document.getElementById("translated-word");
  translatedElement.style.display = "block";
  translatedElement.classList.add("pulse");
  
  setTimeout(() => {
    translatedElement.classList.remove("pulse");
  }, 500);
  
  document.getElementById("next-btn").style.display = "inline-flex";
  document.getElementById("submit-btn").style.display = "none";
});

document.getElementById("hard-btn").addEventListener("click", markAsHard);
document.getElementById("easy-btn").addEventListener("click", markAsEasy);
document.getElementById("next-btn").addEventListener("click", showNextCard);

// Statistics panel event listeners
document.addEventListener('DOMContentLoaded', function() {
  const resetBtn = document.getElementById('reset-stats-btn');
  const exportBtn = document.getElementById('export-stats-btn');
  
  if (resetBtn) resetBtn.addEventListener('click', resetStatistics);
  if (exportBtn) exportBtn.addEventListener('click', exportStatistics);
});

// Fisher-Yates shuffle algorithm
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Start the application
window.onload = function() {
  loadCards();
  updateStatisticsDisplay();
};

// Save session data when page is closed
window.addEventListener('beforeunload', function() {
  if (sessionData.answers.length > 0) {
    endSession();
  }
});