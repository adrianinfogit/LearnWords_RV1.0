let deck = [];
let hardQueue = []; // Each item: { card, target }
let newWordCount = 0;
let currentCard = null;

// Add this line to the <head> section of your HTML file
document.head.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1">';

// Load the words from the JSON file and shuffle them
function loadCards() {
  fetch('words.json')
    .then(response => response.json())
    .then(data => {
      deck = data;
      shuffle(deck);
      showNextCard();
    })
    .catch(error => {
      document.getElementById("original-word").textContent = "Error loading cards.";
      console.error("Error loading JSON:", error);
    });
}

// Display the next flashcard, checking if any "hard" cards should be reinserted.
function showNextCard() {
  // Check hardQueue: reinsert cards whose target has been reached
  hardQueue = hardQueue.filter(item => {
    if (newWordCount >= item.target) {
      deck.push(item.card);
      return false; // Remove this card from the hardQueue
    }
    return true;
  });

  if (deck.length === 0) {
    document.getElementById("flashcard").innerHTML = "<h2>Session complete!</h2>";
    return;
  }

  // Get the next card
  currentCard = deck.shift();
  newWordCount++; // Count this as a new word shown

  // Update the flashcard display
  document.getElementById("original-word").textContent = currentCard.original;
  document.getElementById("translated-word").style.display = "none";
  document.getElementById("translated-word").textContent = currentCard.translated;
  document.getElementById("user-answer").value = "";
  document.getElementById("feedback").textContent = "";
}

// Simple case-insensitive check of the answer
function checkAnswer() {
  const userInput = document.getElementById("user-answer").value.trim().toLowerCase();
  const correctAnswer = currentCard.translated.trim().toLowerCase();
  if (userInput === correctAnswer) {
    document.getElementById("feedback").textContent = "Correct!";
    document.getElementById("feedback").style.color = "green";
  } else {
    document.getElementById("feedback").textContent = "Incorrect! Try again or click 'Show Translation'.";
    document.getElementById("feedback").style.color = "red";
  }
  document.getElementById("next-btn").style.display = "inline-block";
}

// Mark the current card as hard so that it will reappear after 10 new words.
function markAsHard() {
  // Schedule the card to reappear after 10 new words
  const target = newWordCount + 10;
  hardQueue.push({ card: currentCard, target: target });
  document.getElementById("feedback").textContent = "Marked as hard. This card will reappear after 10 new words.";
  document.getElementById("feedback").style.color = "orange";
}

// Event listeners for buttons
document.getElementById("submit-btn").addEventListener("click", checkAnswer);

document.getElementById("show-btn").addEventListener("click", () => {
  document.getElementById("translated-word").style.display = "block";
});

document.getElementById("hard-btn").addEventListener("click", markAsHard);

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
