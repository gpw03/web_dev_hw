document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('usernameInput').value;
    const password = document.getElementById('passwordInput').value;
    console.log('in');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Logged in');
        localStorage.setItem('token', data.token);
        window.location.href = 'notes.html';
      } else {
        console.log('Wrong stuff ');
        alert('Username or password incorrect.');
      }
    } catch (error) {
      console.error('Error loging in:', error);
    }
  });