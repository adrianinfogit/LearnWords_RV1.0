let deck = [];
let hardQueue = []; // Each item: { card, target }
let newWordCount = 0;
let currentCard = null;
let totalCards = 0;
let correctCount = 0;

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
    })
    .catch(error => {
      document.getElementById("original-word").textContent = "Error loading cards.";
      console.error("Error loading JSON:", error);
    });
}

// Display the next flashcard, checking if any "hard" cards should be reinserted.
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
      return false; // Remove this card from the hardQueue
    }
    return true;
  });

  if (deck.length === 0) {
    document.getElementById("flashcard").innerHTML = `
      <h2>Session complete!</h2>
      <p>You've completed all the flashcards.</p>
      <p>Correct answers: ${correctCount}/${totalCards}</p>
      <button onclick="window.location.reload()">Start Over</button>
    `;
    return;
  }

  // Get the next card
  currentCard = deck.shift();
  newWordCount++; // Count this as a new word shown

  // Update the flashcard display with animation
  const wordElement = document.getElementById("original-word");
  
  // Fade out
  wordElement.style.opacity = 0;
  
  // After fade out, change content and fade in
  setTimeout(() => {
    wordElement.textContent = currentCard.original;
    wordElement.style.opacity = 1;
  }, 200);
  
  document.getElementById("translated-word").textContent = currentCard.translated;
  
  // Update progress bar
  updateProgress();
  
  // Focus on the input field
  setTimeout(() => {
    document.getElementById("user-answer").focus();
  }, 300);
  
  // Update stats display
  updateStats();
}

// Simple case-insensitive check of the answer
function checkAnswer() {
  const userInput = document.getElementById("user-answer").value.trim().toLowerCase();
  const correctAnswer = currentCard.translated.trim().toLowerCase();
  const feedbackElement = document.getElementById("feedback");
  
  if (userInput === correctAnswer) {
    feedbackElement.textContent = "Correct! 🎉";
    feedbackElement.style.color = "var(--correct-color)";
    feedbackElement.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
    feedbackElement.style.padding = "10px";
    feedbackElement.style.borderRadius = "8px";
    feedbackElement.classList.add("pulse");
    correctCount++;
  } else {
    feedbackElement.textContent = "Incorrect. Try again or click 'Show Translation'.";
    feedbackElement.style.color = "var(--incorrect-color)";
    feedbackElement.style.backgroundColor = "rgba(244, 67, 54, 0.1)";
    feedbackElement.style.padding = "10px";
    feedbackElement.style.borderRadius = "8px";
    feedbackElement.classList.add("pulse");
  }
  
  // Remove the animation class after it completes
  setTimeout(() => {
    feedbackElement.classList.remove("pulse");
  }, 500);
  
  document.getElementById("next-btn").style.display = "inline-flex";
  document.getElementById("submit-btn").style.display = "none";
}

// Mark the current card as hard so that it will reappear after 10 new words.
function markAsHard() {
  // Schedule the card to reappear after 10 new words
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

// Update the progress bar
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

// Event listeners for buttons
document.getElementById("submit-btn").addEventListener("click", checkAnswer);

// Also submit when pressing Enter in the input field
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

// Mark card as easy - remove it from the hard queue if present
function markAsEasy() {
  // Check if the current card is in the hard queue
  const cardInHardQueue = hardQueue.findIndex(item => 
    item.card.original === currentCard.original && 
    item.card.translated === currentCard.translated
  );
  
  const feedbackElement = document.getElementById("feedback");
  
  // If card is in hard queue, remove it
  if (cardInHardQueue !== -1) {
    hardQueue.splice(cardInHardQueue, 1);
    feedbackElement.textContent = "Card removed from hard queue! ✓";
    feedbackElement.style.color = "var(--correct-color)";
    feedbackElement.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
  } else {
    // If not in hard queue, just acknowledge
    feedbackElement.textContent = "Card marked as easy ✓";
    feedbackElement.style.color = "var(--correct-color)";
    feedbackElement.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
  }
  
  feedbackElement.style.padding = "10px";
  feedbackElement.style.borderRadius = "8px";
  feedbackElement.classList.add("pulse");
  
  // Remove the animation class after it completes
  setTimeout(() => {
    feedbackElement.classList.remove("pulse");
  }, 500);
  
  document.getElementById("next-btn").style.display = "inline-flex";
  document.getElementById("submit-btn").style.display = "none";
  document.getElementById("hard-btn").style.display = "none";
  document.getElementById("easy-btn").style.display = "none";
  
  updateStats();
}

document.getElementById("easy-btn").addEventListener("click", markAsEasy);

document.getElementById("next-btn").addEventListener("click", showNextCard);

// Fisher-Yates shuffle algorithm to randomize the deck
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Start the application
window.onload = loadCards;
