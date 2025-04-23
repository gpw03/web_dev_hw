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
        // Notes is an object with an array notes inside
        notes.notes.forEach(note => {
            output += `<p><b>ID#:${note.note_id} ${note.note_title}:</b> ${note.note_content}</p>`;
        });
        document.getElementById('notes').innerHTML = output;
    })
    .catch(error => console.error("Error fetching notes:", error));
});

document.getElementById('globalNotes').addEventListener('submit', (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const globalNote = document.getElementById('globalNote').value;
    fetch('/api/global', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ globalNote })
    })
    .then(response => response.json())
    .catch(error => console.error("Error fetching notes:", error));
});

function goFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.getElementById('fullScreen').textContent = 'Exit full screen mode';
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
        document.getElementById('fullScreen').textContent = 'Go full screen';
    }
}

document.getElementById('fullScreen').addEventListener("click", () => {
    goFullScreen();
});

let wsurl
if(window.location.protocol == 'http:'){
    console.log('http ws');
    wsurl = 'ws://localhost:3000';
} else{
    console.log('https wss');
    wsurl = 'wss://' + window.location.host;
};


const token = localStorage.getItem('token');
wsurl = `${wsurl}?token=${token}`;
let sock = new WebSocket(wsurl);
sock.addEventListener('message', ({ data }) => {
    const parsed = JSON.parse(data);
    console.log(parsed);
    if (parsed.type === 'newNote'){
        let output = '';
        parsed.note.forEach(note => {
            output += `<p><b>Username:${note.username} </b> ${note.note}</p>`;
        });
        document.getElementById('global').innerHTML = output;
    } else {
        console.log('From Web Socket:', parsed);
    }
});