document.getElementById('signup').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('usernameInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

    const data = await response.json();

    if (response.ok) {
        // Successful signup
        alert('User successfully created');
        // Optionally, redirect to another page
        window.location.href = 'index.html'; // Redirect to login page after successful signup
    } else {
        alert('User not created.');
    }
    } catch (error) {
      console.error('Error during signup:', error);
    }

});