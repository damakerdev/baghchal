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

const goatTray = document.getElementById('goatTray');
let lastCaptured=0;

function updateGoatTray(capturedGoats,animate=true){
    const slots=goatTray.querySelectorAll('.goat-slot');
    slots.forEach((slot,i)=>{
        const shouldBeDead=i<capturedGoats;
        const isDead=slot.classList.contains('.dead');
        if(shouldBeDead&&!isDead){
            slot.textContent='💀';
            slot.classList.add('dead');
            if(animate && i>=lastCaptured){
                slot.style.animation='none';
                void slot.offsetWidth;
                slot.style.animation='';
            }
        } else if ( !shouldBeDead && isDead){
            slot.textContent='🐐';
            slot.classList.remove('dead');
        }
    });
    lastCaptured=capturedGoats;
}


updateGoatTray(0, false);   

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
    apiStatus.textContent='Idle';
    apiStatus.style.color='#4caf50';
    document.getElementById('gameOverModal').classList.add('hidden');
    updateGoatTray(0, false); 
})


function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}

async function sendState(requestedObx) {
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) {
        console.warn('Bot API URL is empty');
        game.setAcceptMouseInput(true);
        return;
    }

    apiStatus.textContent = 'Server is validating..';
    apiStatus.style.color = '#ff9800';
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
            updateGoatTray(game.getBoard().capturedGoats);   
            const status=Baghchal.isWin(newObx);
            if(status.gameOver){
                game.setAcceptMouseInput(false);
                apiStatus.textContent = status.message;
                apiStatus.style.color=status.winner==='tiger'?'#f44336':'#4caf50';
                showGameOverModal(status);
            } else {
                apiStatus.textContent = 'Idle';
                apiStatus.style.color = '#4caf50';
            }
        } else {
            throw new Error('Invalid OBX received from server');
        }
    } catch (err) {
        console.error('Failed to communicate with server: ', err);
        apiStatus.textContent = 'API Error!';
        apiStatus.style.color = '#f44336';
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