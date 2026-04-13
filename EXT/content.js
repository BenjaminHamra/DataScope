console.log("a");

function saveData(text) {
    const cleanText = text.trim();

    if (cleanText !== "" && cleanText !== lastText) {
        lastText = cleanText;

        const DATOS = { type: "PROMPT", content: cleanText };
        chrome.runtime.sendMessage(DATOS, (res) => {
            if (chrome.runtime.lastError) {
                console.warn("Error enviando:", chrome.runtime.lastError.message);
            }
        });
    }
}

function checkKeyboard(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        const el = document.activeElement;
        editorWasEmpty = true;

        if (el && el.matches("textarea, [contenteditable='true']")) {
            const contenido = el.innerText || el.value || "";
            saveData(contenido);
        }
    }
}

function configEditor(element) {

    if (element && element.getAttribute('data-extension-configurado') !== 'true') {
        element.addEventListener('keyup', checkKeyboard);

        element.addEventListener('input', () => {
            const currentContent = element.value || element.innerText || "";
            const isCurrentlyEmpty = currentContent.trim() === "";

            if (editorWasEmpty && !isCurrentlyEmpty) {
                const newButton = findElement(document.body, "BUTTON");
                if (newButton) {
                    sendButton = newButton;
                    sendButton._lastScore = rank(newButton, "BUTTON");
                    attachButtonListener(sendButton, true);
                }
            }
            editorWasEmpty = isCurrentlyEmpty;
        });

        element.setAttribute('data-extension-configurado', 'true');
    }
}

function attachButtonListener(btn, force = false) {
    if (!btn) return;

    if (btn.dataset.extensionConfigurado === "true" && !force) return;

    btn.removeEventListener("click", handleButtonClick);
    btn.addEventListener("click", handleButtonClick);

    btn.dataset.extensionConfigurado = "true";
    console.info("Botón de envío actualizado:", btn);
}

function handleButtonClick() {
    editorWasEmpty = true;
    const contenido = editor?.innerText || editor?.value || "";
    if (contenido.trim()) {
        saveData(contenido);
    }
}

function isButtonValid(btn) {
    if (!btn) return false;
    return document.contains(btn) && btn.offsetParent !== null;
}

let globalCandidates = {
    EDITOR: new Set(),
    BUTTON: new Set()
};

let heuristics = {

    EDITOR: {
        Id: { "prompt": 40, "textarea": 20, "user": 20, "input": 20, "ask": 40 },
        Class: { "input": 10, "textarea": 10, "user": 10 },
        Role: { "textbox": 50 },
        Arialabel: { "chat": 45, "prompt": 45 },
        PlaceHolder: { "message": 35, "chat": 35, "prompt": 35 }
    },
    BUTTON: {
        Id: { "submit": 30, "button": 10 },
        Class: { "submit": 20, "button": 10, "btn": 10, "send": 30 }, 
        Arialabel: { "send": 50, "message": 45, "enviar": 50, "mensaje": 45 }
    },
    ANSWER: {
        Id: {"markdown": 50, "content": 50, "model": 50, "response": 50, "message": 50},
        Class: {"ai": 50, "message": 50},
        DataContent: {"ai": 50, "message": 50},
        DataTestId: {"ai": 50, "message": 50},
        DataMessageAuthorRole: {"assistant": 100}
    }
}


function rank(element, type) {
    let score = 0;
    let config = heuristics[type];

    if (!element || !(element instanceof HTMLElement) || element.offsetParent === null) return -Infinity;

    let elementAttributes = {
        Id: element.id || "",
        Class: typeof element.className === 'string' ? element.className : (element.getAttribute("class") || ""),
        Role: element.getAttribute("role") || "",
        Arialabel: element.getAttribute("aria-label") || "",
        PlaceHolder: element.getAttribute("placeholder") || "",
    };

    for (const category in config) {
        const attributeValue = (elementAttributes[category] || "").toLowerCase();
        const keywords = config[category];

        for (const [word, weight] of Object.entries(keywords)) {
            if (attributeValue.includes(word.toLowerCase())) {
                score += weight;
            }
        }
    }

    const rect = element.getBoundingClientRect();

    if (type === "BUTTON") {
        const ratio = rect.width / rect.height;
        if (ratio > 0.7 && ratio < 1.4) score += 60;

        if (rect.width > 200 || rect.height > 100) score -= 100;

        if (typeof editor !== 'undefined' && editor) {
            const editorRect = editor.getBoundingClientRect();
            const distance = Math.hypot(
                (rect.left + rect.width / 2) - (editorRect.left + editorRect.width / 2),
                (rect.top + rect.height / 2) - (editorRect.top + editorRect.height / 2)
            );

            if (distance < 100) score += 150;
            else if (distance < 250) score += 50;

            if (rect.top >= editorRect.top && rect.left >= editorRect.left) score += 40;
        }
    }

    if (type === "EDITOR") {
        if (element.tagName === "TEXTAREA") score += 200;
        if (element.getAttribute('contenteditable') === 'true') score += 150;
    }

    if (element === document.activeElement) score += 1000;

    score += Math.min(rect.width * rect.height, 5000) / 1000;

    return score;
}

function findElement(root, type) {

    let config = heuristics[type]
    const candidates = []

    let maxScore = -Infinity
    let best = null

    let selector
    if (type === "EDITOR") {
        selector = "textarea, [contenteditable='true']"
    }
    else {
        selector = "button, [role='button'], input[type='submit']"
    }

    if (root) {
        if (root.matches && root.matches(selector)) {
            globalCandidates[type].add(root);
        }
        root.querySelectorAll(selector).forEach(el => globalCandidates[type].add(el));
    }

    globalCandidates[type].forEach(el => {

        if (!document.contains(el)) {
            globalCandidates[type].delete(el);
        }

    });

    for (const element of globalCandidates[type]) {

        const currentScore = rank(element, type);

        if (currentScore > maxScore && currentScore > -Infinity) {

            maxScore = currentScore;
            best = element;

        }
    }

    return best
}



let editor = null;
let sendButton = null;
let lastText = ""
let editorWasEmpty = true;

editor = findElement(document.body, "EDITOR");
if (editor) {
    configEditor(editor);
}

sendButton = findElement(document.body, "BUTTON");
if (sendButton) {
    attachButtonListener(sendButton);
}



const observer = new MutationObserver((mutationList) => {
    let structureChanged = false;

    for (const mutation of mutationList) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;

            findElement(node, "EDITOR");
            findElement(node, "BUTTON");
            structureChanged = true;
        }
    }

    if (!editor || !document.contains(editor) || editor.offsetParent === null) {
        const newEditor = findElement(null, "EDITOR");

        if (newEditor && newEditor !== editor) {

            if (editor) {
                editor.removeEventListener('keyup', checkKeyboard);
            }

            editor = newEditor;
            configEditor(editor);
            console.log("Nuevo editor detectado:", editor);
        }
    }


    const bestButton = findElement(document.body, "BUTTON");

    // Si encontramos un mejor botón O si el botón actual ha evolucionado (mejor score)
    if (bestButton && (bestButton !== sendButton || rank(bestButton, "BUTTON") > (sendButton?._lastScore || -Infinity))) {

        // Guardamos el score actual dentro del elemento para futuras comparaciones
        bestButton._lastScore = rank(bestButton, "BUTTON");

        sendButton = bestButton;

        // Forzamos el listener ignorando si ya tenía uno (lo manejamos dentro de la función)
        attachButtonListener(sendButton, true);
    }
});

observer.observe(document.body, { childList: true, subtree: true });
