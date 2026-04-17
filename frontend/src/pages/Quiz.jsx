import React, { useState, useEffect } from 'react';

const Quiz = () => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [xp, setXp] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Mock questions for early layout
    setQuestions([
      { id: 1, type: 'mcq', question: 'What is ML?', options: ['Machine Learning', 'Much Love', 'Major League'], correct: 'Machine Learning', explanation: 'ML stands for Machine Learning in CS.' },
      { id: 2, type: 'short', question: 'Explain AI briefly.', correct: 'Artificial Intelligence', explanation: 'AI simulates human intelligence.' }
    ]);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer) return;
    
    const currentQ = questions[currentIndex];
    const isCorrect = typeof currentQ.correct === 'string' ? answer.toLowerCase().includes(currentQ.correct.toLowerCase()) : answer === currentQ.correct;

    if (isCorrect) {
      setScore(s => s + 1);
      setXp(x => x + 50); // XP Animation can be triggered by state change
      setFeedback({ correct: true, text: 'Correct! ' + currentQ.explanation });
    } else {
      setFeedback({ correct: false, text: 'Incorrect. ' + currentQ.explanation });
    }
  };

  const handleNext = () => {
    setAnswer('');
    setFeedback(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (questions.length === 0) return <div className="p-8 text-white">Loading...</div>;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl text-center shadow-lg w-96 animate-fadeIn">
          <h1 className="text-4xl font-bold mb-4 text-green-400">Quiz Complete!</h1>
          <p className="text-2xl mb-2">Score: {score}/{questions.length}</p>
          <div className="text-xl mb-6 font-bold text-yellow-400 flex items-center justify-center gap-2">
            <span>⭐</span> +{xp} XP Earned
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold transition">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 pt-16 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-gray-800 rounded-xl p-8 relative overflow-hidden shadow-2xl">
        {/* XP Bar Animation */}
        <div className="absolute top-0 left-0 h-2 bg-blue-900 w-full">
          <div className="h-full bg-yellow-400 transition-all duration-1000 ease-out" style={{ width: `${(xp % 1000) / 10}%` }}></div>
        </div>
        
        <div className="flex justify-between items-center mb-6 text-gray-400">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="font-bold text-yellow-400">⭐ {xp} XP</span>
        </div>

        <h2 className="text-2xl font-bold mb-8">{currentQ.question}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentQ.type === 'mcq' && currentQ.options.map((opt, i) => (
            <label key={i} className="flex items-center gap-3 p-4 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 border border-transparent focus-within:border-blue-500 transition">
              <input type="radio" name="answer" value={opt} onChange={(e) => setAnswer(e.target.value)} checked={answer === opt} className="w-5 h-5 accent-blue-500" disabled={!!feedback} />
              <span className="text-lg">{opt}</span>
            </label>
          ))}
          
          {currentQ.type === 'short' && (
            <textarea 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full p-4 bg-gray-700 rounded outline-none focus:ring-2 ring-blue-500"
              rows="4"
              placeholder="Type your answer here..."
              disabled={!!feedback}
            ></textarea>
          )}

          {!feedback ? (
            <button type="submit" disabled={!answer} className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold disabled:opacity-50 transition">
              Submit Answer
            </button>
          ) : (
            <div className={`p-4 rounded-lg mt-6 ${feedback.correct ? 'bg-green-900 border border-green-500' : 'bg-red-900 border border-red-500'} animate-fadeIn`}>
              <h3 className={`font-bold text-lg mb-2 ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>
                {feedback.correct ? '✓ Correct!' : '✗ Incorrect'}
              </h3>
              <p>{feedback.text}</p>
              <button type="button" onClick={handleNext} className="mt-4 w-full py-3 bg-white text-gray-900 hover:bg-gray-200 rounded font-bold transition">
                Continue
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Quiz;
