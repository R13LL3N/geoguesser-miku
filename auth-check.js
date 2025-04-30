// Check authentication status and update navigation
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const nav = document.querySelector('nav');

    if (token && username) {
        // User is logged in
        try {
            const response = await fetch('/api/verify-token', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Invalid token');
            }

            // Update navigation for logged-in user
            nav.innerHTML = `
                <span class="user-welcome">Welcome, ${username}!</span>
                <a href="./index.html">Play Game</a>
                <a href="./submit.html">Submit Miku</a>
                <a href="#" id="logout-btn">Logout</a>
            `;

            // Add logout handler
            document.getElementById('logout-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('authToken');
                localStorage.removeItem('username');
                window.location.href = './index.html';
            });

        } catch (error) {
            // Token is invalid, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            updateNavForGuest();
        }
    } else {
        // User is not logged in
        updateNavForGuest();
    }
}

// Update navigation for guest users
function updateNavForGuest() {
    const nav = document.querySelector('nav');
    nav.innerHTML = `
        <a href="./index.html">Play Game</a>
        <a href="./auth.html">Login/Signup</a>
        <a href="./submit.html">Submit Miku</a>
    `;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', checkAuth);