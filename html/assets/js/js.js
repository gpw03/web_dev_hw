document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});


document.getElementById('noteForm').addEventListener("submit", (ev) => {
    ev.preventDefault();

    console.log("In")
    const title = document.getElementById('title').value;
    const note = document.getElementById('note').value;
    const token = localStorage.getItem('token');

    console.log("Token being sent:", token);

    fetch ('/api', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, note }),
        redirect: 'follow',
    })
    .then(data => console.log(data.message))
    .catch(error => console.error("Note did not save: ", error));
    document.getElementById('noteForm').reset();
});

document.getElementById('showNotes').addEventListener('click', (e) => {
    const token = localStorage.getItem('token');
    fetch('/api', {
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(notes => {
        console.log(notes);
        let output = ''
        notes.forEach(note => {
            output += `<p><b>ID#:${note.note_id} ${note.note_title}:</b> ${note.note_content}</p>`;
        });
        document.getElementById('notes').innerHTML = output;
    })
    .catch(error => console.error("Error fetching notes:", error));
});