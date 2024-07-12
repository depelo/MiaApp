import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    socket.on('paired', ({ partnerId }) => {
      setPartnerId(partnerId);
      setMessage(`Emparejado con: ${partnerId}`);
    });

    socket.on('receiveMessage', ({ senderId, message }) => {
      setChatHistory(prevHistory => [...prevHistory, { senderId, message }]);
    });

    const intervalId = setInterval(() => {
      if (!partnerId && userId) {
        fetch(`http://localhost:3001/status/${userId}`)
          .then(response => response.json())
          .then(data => {
            if (data.paired) {
              setPartnerId(data.partnerId);
              setMessage(`Emparejado con: ${data.partnerId}`);
              socket.emit('join', userId);
            }
          })
          .catch(error => console.error('Error:', error));
      }
    }, 3000); // Verificar cada 3 segundos

    return () => {
      clearInterval(intervalId);
      socket.off('paired');
      socket.off('receiveMessage');
    };
  }, [userId, partnerId]);

  const joinQueue = () => {
    fetch('http://localhost:3001/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.paired) {
          setPartnerId(data.partnerId);
          setMessage(`Emparejado con: ${data.partnerId}`);
          socket.emit('join', userId);
        } else {
          setMessage('Esperando emparejamiento...');
        }
      })
      .catch(error => console.error('Error:', error));
  };

  const checkStatus = () => {
    fetch(`http://localhost:3001/status/${userId}`)
      .then(response => response.json())
      .then(data => {
        if (data.paired) {
          setPartnerId(data.partnerId);
          setMessage(`Emparejado con: ${data.partnerId}`);
          socket.emit('join', userId);
        } else {
          setMessage('Aún no emparejado.');
        }
      })
      .catch(error => console.error('Error:', error));
  };

  const sendMessage = () => {
    if (partnerId) {
      socket.emit('sendMessage', { senderId: userId, receiverId: partnerId, message: chatMessage });
      setChatHistory(prevHistory => [...prevHistory, { senderId: userId, message: chatMessage }]);
      setChatMessage('');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <input
          type="text"
          placeholder="Ingrese su ID de usuario"
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <button onClick={joinQueue}>Unirse a la cola</button>
        <button onClick={checkStatus}>Verificar estado</button>
        <p>{message}</p>
        {partnerId && (
          <>
            <div>
              <h2>Chat</h2>
              <div style={{ border: '1px solid black', padding: '10px', height: '200px', overflowY: 'scroll' }}>
                {chatHistory.map((msg, index) => (
                  <p key={index}><strong>{msg.senderId}:</strong> {msg.message}</p>
                ))}
              </div>
              <input
                type="text"
                placeholder="Escriba su mensaje"
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
              />
              <button onClick={sendMessage}>Enviar mensaje</button>
            </div>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
