// Global variables
let currentImage = null;
let score = 0;
let totalGuesses = 0;

// DOM Elements
const mikuImage = document.getElementById('current-miku');
const guessInput = document.getElementById('guess-input');
const resultDiv = document.getElementById('result');
const scoreDiv = document.getElementById('score');
const submissionDetails = document.getElementById('submission-details');
const leaderboardList = document.getElementById('leaderboard-list');
const countrySuggestions = document.getElementById('country-suggestions');

// List of countries for autocomplete
const countries = [
    'Japan', 'United States', 'China', 'South Korea', 'United Kingdom',
    'France', 'Germany', 'Italy', 'Spain', 'Australia',
    // Add more countries as needed
];

// Initialize game
async function initGame() {
    updateScore();
    await loadNewImage();
    setupCountryAutocomplete();
}

// Load new image from Netlify function
async function loadNewImage() {
    try {
        const response = await fetch('/api/get-random-image');
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        currentImage = data;
        mikuImage.src = data.imageUrl;
        mikuImage.alt = 'Guess this Miku\'s country!';
        submissionDetails.classList.add('hidden');
        guessInput.value = '';
        resultDiv.innerHTML = '';
    } catch (error) {
        console.error('Error loading image:', error);
        resultDiv.innerHTML = 'Error loading image. Please try again.';
    }
}

// Handle guess submission
async function submitGuess() {
    if (!currentImage || !guessInput.value) return;

    const guess = guessInput.value.trim();
    const correct = guess.toLowerCase() === currentImage.country.toLowerCase();
    totalGuesses++;

    if (correct) {
        score++;
        resultDiv.innerHTML = '<span class="result-correct">Correct! 🎉</span>';
    } else {
        resultDiv.innerHTML = '<span class="result-wrong">Wrong! The correct answer was: ' + 
            currentImage.country + '</span>';
    }

    updateScore();
    showImageDetails();
    await updateLeaderboard();
}

// Show image details after guess
function showImageDetails() {
    document.getElementById('submitter-name').textContent = currentImage.submitterName || 'Anonymous';
    document.getElementById('artist-credit').textContent = currentImage.artistCredit || 'Unknown';
    document.getElementById('correct-country').textContent = currentImage.country;
    submissionDetails.classList.remove('hidden');
}

// Update score display
function updateScore() {
    const percentage = totalGuesses ? Math.round((score / totalGuesses) * 100) : 0;
    scoreDiv.textContent = `Score: ${score}/${totalGuesses} (${percentage}%)`;
}

// Load next image
async function nextMiku() {
    await loadNewImage();
}

// Setup country autocomplete
function setupCountryAutocomplete() {
    guessInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        
        if (!value) {
            countrySuggestions.style.display = 'none';
            return;
        }

        const filtered = countries.filter(country => 
            country.toLowerCase().includes(value)
        );

        if (filtered.length) {
            countrySuggestions.innerHTML = filtered
                .map(country => `<div class="country-suggestion">${country}</div>`)
                .join('');
            countrySuggestions.style.display = 'block';
        } else {
            countrySuggestions.style.display = 'none';
        }
    });

    countrySuggestions.addEventListener('click', (e) => {
        if (e.target.classList.contains('country-suggestion')) {
            guessInput.value = e.target.textContent;
            countrySuggestions.style.display = 'none';
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.guess-input-container')) {
            countrySuggestions.style.display = 'none';
        }
    });
}

// Update leaderboard
async function updateLeaderboard() {
    try {
        const response = await fetch('/api/update-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ score, totalGuesses })
        });
        
        const leaderboard = await response.json();
        
        leaderboardList.innerHTML = leaderboard
            .map((entry, index) => `
                <div class="leaderboard-item">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${entry.username}</span>
                    <span class="leaderboard-score">${entry.score}/${entry.totalGuesses}</span>
                </div>
            `)
            .join('');
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);