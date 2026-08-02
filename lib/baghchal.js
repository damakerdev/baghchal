/**
 * Baghchal.js - Independent Baghchal & OBX Engine Library
 * Standard OBX Notation & Engine based on github.com/bhu1st/obx
 */

(function (global, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        global.Baghchal = factory();
    }
}(typeof window !== 'undefined' ? window : this, function () {

    const COLS = ["A", "B", "C", "D", "E"];

    function coordToIndex(coord) {
        if (!coord || coord.length < 2) return -1;
        const c = coord.charAt(0).toUpperCase();
        const r = parseInt(coord.charAt(1), 10);
        const colIdx = COLS.indexOf(c);
        if (colIdx === -1 || isNaN(r) || r < 1 || r > 5) return -1;
        return (r - 1) * 5 + colIdx;
    }

    function indexToCoord(idx) {
        if (idx < 0 || idx >= 25) return "";
        const c = COLS[idx % 5];
        const r = Math.floor(idx / 5) + 1;
        return c + r;
    }

    function isConnected(i, j, points) {
        const p1 = points[i], p2 = points[j];
        const dr = Math.abs(p1.r - p2.r), dc = Math.abs(p1.c - p2.c);
        if (dr > 1 || dc > 1) return false;
        return (dr + dc === 1) || (dr === 1 && dc === 1 && (p1.r + p1.c) % 2 === 0);
    }

    function getJump(tIdx, targetIdx, points) {
        const p1 = points[tIdx], p2 = points[targetIdx];
        const dr = p2.r - p1.r, dc = p2.c - p1.c;
        if ((Math.abs(dr) === 2 && dc === 0) || (Math.abs(dc) === 2 && dr === 0) || (Math.abs(dr) === 2 && Math.abs(dc) === 2 && (p1.r + p1.c) % 2 === 0)) {
            const midR = p1.r + dr / 2;
            const midC = p1.c + dc / 2;
            return points.findIndex(p => p.r === midR && p.c === midC);
        }
        return -1;
    }

    function hasTigerMoves(points) {
        for(let i=0;i<points.length;i++){
            if(points[i].piece!=="tiger") continue;
        
            for(let j=0;j<points.length;j++){
                if(points[j].piece) continue;
                if(isConnected(i,j,points)) return true;
                const mid=getJump(i,j,points);
                if(mid!==-1&&points[mid].piece=="goat") return true;
            }

        }
        return false;
    }

    function parseOBX(obxString) {
        const cleanObx = (obxString || "").trim();
        const parts = cleanObx.split(/\s+/);

        let boardStr = parts[0] || "TXXXT/XXXXX/XXXXX/XXXXX/TXXXT";
        let turnStr = parts[1] || "g";

        let goatsToPlace = 20;
        let capturedGoats = 0;
        let lastMove = "-";

        for (let i = 2; i < parts.length; i++) {
            const p = parts[i];
            if (p.startsWith("@")) {
                goatsToPlace = parseInt(p.substring(1), 10);
            } else if (p.startsWith("c")) {
                capturedGoats = parseInt(p.substring(1), 10);
            } else if (p.startsWith("m") || p === "-") {
                lastMove = p;
            }
        }

        const points = [];
        const rows = boardStr.split("/");
        let goatOnBoardCount = 0;
        let tigerCount = 0;

        for (let r = 0; r < 5; r++) {
            const rowStr = rows[r] || "XXXXX";
            for (let c = 0; c < 5; c++) {
                const char = rowStr.charAt(c) || "X";
                let piece = null;
                if (char === "T" || char === "t") { piece = "tiger"; tigerCount++; }
                else if (char === "G" || char === "g") { piece = "goat"; goatOnBoardCount++; }

                points.push({
                    x: 50 + c * 80,
                    y: 50 + r * 80,
                    piece: piece,
                    r: r,
                    c: c,
                    highlight: false
                });
            }
        }

        const turn = (turnStr.toLowerCase() === "t" || turnStr.toLowerCase() === "tiger") ? "tiger" : "goat";
        const goatsPlaced = 20 - goatsToPlace;
        const totalGoats = goatOnBoardCount + Math.max(0, goatsToPlace) + Math.max(0, capturedGoats);

        const warnings = [];
        if (tigerCount > 4) {
            warnings.push(`Found ${tigerCount} Tigers (max 4 allowed)`);
        }
        if (totalGoats > 20) {
            warnings.push(`Found ${totalGoats} total Goats (max 20 allowed)`);
        }

        const isValid = warnings.length === 0;
        const validationError = isValid ? null : warnings.join(", ");

        let captureMoveDetails = null;
        let rawMove = lastMove.startsWith("m") ? lastMove.substring(1) : lastMove;
        if (rawMove.length === 4) {
            const fromCoord = rawMove.substring(0, 2);
            const toCoord = rawMove.substring(2, 4);
            const fromIdx = coordToIndex(fromCoord);
            const toIdx = coordToIndex(toCoord);
            if (fromIdx !== -1 && toIdx !== -1) {
                const midIdx = getJump(fromIdx, toIdx, points);
                if (midIdx !== -1) {
                    captureMoveDetails = {
                        fromIdx: fromIdx,
                        toIdx: toIdx,
                        midIdx: midIdx,
                        fromCoord: fromCoord,
                        toCoord: toCoord,
                        midCoord: indexToCoord(midIdx),
                        midX: points[midIdx].x,
                        midY: points[midIdx].y,
                        angle: Math.atan2(points[toIdx].y - points[fromIdx].y, points[toIdx].x - points[fromIdx].x)
                    };
                }
            }
        }

        return {
            rawOBX: cleanObx,
            boardStr: boardStr,
            turn: turn,
            tigerCount: tigerCount,
            goatOnBoardCount: goatOnBoardCount,
            totalGoats: totalGoats,
            goatsToPlace: Math.max(0, goatsToPlace),
            goatsPlaced: goatsPlaced,
            capturedGoats: capturedGoats,
            lastMove: lastMove,
            points: points,
            captureMoveDetails: captureMoveDetails,
            isValid: isValid,
            validationError: validationError
        };
    }

    function getAllLegalMoves(state) {
        const moves = [];
        const points = state.points;
        const pType = state.turn;

        points.forEach((p, i) => {
            if (p.piece === pType) {
                points.forEach((_, j) => {
                    if (!points[j].piece) {
                        if (pType === "tiger") {
                            let mid = getJump(i, j, points);
                            if (mid !== -1 && points[mid].piece === "goat") {
                                moves.push({ f: i, t: j, c: mid, isCapture: true });
                            }
                            if (isConnected(i, j, points)) {
                                moves.push({ f: i, t: j, c: -1, isCapture: false });
                            }
                        } else if (state.goatsPlaced >= 20 && isConnected(i, j, points)) {
                            moves.push({ f: i, t: j, c: -1, isCapture: false });
                        }
                    }
                });
            }
        });
        return moves;
    }

    function generateNextMove(obxOrState) {
        const state = typeof obxOrState === 'string' ? parseOBX(obxOrState) : obxOrState;

        if (state.turn === "goat" && state.goatsToPlace > 0) {
            const preferredIndices = [12, 6, 8, 16, 18, 7, 11, 13, 17, 0, 4, 20, 24];
            let targetIdx = -1;
            for (let idx of preferredIndices) {
                if (!state.points[idx].piece) {
                    targetIdx = idx;
                    break;
                }
            }
            if (targetIdx === -1) {
                targetIdx = state.points.findIndex(p => !p.piece);
            }
            if (targetIdx !== -1) {
                return "m" + indexToCoord(targetIdx);
            }
        }

        const legalMoves = getAllLegalMoves(state);
        if (legalMoves.length === 0) return "-";

        const captures = legalMoves.filter(m => m.isCapture);
        if (captures.length > 0) {
            const bestCap = captures[0];
            return "m" + indexToCoord(bestCap.f) + indexToCoord(bestCap.t);
        }

        legalMoves.sort((a, b) => {
            const distA = Math.hypot(state.points[a.t].r - 2, state.points[a.t].c - 2);
            const distB = Math.hypot(state.points[b.t].r - 2, state.points[b.t].c - 2);
            return distA - distB;
        });

        const bestMove = legalMoves[0];
        return "m" + indexToCoord(bestMove.f) + indexToCoord(bestMove.t);
    }

    function isWin(obxOrState){
        const state=typeof obxOrState==='string'?parseOBX(obxOrState):obxOrState;
        if(state.capturedGoats>=5){
            return {
                gameOver: true,
                winner: "tiger",
                reason:"captures",
                message:`Tigers win by capturing ${state.capturedGoats} goats.`
            }
        }
        if(!hasTigerMoves(state.points)){
            return {
                gameOver:true,
                winner:"goat",
                reason:"trapped",
                message:"Goats win, all tigers are trapped with no legal moves."
            }
        }
        return {
            gameOver:false,
            winner:null,
            reason:null,
            message:null
        }
    }


    const DEFAULT_THEME = {
        bg: "",
        bgColor: "#ffffff",
        bagh: "",
        goat: "",
        gridSize: 5,
        canvasPadding: 12,
        framePadding: 24,
        boardPadding: 32,
        lineColor: "#777777",
        canvasBorderColor: "#777777",
        frameColor: "#777777",
        labelColor: "#777777",
        labelFont: "",
        emptyColor: "#777777",
        frameLineWidth: 3,
        lineWidth: 2,
        pieceRadiusRatio: 0.08,
        selectionColor: "#ff0000",
        stopColor: "#ff0000",     // last move: start position (red)
        lookColor: "#ffff00",     // currently selected piece (yellow)
        goColor: "#00ff00",       // last move: destination (green)
        selectionLineWidth: 2,
        tigerEmoji: "🐯",
        goatEmoji: "🐐",
        showGridLabels: true,
        drawFrames: true
    };

    class Baghchal {
        constructor(targetContainer, obxString, options = {}) {
            this.container = typeof targetContainer === 'string' ? document.querySelector(targetContainer) : targetContainer;
            if (!this.container) throw new Error("Baghchal: Invalid target container element");

            const defaultOptions = {
                width: 420,
                height: 420,
                loopCaptureAnimation: true,
                showStateInfo: true,
                accentColor: "#ffff00",
                acceptMouseInput: false,
                onPlayerMove: null
            };

            this.options = Object.assign({}, defaultOptions, options);
            this.selectedIndex = -1;
            this.inputLocked = false;

            const userTheme = options.theme || {};
            this.theme = Object.assign({}, DEFAULT_THEME, userTheme);

            if (options.bg !== undefined) this.theme.bg = options.bg;
            if (options.bgColor !== undefined) this.theme.bgColor = options.bgColor;
            if (options.boardBackground !== undefined) this.theme.bgColor = options.boardBackground;
            if (options.lineColor !== undefined) this.theme.lineColor = options.lineColor;
            if (options.bagh !== undefined) this.theme.bagh = options.bagh;
            if (options.goat !== undefined) this.theme.goat = options.goat;
            if (options.labelColor !== undefined) this.theme.labelColor = options.labelColor;
            if (options.selectionColor !== undefined) this.theme.selectionColor = options.selectionColor;
            if (options.stopColor !== undefined) this.theme.stopColor = options.stopColor;
            if (options.lookColor !== undefined) this.theme.lookColor = options.lookColor;
            if (options.goColor !== undefined) this.theme.goColor = options.goColor;
            if (options.selectionLineWidth !== undefined) this.theme.selectionLineWidth = options.selectionLineWidth;

            this.anims = [];
            this.particles = [];
            this.isDestroyed = false;
            this.lastLoopBiteTime = 0;

            this.loadThemeImages();
            this.initDOM();
            this.setObx(obxString || "TXXXT/XXXXX/XXXXX/XXXXX/TXXXT g @20 c0 -");
            this.startLoop();
        }

        loadThemeImages() {
            if (this.theme.bg && typeof this.theme.bg === 'string') {
                this.boardBgImg = new Image();
                this.boardBgImg.onload = () => { if (!this.isDestroyed) this.render(); };
                this.boardBgImg.src = this.theme.bg;
            } else if (this.theme.bg instanceof HTMLImageElement) {
                this.boardBgImg = this.theme.bg;
            } else {
                this.boardBgImg = null;
            }

            if (this.theme.bagh && typeof this.theme.bagh === 'string') {
                this.baghImg = new Image();
                this.baghImg.onload = () => { if (!this.isDestroyed) this.render(); };
                this.baghImg.src = this.theme.bagh;
            } else if (this.theme.bagh instanceof HTMLImageElement) {
                this.baghImg = this.theme.bagh;
            } else {
                this.baghImg = null;
            }

            if (this.theme.goat && typeof this.theme.goat === 'string') {
                this.goatImg = new Image();
                this.goatImg.onload = () => { if (!this.isDestroyed) this.render(); };
                this.goatImg.src = this.theme.goat;
            } else if (this.theme.goat instanceof HTMLImageElement) {
                this.goatImg = this.theme.goat;
            } else {
                this.goatImg = null;
            }
        }

        setTheme(newTheme = {}) {
            Object.assign(this.theme, newTheme);
            this.loadThemeImages();
            if (this.canvas && this.theme.canvasBorderColor) {
                this.canvas.style.border = `2px solid ${this.theme.canvasBorderColor}`;
            }
        }

        setCanvasSize(width, height) {
            const w = parseInt(width, 10) || 420;
            const h = parseInt(height, 10) || w;
            this.options.width = w;
            this.options.height = h;

            if (this.canvas) {
                this.canvas.width = w;
                this.canvas.height = h;
                this.canvas.style.maxWidth = w + "px";
                this.canvas.style.aspectRatio = (w / h).toString();
            }
            if (this.infoBox) {
                this.infoBox.style.maxWidth = w + "px";
            }
        }

        initDOM() {
            this.container.innerHTML = "";
            this.container.style.display = "flex";
            this.container.style.flexDirection = "column";
            this.container.style.alignItems = "center";
            this.container.style.gap = "8px";

            const width = parseInt(this.options.width, 10) || 420;
            const height = parseInt(this.options.height, 10) || width;

            this.canvas = document.createElement("canvas");
            this.canvas.width = width;
            this.canvas.height = height;
            this.canvas.style.width = "100%";
            this.canvas.style.maxWidth = width + "px";
            this.canvas.style.height = "auto";
            this.canvas.style.aspectRatio = (width / height).toString();
            this.canvas.style.border = `2px solid ${this.theme.canvasBorderColor}`;
            this.canvas.style.borderRadius = "8px";
            this.canvas.style.boxShadow = "0 5px 15px rgba(0,0,0,0.15)";
            this.canvas.style.cursor = this.options.acceptMouseInput ? "pointer" : "default";
            this.canvas.addEventListener('click', (e) => this.handleClick(e));
            this.ctx = this.canvas.getContext("2d");
            this.container.appendChild(this.canvas);

            if (this.options.showStateInfo) {
                this.infoBox = document.createElement("div");
                this.infoBox.style.width = "100%";
                this.infoBox.style.maxWidth = width + "px";
                this.infoBox.style.fontFamily = "monospace";
                this.infoBox.style.fontSize = "11px";
                this.infoBox.style.background = "rgba(0,0,0,0.6)";
                this.infoBox.style.color = this.options.accentColor;
                this.infoBox.style.padding = "8px 12px";
                this.infoBox.style.borderRadius = "8px";
                this.infoBox.style.border = "1px solid rgba(255,255,255,0.2)";
                this.infoBox.style.boxSizing = "border-box";
                this.infoBox.style.wordBreak = "break-all";
                this.container.appendChild(this.infoBox);
            }
        }

        setObx(obxString) {
            this.state = parseOBX(obxString);
            this.anims = [];
            this.particles = [];
            this.lastLoopBiteTime = 0;
            this.inputLocked = false;
            this.selectedIndex = -1;
            this.updateInfoBox();

            if (this.state.captureMoveDetails && this.options.loopCaptureAnimation) {
                this.triggerCaptureExplosion(this.state.captureMoveDetails);
            }
        }

        updateInfoBox() {
            if (!this.infoBox) return;
            const s = this.state;
            const turnEmoji = s.turn === "goat" ? "🐐 Goat" : "🐯 Tiger";
            let capText = s.captureMoveDetails ? ` [CAPTURE DETECTED: ${s.captureMoveDetails.fromCoord}->${s.captureMoveDetails.toCoord} (eats ${s.captureMoveDetails.midCoord})]` : "";

            let warningHtml = "";
            if (!s.isValid) {
                warningHtml = `<div style="margin-top:6px; color:#ff4d4d; font-weight:bold; background:rgba(255,0,0,0.25); padding:6px 10px; border-radius:6px; border:1px solid #ff4d4d;">⚠️ Warning: Invalid number of allowed game pieces! (${s.validationError})</div>`;
            }

            this.infoBox.innerHTML = `
                <div><strong>OBX:</strong> ${s.rawOBX}</div>
                <div style="margin-top:4px;"><strong>Turn:</strong> ${turnEmoji} | <strong>Tigers:</strong> ${s.tigerCount}/4 | <strong>Goats Left:</strong> ${s.goatsToPlace} | <strong>Captured:</strong> ${s.capturedGoats}${capText}</div>
                ${warningHtml}
            `;
        }

        triggerCaptureExplosion(cap) {
            let x = cap.midX;
            let y = cap.midY;

            if (cap.midIdx !== undefined && this.state && this.state.points && this.state.points[cap.midIdx]) {
                x = this.state.points[cap.midIdx].x;
                y = this.state.points[cap.midIdx].y;
            }

            for (let i = 0; i < 35; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1.0,
                    color: 'rgba(230, 0, 0, '
                });
            }
        }

        applyLocalState(obxString) {
            this.state = parseOBX(obxString);
            this.updateInfoBox();
        }

        handleClick(evt) {
            if (!this.options.acceptMouseInput || this.inputLocked || this.isDestroyed) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (evt.clientX - rect.left) * scaleX;
            const y = (evt.clientY - rect.top) * scaleY;

            const idx = this.getNearestPointIndex(x, y);
            if (idx === -1) return;

            // Goat placement phase
            if (this.state.turn === "goat" && this.state.goatsToPlace > 0) {
                if (this.state.points[idx].piece) return;
                const obx = this.buildRequestObx({ toIdx: idx });
                this.applyLocalState(obx);
                this.fireMove(obx);
                return;
            }

            // Movement phase: 2-click select+move, no legality check (server validates)
            if (this.selectedIndex === -1) {
                if (this.state.points[idx].piece) {
                    this.selectedIndex = idx;
                    this.state.points[idx].highlight = "look"; // yellow ring on selected piece
                }
                return;
            }

            if (idx === this.selectedIndex) {
                this.clearSelection();
                return;
            }

            if (this.state.points[idx].piece) {
                // re-select another own/enemy piece instead
                this.clearSelection();
                this.selectedIndex = idx;
                this.state.points[idx].highlight = "look";
                return;
            }

            const obx = this.buildRequestObx({ fromIdx: this.selectedIndex, toIdx: idx });
            this.clearSelection();
            this.applyLocalState(obx);
            this.fireMove(obx);
        }

        getNearestPointIndex(x, y, threshold = 28) {
            let best = -1, bestDist = threshold;
            this.state.points.forEach((p, i) => {
                const d = Math.hypot(p.x - x, p.y - y);
                if (d < bestDist) { bestDist = d; best = i; }
            });
            return best;
        }

        clearSelection() {
            this.selectedIndex = -1;
            this.state.points.forEach(p => p.highlight = false);
        }

        buildRequestObx({ fromIdx = -1, toIdx }) {
            const s = this.state;
            const newPoints = s.points.map(p => Object.assign({}, p));
            let goatsToPlace = s.goatsToPlace;
            let moveNotation;

            if (fromIdx === -1) {
                newPoints[toIdx].piece = "goat";
                goatsToPlace -= 1;
                moveNotation = "m" + indexToCoord(toIdx);
            } else {
                const piece = newPoints[fromIdx].piece;
                newPoints[fromIdx].piece = null;
                newPoints[toIdx].piece = piece;
                moveNotation = "m" + indexToCoord(fromIdx) + indexToCoord(toIdx);
            }

            const nextTurn = s.turn === "tiger" ? "g" : "t";
            const boardStr = this.serializeBoard(newPoints);
            return `${boardStr} ${nextTurn} @${Math.max(0, goatsToPlace)} c${s.capturedGoats} ${moveNotation}`;
        }

        serializeBoard(points) {
            const rows = [];
            for (let r = 0; r < 5; r++) {
                let row = "";
                for (let c = 0; c < 5; c++) {
                    const p = points[r * 5 + c];
                    row += p.piece === "tiger" ? "T" : p.piece === "goat" ? "G" : "X";
                }
                rows.push(row);
            }
            return rows.join("/");
        }

        fireMove(obxString) {
            this.inputLocked = true;
            if (typeof this.options.onPlayerMove === "function") {
                this.options.onPlayerMove(obxString);
            }
        }

        setAcceptMouseInput(enabled) {
            this.options.acceptMouseInput = enabled;
            this.canvas.style.cursor = enabled ? "pointer" : "default";
            if (!enabled) this.clearSelection();
        }

        drawSelection(startX, startY, size, color) {
            const ctx = this.ctx;
            const boxSize = size / 1.8;
            const x = startX - boxSize / 2;
            const y = startY - boxSize / 2;
            ctx.strokeStyle = color || this.theme.selectionColor || "#ff0000";
            ctx.lineWidth = this.theme.selectionLineWidth || 2;
            ctx.strokeRect(x, y, boxSize, boxSize);
        }

        drawMarkers(boardStartX, boardStartY, cellSize, boardSize, innerFrameStartX, innerFrameStartY, innerFrameSize) {
            const ctx = this.ctx;
            ctx.fillStyle = this.theme.labelColor || "#777777";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const labelFontSize = Math.max(10, Math.round(cellSize * 0.10));
            ctx.font = this.theme.labelFont || `bold ${labelFontSize}px 'Segoe UI', Arial, sans-serif`;

            const cols = ["A", "B", "C", "D", "E"];
            const rows = ["1", "2", "3", "4", "5"];

            const framePadding = this.theme.framePadding !== undefined ? this.theme.framePadding : 32;
            const topLabelY = innerFrameStartY - framePadding / 2;
            const bottomLabelY = innerFrameStartY + innerFrameSize + framePadding / 2;
            const leftLabelX = innerFrameStartX - framePadding / 2;
            const rightLabelX = innerFrameStartX + innerFrameSize + framePadding / 2;

            cols.forEach((col, i) => {
                const x = boardStartX + i * cellSize;
                ctx.fillText(col, x, topLabelY);
                ctx.fillText(col, x, bottomLabelY);
            });

            rows.forEach((row, i) => {
                const y = boardStartY + i * cellSize;
                ctx.fillText(row, leftLabelX, y);
                ctx.fillText(row, rightLabelX, y);
            });
        }

        render() {
            if (this.isDestroyed || !this.ctx) return;
            const ctx = this.ctx;
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;
            const canvasSize = Math.min(canvasWidth, canvasHeight);
            const now = performance.now();

            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            if (this.boardBgImg && this.boardBgImg.complete && this.boardBgImg.naturalWidth !== 0) {
                ctx.drawImage(this.boardBgImg, 0, 0, canvasWidth, canvasHeight);
            } else {
                ctx.fillStyle = this.theme.bgColor || "#ffffff";
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }

            const canvasPadding = this.theme.canvasPadding !== undefined ? this.theme.canvasPadding : 4;
            const framePadding = this.theme.framePadding !== undefined ? this.theme.framePadding : 32;
            const boardPadding = this.theme.boardPadding !== undefined ? this.theme.boardPadding : 44;

            const outerFrameStartX = (canvasWidth - canvasSize) / 2 + canvasPadding;
            const outerFrameStartY = (canvasHeight - canvasSize) / 2 + canvasPadding;
            const outerFrameSize = canvasSize - canvasPadding * 2;

            const innerFrameStartX = outerFrameStartX + framePadding;
            const innerFrameStartY = outerFrameStartY + framePadding;
            const innerFrameSize = outerFrameSize - framePadding * 2;

            const boardStartX = innerFrameStartX + boardPadding;
            const boardStartY = innerFrameStartY + boardPadding;
            const boardSize = innerFrameSize - boardPadding * 2;
            const cellSize = boardSize / (this.theme.gridSize - 1);

            if (this.theme.drawFrames !== false) {
                ctx.strokeStyle = this.theme.canvasBorderColor || "#777777";
                ctx.lineWidth = this.theme.frameLineWidth || 3;
                ctx.strokeRect(outerFrameStartX, outerFrameStartY, outerFrameSize, outerFrameSize);

                ctx.strokeStyle = this.theme.frameColor || "#777777";
                ctx.lineWidth = this.theme.frameLineWidth || 3;
                ctx.strokeRect(innerFrameStartX, innerFrameStartY, innerFrameSize, innerFrameSize);
            }

            ctx.strokeStyle = this.theme.lineColor || "#777777";
            ctx.lineWidth = this.theme.lineWidth || 2;

            for (let i = 0; i < this.theme.gridSize; i++) {
                let x = boardStartX + i * cellSize;
                let y = boardStartY + i * cellSize;

                ctx.beginPath();
                ctx.moveTo(x, boardStartY);
                ctx.lineTo(x, boardStartY + boardSize);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(boardStartX, y);
                ctx.lineTo(boardStartX + boardSize, y);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.moveTo(boardStartX, boardStartY);
            ctx.lineTo(boardStartX + boardSize, boardStartY + boardSize);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(boardStartX + boardSize, boardStartY);
            ctx.lineTo(boardStartX, boardStartY + boardSize);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(boardStartX + 2 * cellSize, boardStartY);
            ctx.lineTo(boardStartX + 4 * cellSize, boardStartY + 2 * cellSize);
            ctx.lineTo(boardStartX + 2 * cellSize, boardStartY + 4 * cellSize);
            ctx.lineTo(boardStartX, boardStartY + 2 * cellSize);
            ctx.closePath();
            ctx.stroke();

            if (this.theme.showGridLabels !== false) {
                this.drawMarkers(boardStartX, boardStartY, cellSize, boardSize, innerFrameStartX, innerFrameStartY, innerFrameSize);
            }

            // Determine last move indices for automatic stop (start) and go (destination) rings
            let stopIdx = -1;
            let goIdx = -1;

            if (this.state && this.state.lastMove) {
                let rawMove = this.state.lastMove.startsWith("m") ? this.state.lastMove.substring(1) : this.state.lastMove;
                if (rawMove.length === 4) {
                    stopIdx = coordToIndex(rawMove.substring(0, 2));
                    goIdx = coordToIndex(rawMove.substring(2, 4));
                } else if (rawMove.length === 2) {
                    goIdx = coordToIndex(rawMove);
                }
            }

            const points = this.state.points;
            points.forEach((p, i) => {
                const px = boardStartX + p.c * cellSize;
                const py = boardStartY + p.r * cellSize;

                p.x = px;
                p.y = py;

                // Render Selection & Move Highlights (look > stop/go from lastMove > custom > generic)
                if (p.selectionColor) {
                    this.drawSelection(px, py, cellSize, p.selectionColor);
                } else if (p.highlight === "look") {
                    this.drawSelection(px, py, cellSize, this.theme.lookColor);
                } else if (p.highlight === "stop" || (i === stopIdx && stopIdx !== -1)) {
                    this.drawSelection(px, py, cellSize, this.theme.stopColor);
                } else if (p.highlight === "go" || (i === goIdx && goIdx !== -1)) {
                    this.drawSelection(px, py, cellSize, this.theme.goColor);
                } else if (p.highlight) {
                    this.drawSelection(px, py, cellSize, this.theme.selectionColor);
                }

                if (p.piece) {
                    if (p.piece === "tiger") {
                        if (this.baghImg && this.baghImg.complete && this.baghImg.naturalWidth !== 0) {
                            const pieceSize = cellSize * 0.75;
                            ctx.drawImage(this.baghImg, px - pieceSize / 2, py - pieceSize / 2, pieceSize, pieceSize);
                        } else {
                            ctx.font = `${Math.round(cellSize * 0.44)}px Arial`;
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText(this.theme.tigerEmoji || "🐯", px, py);
                        }
                    } else if (p.piece === "goat") {
                        if (this.goatImg && this.goatImg.complete && this.goatImg.naturalWidth !== 0) {
                            const pieceSize = cellSize * 0.75;
                            ctx.drawImage(this.goatImg, px - pieceSize / 2, py - pieceSize / 2, pieceSize, pieceSize);
                        } else {
                            ctx.font = `${Math.round(cellSize * 0.44)}px Arial`;
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText(this.theme.goatEmoji || "🐐", px, py);
                        }
                    }
                } else if (this.theme.showEmptyPoints !== false) {
                    ctx.fillStyle = this.theme.emptyColor || "#888888";
                    ctx.strokeStyle = this.theme.lineColor || "#888888";
                    ctx.beginPath();
                    const dotRadius = Math.max(3, cellSize * (this.theme.pieceRadiusRatio || 0.08));
                    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            if (this.options.loopCaptureAnimation && this.state.captureMoveDetails) {
                if (now - this.lastLoopBiteTime > 1000) {
                    this.lastLoopBiteTime = now;
                    this.triggerCaptureExplosion(this.state.captureMoveDetails);
                }
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                let p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.035;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                } else {
                    ctx.fillStyle = p.color + p.life + ')';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        startLoop() {
            const self = this;
            function loop() {
                if (self.isDestroyed) return;
                self.render();
                requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
        }

        nextMove() {
            return generateNextMove(this.state);
        }

        parseObxMove(obxString) {
            this.setObx(obxString);
            return this.state;
        }

        getBoard() {
            return this.state;
        }

        checkGameStatus() {
            return isWin(this.state);
        }

        destroy() {
            this.isDestroyed = true;
            this.container.innerHTML = "";
        }
    }

    Baghchal.parseOBX = parseOBX;
    Baghchal.nextMove = generateNextMove;
    Baghchal.coordToIndex = coordToIndex;
    Baghchal.indexToCoord = indexToCoord;
    Baghchal.isConnected = isConnected;
    Baghchal.getJump = getJump;
    Baghchal.DEFAULT_THEME = DEFAULT_THEME;
    Baghchal.isWin=isWin;

    return Baghchal;
}));