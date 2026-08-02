const initialObx = 'TXXXT/XXXXX/XXXXX/XXXXX/TXXXT g @20 c0 -';

const game = new Baghchal('#myBaghchalBoard', initialObx, {
    width: 420,
    loopCaptureAnimation: true,
    showStateInfo: true,
    acceptMouseInput: true,
    accentColor: '#f8fafc',
    onPlayerMove: (requestedObx) => sendState(requestedObx)
});

const apiUrlInput = document.getElementById('botApiUrl');
const saveApiBtn = document.getElementById('saveApiBtn');
const apiStatus = document.getElementById('apiStatus');
const restartBtn = document.getElementById('restartBtn');
const BOT_DELAY=2000;

let currentApiUrl=apiUrlInput.value.trim();
async function testApiConnection(url){
    if(!url){
        updateStatus("Status: Please enter a URL", "#ff9800");
        return false;
    }

    updateStatus("Status: Connection...","#a3ac9c");

    try{
        const response=await fetch(url,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({obx:initialObx}),
            signal:AbortSignal.timeout(4000)
        })
        if(response.ok){
            updateStatus("Status: Connected","#58cc02")
            currentApiUrl=url;
            return true;
        } else {
            updateStatus(`Status: Server error (${response.status})`,"#e65345")
            return false;
        }
    } catch(err){
        console.error("Connection failed",err);
        updateStatus("Status: Can't connect to bot server","#e65345")
        return false;
    }
}

function updateStatus(text,color){
    apiStatus.textContent=text;
    apiStatus.color=color;
}

if (localStorage.getItem('baghchal_bot_url')) {
    apiUrlInput.value = localStorage.getItem('baghchal_bot_url');
}

saveApiBtn.addEventListener('click', () => {
    localStorage.setItem('baghchal_bot_url', apiUrlInput.value.trim());
    apiStatus.textContent = 'API URL Saved!';
    apiStatus.style.color = '#4caf50';
    setTimeout(() => { apiStatus.textContent = 'Idle'; apiStatus.style.color = '#888'; }, 2000);
});

restartBtn.addEventListener('click',()=>{
    game.setObx(initialObx);
    game.setAcceptMouseInput(true);
    updateStatus("Status: Connected", "#58cc02");
    document.getElementById('gameOverModal').classList.add('hidden');
})


function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}

async function sendState(requestedObx) {
    const apiUrl = apiUrlInput.value.trim()||currentApiUrl;
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