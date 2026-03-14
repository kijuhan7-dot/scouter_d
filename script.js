// 전역 변수
let words = [];
let currentQuiz = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;
let correctAnswer = null;
let scores = JSON.parse(localStorage.getItem('flashcardScores') || '[]');

// 단어 파일 로드
async function loadWords() {
    try {
        const response = await fetch('words.txt');
        const text = await response.text();
        parseWords(text);
        if (words.length > 0) {
            showNotification('단어를 성공적으로 불러왔습니다!', 'success');
        }
    } catch (error) {
        console.error('단어 파일 로드 실패:', error);
        showNotification('단어 파일을 불러올 수 없습니다.', 'error');
    }
}

// 단어 파싱
function parseWords(text) {
    words = [];
    const lines = text.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('구동사,의미')) {
            const [word, meaning, example] = line.split(',');
            if (word && meaning) {
                words.push({
                    word: word.trim(),
                    meaning: meaning.trim(),
                    example: example ? example.trim().replace(/"/g, '') : ''
                });
            }
        }
    }
    
    console.log(`총 ${words.length}개의 구동사를 불러왔습니다.`);
}

// 퀴즈 시작
function startQuiz() {
    if (words.length < 4) {
        showNotification('단어가 부족합니다. 최소 4개 이상의 단어가 필요합니다.', 'error');
        return;
    }
    
    // 랜덤으로 10개 단어 선택
    currentQuiz = [];
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    currentQuiz = shuffled.slice(0, Math.min(10, shuffled.length));
    
    currentQuestionIndex = 0;
    score = 0;
    
    // 예문 섹션 숨기기
    document.getElementById('exampleSection').classList.add('hidden');
    
    // 화면 전환
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('quizScreen').classList.remove('hidden');
    document.getElementById('scoresScreen').classList.add('hidden');
    
    showQuestion();
}

// 문제 표시
function showQuestion() {
    if (currentQuestionIndex >= currentQuiz.length) {
        showResult();
        return;
    }
    
    const currentWord = currentQuiz[currentQuestionIndex];
    const questionNumber = currentQuestionIndex + 1;
    
    // UI 업데이트
    document.getElementById('currentWord').textContent = currentWord.word;
    document.getElementById('currentQuestion').textContent = questionNumber;
    document.getElementById('progressText').textContent = `${questionNumber}/${currentQuiz.length}`;
    document.getElementById('progressBar').style.width = `${(questionNumber / currentQuiz.length) * 100}%`;
    
    // 선택지 생성
    correctAnswer = Math.floor(Math.random() * 4);
    const options = [];
    
    // 정답 추가
    options[correctAnswer] = currentWord.meaning;
    
    // 오답 선택
    const wrongOptions = [];
    const usedWords = new Set([currentWord.word]);
    
    while (wrongOptions.length < 3) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        if (!usedWords.has(randomWord.word) && !wrongOptions.includes(randomWord.meaning)) {
            wrongOptions.push(randomWord.meaning);
            usedWords.add(randomWord.word);
        }
    }
    
    // 나머지 선택지 채우기
    for (let i = 0; i < 4; i++) {
        if (i !== correctAnswer) {
            options[i] = wrongOptions.pop();
        }
    }
    
    // 선택지 표시
    for (let i = 0; i < 4; i++) {
        document.getElementById(`optionText${i}`).textContent = options[i];
        document.getElementById(`option${i}`).className = 'quiz-option bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-300 rounded-lg p-6 text-left transition-all duration-200';
        document.getElementById(`option${i}`).disabled = false;
    }
    
    document.getElementById('nextButton').classList.add('hidden');
    selectedAnswer = null;
    
    // 페이드인 효과
    document.getElementById('quizScreen').classList.add('fade-in');
}

// 답변 선택
function selectAnswer(index) {
    if (selectedAnswer !== null) return;
    
    selectedAnswer = index;
    const isCorrect = index === correctAnswer;
    
    // 선택한 답변 표시
    const selectedButton = document.getElementById(`option${index}`);
    selectedButton.className = selectedButton.className.replace('bg-gray-50', isCorrect ? 'correct' : 'incorrect');
    
    // 정답 표시
    if (!isCorrect) {
        const correctButton = document.getElementById(`option${correctAnswer}`);
        correctButton.className = correctButton.className.replace('bg-gray-50', 'correct');
    }
    
    // 점수 업데이트
    if (isCorrect) {
        score++;
        document.getElementById('currentScore').textContent = score;
        
        // 정답인 경우 예문 표시
        const currentWord = currentQuiz[currentQuestionIndex];
        if (currentWord.example) {
            document.getElementById('exampleText').textContent = currentWord.example;
            document.getElementById('exampleSection').classList.remove('hidden');
        }
    }
    
    // 모든 버튼 비활성화
    for (let i = 0; i < 4; i++) {
        document.getElementById(`option${i}`).disabled = true;
    }
    
    // 다음 버튼 표시
    document.getElementById('nextButton').classList.remove('hidden');
}

// 다음 문제
function nextQuestion() {
    currentQuestionIndex++;
    // 예문 섹션 숨기기
    document.getElementById('exampleSection').classList.add('hidden');
    showQuestion();
}

// 결과 표시
function showResult() {
    // 점수 저장
    const finalScore = Math.round((score / currentQuiz.length) * 100);
    const scoreData = {
        date: new Date().toISOString(),
        score: finalScore,
        correct: score,
        total: currentQuiz.length
    };
    
    scores.push(scoreData);
    localStorage.setItem('flashcardScores', JSON.stringify(scores));
    
    // UI 업데이트
    document.getElementById('finalScore').textContent = `${finalScore}점`;
    document.getElementById('correctCount').textContent = score;
    
    // 화면 전환
    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
}

// 퀴즈 재시작
function restartQuiz() {
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('currentScore').textContent = '0';
}

// 점수 기록 표시
function showScores() {
    const scoresList = document.getElementById('scoresList');
    
    if (scores.length === 0) {
        scoresList.innerHTML = `
            <div class="text-center text-gray-600 py-8">
                <i class="fas fa-chart-line text-4xl mb-4"></i>
                <p>점수 기록이 없습니다.</p>
            </div>
        `;
    } else {
        scoresList.innerHTML = scores.slice(-10).reverse().map((score, index) => {
            const date = new Date(score.date);
            const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            return `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <div class="font-semibold">${score.score}점</div>
                        <div class="text-sm text-gray-600">${dateStr}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-600">${score.correct}/${score.total} 맞춤</div>
                        <div class="text-xs text-gray-500">${Math.round((score.correct / score.total) * 100)}% 정답률</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    document.getElementById('scoresScreen').classList.remove('hidden');
}

// 점수 기록 숨기기
function hideScores() {
    document.getElementById('scoresScreen').classList.add('hidden');
}

// 단어 편집기 표시
function showWordEditor() {
    const editor = document.getElementById('wordEditor');
    let content = '단어,의미\n';
    
    words.forEach(word => {
        content += `${word.word},${word.meaning}\n`;
    });
    
    editor.value = content;
    document.getElementById('wordEditorModal').classList.remove('hidden');
}

// 단어 편집기 숨기기
function hideWordEditor() {
    document.getElementById('wordEditorModal').classList.add('hidden');
}

// 단어 저장
function saveWords() {
    const content = document.getElementById('wordEditor').value;
    parseWords(content);
    hideWordEditor();
    showNotification('단어가 저장되었습니다.', 'success');
}

// 파일 업로드 처리
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        parseWords(e.target.result);
        showNotification('파일이 성공적으로 업로드되었습니다.', 'success');
    };
    reader.readAsText(file);
}

// 알림 표시
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            } mr-2"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
    loadWords();
});