// 전역 변수
let words = [];
let currentQuiz = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;
let correctAnswer = null;
let scores = JSON.parse(localStorage.getItem('flashcardScores') || '[]');

// 세트 관련 변수
let setCount = 0;           // 현재까지 완료한 세트 수 (3세트마다 단어 업데이트)
let wrongAnswers = [];      // 현재 세트에서 틀린 문제 목록
let allWordGroups = [];     // 전체 단어를 10개씩 묶은 그룹
let currentGroupIndex = 0; // 현재 사용 중인 단어 그룹 인덱스

// 선택지 텍스트를 배열로 보관 (오답 피드백용)
let currentOptions = [];

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
    
    // 단어를 10개씩 그룹으로 나누기
    buildWordGroups();
    console.log(`총 ${words.length}개의 구동사를 불러왔습니다.`);
}

// 단어를 10개씩 그룹으로 나누기
function buildWordGroups() {
    allWordGroups = [];
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += 10) {
        allWordGroups.push(shuffled.slice(i, i + 10));
    }
    currentGroupIndex = 0;
}

// 퀴즈 시작
function startQuiz() {
    if (words.length < 4) {
        showNotification('단어가 부족합니다. 최소 4개 이상의 단어가 필요합니다.', 'error');
        return;
    }

    // 세트 추적 초기화 (최초 시작 혹은 재시작 시)
    if (setCount === 0) {
        buildWordGroups();
    }

    beginSet();
}

// 세트 시작 (공통 로직)
function beginSet() {
    // 현재 그룹이 없으면 재구성
    if (allWordGroups.length === 0) buildWordGroups();

    // 사용할 단어 그룹 선택
    const group = allWordGroups[currentGroupIndex % allWordGroups.length];
    currentQuiz = group.length >= 10 ? group : [...group];

    // 10개 미만이면 나머지를 채움
    if (currentQuiz.length < 10) {
        const extras = [...words]
            .filter(w => !currentQuiz.includes(w))
            .sort(() => Math.random() - 0.5)
            .slice(0, 10 - currentQuiz.length);
        currentQuiz = [...currentQuiz, ...extras];
    }

    currentQuestionIndex = 0;
    score = 0;
    wrongAnswers = [];
    currentOptions = [];

    // 헤더 세트 정보 업데이트
    updateSetInfo();

    // 예문 섹션 숨기기
    document.getElementById('exampleSection').classList.add('hidden');

    // 화면 전환
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('reviewScreen').classList.add('hidden');
    document.getElementById('quizScreen').classList.remove('hidden');
    document.getElementById('scoresScreen').classList.add('hidden');

    showQuestion();
}

// 세트 정보 표시 업데이트
function updateSetInfo() {
    const setInfoEl = document.getElementById('setInfo');
    if (setInfoEl) {
        const setsInCycle = setCount % 3;
        setInfoEl.textContent = `세트 ${setsInCycle + 1} / 3`;
    }
}

// 문제 표시
function showQuestion() {
    if (currentQuestionIndex >= currentQuiz.length) {
        showReviewScreen();
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
    const usedMeanings = new Set([currentWord.meaning]);
    
    while (wrongOptions.length < 3) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        if (!usedMeanings.has(randomWord.meaning)) {
            wrongOptions.push({ meaning: randomWord.meaning, word: randomWord.word });
            usedMeanings.add(randomWord.meaning);
        }
    }
    
    // 나머지 선택지 채우기 (오답 단어 정보도 보관)
    const optionMeta = []; // 각 index에 {meaning, word} 저장
    for (let i = 0; i < 4; i++) {
        if (i === correctAnswer) {
            optionMeta[i] = { meaning: currentWord.meaning, word: currentWord.word };
        } else {
            const wrong = wrongOptions.pop();
            options[i] = wrong.meaning;
            optionMeta[i] = wrong;
        }
    }
    options[correctAnswer] = currentWord.meaning;
    currentOptions = optionMeta;
    
    // 선택지 표시
    for (let i = 0; i < 4; i++) {
        document.getElementById(`optionText${i}`).textContent = options[i];
        document.getElementById(`option${i}`).className = 'quiz-option bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-300 rounded-lg p-6 text-left transition-all duration-200';
        document.getElementById(`option${i}`).disabled = false;
    }
    
    document.getElementById('nextButton').classList.add('hidden');
    document.getElementById('exampleSection').classList.add('hidden');
    document.getElementById('wrongFeedback').classList.add('hidden');
    selectedAnswer = null;
    
    // 페이드인 효과
    document.getElementById('quizScreen').classList.add('fade-in');
}

// 답변 선택
function selectAnswer(index) {
    if (selectedAnswer !== null) return;
    
    selectedAnswer = index;
    const isCorrect = index === correctAnswer;
    const currentWord = currentQuiz[currentQuestionIndex];
    
    // 선택한 답변 표시
    const selectedButton = document.getElementById(`option${index}`);
    if (isCorrect) {
        selectedButton.classList.add('correct');
        selectedButton.classList.remove('bg-gray-50');
    } else {
        selectedButton.classList.add('incorrect');
        selectedButton.classList.remove('bg-gray-50');
        // 정답 표시
        const correctButton = document.getElementById(`option${correctAnswer}`);
        correctButton.classList.add('correct');
        correctButton.classList.remove('bg-gray-50');
    }
    
    // 점수 업데이트
    if (isCorrect) {
        score++;
        document.getElementById('currentScore').textContent = score;
        
        // 정답인 경우 예문 표시
        if (currentWord.example) {
            document.getElementById('exampleText').textContent = currentWord.example;
            document.getElementById('exampleSection').classList.remove('hidden');
        }
    } else {
        // ── 오답 피드백 ──
        const chosenMeta = currentOptions[index];         // 내가 선택한 선택지 정보
        const correctMeta = currentOptions[correctAnswer]; // 정답 선택지 정보

        const feedbackEl = document.getElementById('wrongFeedback');
        const wrongWordInfoEl = document.getElementById('wrongWordInfo');
        const correctWordInfoEl = document.getElementById('correctWordInfo');

        // 내가 선택한 오답 설명
        wrongWordInfoEl.innerHTML = `
            <span class="font-bold text-red-700">"${chosenMeta.meaning}"</span>
            는 <span class="font-bold text-red-700">"${chosenMeta.word}"</span>의 뜻이에요.
        `;

        // 정답 단어 설명
        let exampleHtml = '';
        if (currentWord.example) {
            exampleHtml = `<div class="mt-1 text-green-600 italic text-sm">예문: ${currentWord.example}</div>`;
        }
        correctWordInfoEl.innerHTML = `
            <span class="font-bold text-green-700">"${correctMeta.word}"</span>
            는 <span class="font-bold text-green-700">"${correctMeta.meaning}"</span>을(를) 뜻해요.
            ${exampleHtml}
        `;

        feedbackEl.classList.remove('hidden');

        // 오답 목록에 추가
        wrongAnswers.push({
            word: currentWord.word,
            meaning: currentWord.meaning,
            example: currentWord.example,
            chosen: chosenMeta.meaning,
            chosenWord: chosenMeta.word
        });
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
    document.getElementById('exampleSection').classList.add('hidden');
    document.getElementById('wrongFeedback').classList.add('hidden');
    showQuestion();
}

// ── 1세트 종료 후 오답 복습 화면 표시 ──
function showReviewScreen() {
    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('reviewScreen').classList.remove('hidden');

    const finalScore = Math.round((score / currentQuiz.length) * 100);

    document.getElementById('reviewSetScore').textContent =
        `이번 세트 결과: ${score} / ${currentQuiz.length}문제 정답 (${finalScore}점)`;

    const listEl = document.getElementById('wrongAnswerList');

    if (wrongAnswers.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-8 text-green-600">
                <i class="fas fa-star text-4xl mb-3"></i>
                <p class="text-xl font-bold">완벽해요! 틀린 문제가 없습니다 🎉</p>
            </div>`;
    } else {
        listEl.innerHTML = wrongAnswers.map((item, i) => `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-start gap-3">
                    <span class="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">${i + 1}</span>
                    <div class="flex-1">
                        <div class="text-lg font-bold text-gray-800 mb-1">${item.word}
                            <span class="text-base font-normal text-gray-500 ml-2">→ ${item.meaning}</span>
                        </div>
                        <div class="text-sm text-red-500 mb-1">
                            <i class="fas fa-times-circle mr-1"></i>내 답: "${item.chosen}" (${item.chosenWord})
                        </div>
                        ${item.example ? `<div class="text-sm text-indigo-600 italic mt-1"><i class="fas fa-quote-left mr-1 text-xs"></i>${item.example}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 세트 완료 처리
    setCount++;
    currentGroupIndex++;
    updateSetInfo();

    // 다음 세트 버튼 텍스트 결정
    const nextSetBtn = document.getElementById('nextSetBtn');
    const setsInCycle = setCount % 3;

    if (setsInCycle === 0) {
        // 3세트 완료 → 새 단어로 전환
        nextSetBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>새 구동사로 계속하기';
        nextSetBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        nextSetBtn.classList.add('bg-purple-600', 'hover:bg-purple-700');
        document.getElementById('setCompleteMsg').classList.remove('hidden');
    } else {
        nextSetBtn.innerHTML = `<i class="fas fa-arrow-right mr-2"></i>다음 세트 시작 (${setsInCycle}/3)`;
        nextSetBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        nextSetBtn.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        document.getElementById('setCompleteMsg').classList.add('hidden');
    }

    // 점수 저장
    const scoreData = {
        date: new Date().toISOString(),
        score: finalScore,
        correct: score,
        total: currentQuiz.length,
        setNumber: setCount
    };
    scores.push(scoreData);
    localStorage.setItem('flashcardScores', JSON.stringify(scores));
}

// 다음 세트로 진행
function goNextSet() {
    const setsInCycle = setCount % 3;

    if (setsInCycle === 0) {
        // 3세트 완료 → 단어 그룹 재구성 (셔플)
        buildWordGroups();
        showNotification('🎉 3세트 완료! 새로운 구동사 세트로 업데이트됩니다!', 'success');
    }

    beginSet();
}

// 결과 화면으로 이동 (점수 기록 보기용)
function showResult() {
    const finalScore = Math.round((score / currentQuiz.length) * 100);

    document.getElementById('finalScore').textContent = `${finalScore}점`;
    document.getElementById('correctCount').textContent = score;

    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('reviewScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
}

// 퀴즈 재시작 (처음부터)
function restartQuiz() {
    setCount = 0;
    currentGroupIndex = 0;
    buildWordGroups();
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('reviewScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('currentScore').textContent = '0';
    updateSetInfo();
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
        scoresList.innerHTML = scores.slice(-10).reverse().map((s, index) => {
            const date = new Date(s.date);
            const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            return `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <div class="font-semibold">${s.score}점</div>
                        <div class="text-sm text-gray-600">${dateStr}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-600">${s.correct}/${s.total} 맞춤</div>
                        <div class="text-xs text-gray-500">${Math.round((s.correct / s.total) * 100)}% 정답률</div>
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
    let content = '구동사,의미,예문\n';
    
    words.forEach(word => {
        content += `${word.word},${word.meaning},${word.example}\n`;
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
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
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
    }, 3500);
}

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
    loadWords();
    updateSetInfo();
});
