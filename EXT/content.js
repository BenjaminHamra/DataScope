/*HAY QUE QUEDARSE CON EL MAT-ICON O LO QUE SEA EL PRIME HALLAZGO DE LA FUNCION DE FINDBUTTON AL ESCRIBIR POR PRIMER VEZ EN EL EDITOR
DESPUES SOLO HAY QUE VOLVER A ENCONTRARLO LA **SIGUIENTE VEZ QUE SE ESCRIBE EN EL EDITOR** Y AHI BUSCAR EL BOTON

HAY QUE PONER UN SOLO LISTENER PARA LOS BOTONES **EN EL ANCESTRO COMUN DE TODOS ELLOS**
*/

let editor
let editorQuery
let editorContent
let oldEditorContent

let sendButton
let sendButtonCandidates = []
let sendButtonFingerPrint
let sendButtonQuery
let listenersAttached = false
let messageNumber = 0

function configEditor() {
    editor.addEventListener('input', (e) => {
        editorContent = e.target.textContent

        if (!sendButton && !listenersAttached) {
            console.log("chequeando botones")
            findButton(editor, 5)
            attachListeners()
            listenersAttached = true
        }

        oldEditorContent = editorContent
    })
}

function getDigitalPrint(e) {
    return {
        tag: e.tagName || "",
        clases: Array.from(e.classList).join('.') || "",
        position: Array.from(e.parentNode.children).indexOf(e) || "",
        father: e.closest('[id]') ? e.closest('[id]').id : null
    };
}

function checkSameElement(element, originalPrint) {
    if (!element || !originalPrint) return false
    const currentPrint = getDigitalPrint(element)

    return currentPrint.tag === originalPrint.tag &&
        currentPrint.clases === originalPrint.clases &&
        currentPrint.position === originalPrint.position &&
        currentPrint.father === originalPrint.father;
}

function attachListeners() {
    sendButtonCandidates.forEach((e) => {
        e.addEventListener('click', setSendButton)
        console.log('Event listener listo')
    })
}

function cleanButtonCandidates() {
    sendButtonCandidates.forEach((e) => {
        e.removeEventListener('click', setSendButton)
        console.log('Event listener listo')
    })

    sendButtonCandidates = []
}

function findButton(start, levels) {

    let ancestro = start;
    for (let i = 0; i < levels; i++) {
        if (ancestro) {
            ancestro = ancestro.parentElement;

            const botones = ancestro.querySelectorAll('button');

            if (botones.length > 0) {
                sendButtonCandidates.push(...botones);
            } else {
                console.log("No tiene botones.");
            }
        }
    }

    console.log(sendButtonCandidates)
}

const setEditor = (e) => {

    let candidate = e.target
    if (candidate.isContentEditable || candidate.tagName === 'TEXTAREA') {
        editor = candidate
        configEditor()
        console.log("NUEVO EDITOR: ", editor)

        document.removeEventListener('focusin', setEditor)

    }
}

const setSendButton = (e) => {

    let buttonCandidate = e.target

    if (buttonCandidate.tagName != 'BUTTON') {
        cleanButtonCandidates()
        findButton(buttonCandidate, 5)
        buttonCandidate = sendButtonCandidates[0]
    }

    console.log("CLICK DETECTADO EN: ", buttonCandidate)

    setTimeout(() => {
        if (editor && editor.textContent === "") {
            sendButtonFingerPrint = getDigitalPrint(buttonCandidate)
            console.log("FINGUERPRINT:", sendButtonQuery)
            cleanButtonCandidates()
        }
    }, 100)

    messageNumber += 1
}

document.addEventListener('focusin', setEditor)

const observer = new MutationObserver((mutationList) => {

    if (sendButtonQuery) {
        for (const mutation of mutationList) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (checkSameElement(node, sendButtonQuery)) {
                        sendButton = node;
                        console.log("NUEVO BOTON DE ENVIO:", sendButton);
                    }
                    const childMatch = node.querySelector(`*`);
                    if (childMatch && checkSameElement(childMatch, sendButtonQuery)) {
                        sendButton = childMatch;
                    }
                }
            });
        }
    }
})