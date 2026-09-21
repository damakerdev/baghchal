const initialObx = 'TXXXT/XXXXX/XXXXX/XXXXX/TXXXT g @20 c0 -';

const DEFAULT_RENDER_URL = 'https://baghchal-0z87.onrender.com';
localStorage.setItem('baghchal_bot_url', DEFAULT_RENDER_URL);

const game = new Baghchal('#myBaghchalBoard', initialObx, {
    width: 420,
    loopCaptureAnimation: true,
    showStateInfo: true,
    acceptMouseInput: true,
    themeColor: '#439404',
    accentColor: '#f8fafc',
    onPlayerMove: (requestedObx) => sendState(requestedObx)
});

const apiUrlInput = document.getElementById('botApiUrl');
const saveApiBtn = document.getElementById('saveApiBtn');
const apiStatus = document.getElementById('apiStatus');
const restartBtn = document.getElementById('restartBtn');
const BOT_DELAY=1000;

const savedUrl = localStorage.getItem('baghchal_bot_url');
apiUrlInput.value = savedUrl ? savedUrl : DEFAULT_RENDER_URL;
if (apiUrlInput) {
    apiUrlInput.value = DEFAULT_RENDER_URL;
    apiUrlInput.placeholder = "custom API URL";
    apiUrlInput.title = "default is Render server. edit only if you know what you are doing.";
}

if (saveApiBtn) {
    saveApiBtn.textContent = "Connect to API";
    saveApiBtn.title = "Connect to a custom backend server";
}

let currentApiUrl = DEFAULT_RENDER_URL;
testApiConnection(currentApiUrl);

async function testApiConnection(url) {
    const isCustom = url.trim() !== DEFAULT_RENDER_URL;
    updateStatus("Status: Connecting to Server...", "#a3ac9c");

    try {
        const testUrl = `${url}?obx=${encodeURIComponent(initialObx)}`;
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(6000)
        });

        if (response.ok) {
            const statusMsg = isCustom 
                ? "Status: Connected to Custom Backend" 
                : "Status: Connected to Backend Server";
            updateStatus(statusMsg, "#58cc02");
            currentApiUrl = url;
            return true;
        } else {
            updateStatus(`Status: Server Error (${response.status})`, "#e65345");
            return false;
        }
    } catch (err) {
        console.error("Connection failed:", err);
        const failMsg = isCustom
            ? "Status: Can't connect to custom server"
            : "Status: Waking up Backend Server...";
        updateStatus(failMsg, isCustom ? "#e65345" : "#ff9800");
        return false;
    }
}

function updateStatus(text,color){
    apiStatus.textContent=text;
    if (color) apiStatus.style.color = color;
}

if (saveApiBtn) {
    saveApiBtn.addEventListener('click', () => {
        const customUrl = apiUrlInput.value.trim();
        if (customUrl) {
            testApiConnection(customUrl);
        } else {
            apiUrlInput.value = DEFAULT_RENDER_URL;
            testApiConnection(DEFAULT_RENDER_URL);
        }
    });
}
restartBtn.addEventListener('click', () => {
    game.setObx(initialObx);
    game.setAcceptMouseInput(true);
    document.getElementById('gameOverModal').classList.add('hidden');
    updateStatus("Status: Connected to Backend Server", "#58cc02");
});


function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}

async function sendState(requestedObx) {
    const apiUrl = apiUrlInput.value.trim() || currentApiUrl || DEFAULT_RENDER_URL;
    if (!apiUrl) {
        console.warn('Bot API URL is empty');
        updateStatus("Status: Bot URL not set", "#ff9800");
        game.setAcceptMouseInput(true);
        return;
    }
    game.setAcceptMouseInput(false);
    updateStatus("Status: Bot is thinking...", "#a3ac9c");
    try {
        const url = `${apiUrl}?obx=${encodeURIComponent(requestedObx)}`;
        const [res] = await Promise.all([
            fetch(url, { method: 'GET' }),
            wait(BOT_DELAY)
        ]); 

        if (!res.ok) throw new Error(`server returned HTTP ${res.status}`);

        const data = await res.json();
        const newObx = data.obx || data.nextObx || data.move;

        if (newObx && typeof newObx === 'string') {
            game.setObx(newObx);
            const status=Baghchal.isWin(newObx);
            if(status.gameOver){
                game.setAcceptMouseInput(false);
                updateStatus(status.message, status.winner === 'tiger' ? '#e65345' : '#58cc02');                showGameOverModal(status);
                showGameOverModal(status);
            } else {
                updateStatus("Status: Connected", "#58cc02");
                game.setAcceptMouseInput(true);
            }
        } else {
            throw new Error('Invalid OBX received from server');
        }
    } catch (err) {
        console.error('Failed to communicate with server:', err);
        updateStatus("Status: Can't connect to Bot Server", "#e65345");
        game.setAcceptMouseInput(true);
    }
}

function showGameOverModal(status) {
    const modal = document.getElementById('gameOverModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    modalTitle.textContent = status.winner === 'tiger' ? '🐯 Tiger Wins!' : '🐐 Goats Win!';
    modalMessage.textContent = status.message;

    modal.classList.remove('hidden');
}

document.getElementById('modalCloseBtn').addEventListener('click',()=>{
    document.getElementById('gameOverModal').classList.add('hidden');
})