import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const Chatbot = ({ isOpen, onClose, currentSection }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI assistant for the crop price prediction system. I can help you with price analysis, predictions, data visualization, and more. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en-US'); // 'kn-IN' for Kannada, 'en-US' for English
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = currentLanguage; // Dynamic language support

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Function to detect if text contains Kannada characters
  const detectLanguage = (text) => {
    // Kannada Unicode range: 0C80-0CFF
    const kannadaRegex = /[\u0C80-\u0CFF]/;
    return kannadaRegex.test(text) ? 'kn-IN' : 'en-US';
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Detect language from user input
    const detectedLanguage = detectLanguage(inputMessage);
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          context: `User is currently on the ${currentSection} section of the crop price prediction system. User is speaking in ${detectedLanguage === 'kn-IN' ? 'Kannada' : 'English'}.`,
          chatHistory: messages.slice(-10), // Send last 10 messages for context
          userLanguage: detectedLanguage // Send detected language to server
        })
      });

      const data = await response.json();

              if (data.success) {
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            content: data.reply,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
          // Auto-speak bot responses in detected language
          speakMessage(data.reply, detectedLanguage);
        } else {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.reply || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      // Update recognition language before starting
      recognitionRef.current.lang = currentLanguage;
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'kn-IN' ? 'en-US' : 'kn-IN';
    setCurrentLanguage(newLang);
  };

  const speakMessage = (text, language = currentLanguage) => {
    if ('speechSynthesis' in window) {
      if (speechRef.current) {
        speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      utterance.lang = language; // Use detected language for speech
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      speechRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="chatbot-overlay" onClick={onClose}>
      <div className="chatbot-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-title">
            <span className="chatbot-icon">🌾</span>
            <span>My Crops</span>
            <button 
              className="language-toggle"
              onClick={toggleLanguage}
              title={`Switch to ${currentLanguage === 'kn-IN' ? 'English' : 'Kannada'}`}
            >
              {currentLanguage === 'kn-IN' ? '🇺🇸' : '🇮🇳'}
            </button>
          </div>
          <button className="chatbot-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chatbot-message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-content">
                {message.content}
                {message.type === 'bot' && (
                  <button 
                    className="message-speak"
                    onClick={() => speakMessage(message.content)}
                    title="Listen to message"
                  >
                    🔊
                  </button>
                )}
              </div>
              <div className="message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="chatbot-message bot-message">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-container">
          <div className="input-wrapper">
            <textarea
              className="chatbot-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={isLoading}
              rows={1}
            />
            <button 
              className={`chatbot-mic ${isListening ? 'listening' : ''}`} 
              title="Voice input"
              onClick={startListening}
              disabled={isLoading}
            >
              <span>{isListening ? '🔴' : '🎤'}</span>
            </button>
          </div>
          <button
            className="chatbot-send"
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            <span>➤</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot; 