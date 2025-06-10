const URL_SERVER = "https://gestnote-ranking.onrender.com"
const globalExtensionVersion = '1.0.7';

function getSemesterId() {
    var maq = document.getElementById("maq");
    var semesterId = maq.tagName==='SELECT' ? maq.options[maq.selectedIndex].value:maq.getAttribute("value");
    return semesterId;
}

function getDepartementId() {
    var dpt = document.getElementById('dpt');
    var departementId = dpt.tagName==='SELECT' ? dpt.options[dpt.selectedIndex].value:dpt.getAttribute("value");
    return departementId;
}

function getUserName() {
    return document.getElementById('evalnumber').parentElement.parentElement.parentElement.lastElementChild.innerText
}

function getYear() {
    var maq = document.getElementById('maq');
    var fullYear = maq.tagName==='SELECT' ? maq[maq.selectedIndex].innerText:maq.innerText;
    return Number(fullYear.split('/')[0]);
}

function getGlobalGrade() {
    var avg = document.getElementById("avg").innerText.split('\n')[0];
    return isNaN(avg) || avg.trim() === '' ? '0' : avg;
}

function getAllSemesterGrades(data) {
    var query = data.querySelectorAll("addhelp");
    var allGrades = {};
    for (let i = 0; i < query.length; i++) {
        var id = query[i].getAttribute("key");
        if (!id.includes("note")){
            continue;
        }
        var grade = query[i].getAttribute("exec").split(".setValues(")[1].split(").setNote(")[0];
        allGrades[id] = JSON.parse(grade.replace(/'/g,'"'));
    }
    return allGrades;
}

function getSemesterRanking() {
    var url = "https://scolarite.polytech.univ-nantes.fr/gestnote/"
    var fct = "bulletin";
    var maqId = getSemesterId();
    var dptId = getDepartementId();
    var urlVar = `${url}?fct=${fct}&maq=${maqId}&dpt=${dptId}`;
    fetch(urlVar, {
	    method: 'get'
    })
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data =>{
        var allGrades = getAllSemesterGrades(data);
        displayRank(allGrades);
    });
}

function displayRank(allGrades) {
    var gradesDiv = document.getElementsByClassName("noteNotModified");
    for (let i = 0; i < gradesDiv.length; i++) {
        if (gradesDiv[i].id.includes("bonus")) continue;
        if (gradesDiv[i].innerHTML == "-") continue;
        let grades = allGrades[gradesDiv[i].id];
        let userGrade = parseFloat(gradesDiv[i].innerHTML);
        let [rank, numberOfSameNotes] = getPersonnalRank(grades, userGrade);
        if (grades.length == 0 || rank == -1) return;
        gradesDiv[i].parentNode.after(createDivForDisplay(grades, userGrade, rank, numberOfSameNotes));
    }
    var items = document.querySelectorAll('.item');
    items.forEach(item => addDivListener(item));
}

function createDivForDisplay(grades, userGrade, rank, numberOfSameNotes){
    let element = document.createElement("div");
    element.className = "item";
    element.style.margin = "0px";
    element.style.float = "left";
    element.style.paddingLeft = "5px";
    element.innerHTML = `<div class='rank'>${rank}/${grades.length}</div>
                        <div class='pourcent'>${Math.round(rank/grades.length*10000)/100}%</div>`;
    if (numberOfSameNotes > 1) {
        element.innerHTML = `<div class='rank'>${rank}-${rank+numberOfSameNotes-1}/${grades.length}</div>
                             <div class='pourcent'>${Math.round(rank/grades.length*10000)/100}-${Math.round((rank+numberOfSameNotes-1)/grades.length*10000)/100}%</div>`;
    }

    element.addEventListener('mouseover', function(event) {
        let itemPosition = element.getBoundingClientRect();
        showHistogram(event, grades, userGrade, itemPosition);
    });

    return element
}

function addDivListener(item) {
    let pourcent = item.querySelector('.pourcent');
    let rank = item.querySelector('.rank');
    pourcent.style.display = 'none';
    item.addEventListener('mouseover', function() {
        pourcent.style.display = 'inline';
        rank.style.display = 'none';
    });
    item.addEventListener('mouseout', function() {
        pourcent.style.display = 'none';
        rank.style.display = 'inline';
        hideHistogram();
    });
}

function getPersonnalRank(grades, studentGrade) {
    grades.sort(function(a,b) { return b - a;});
    let firstIndex = grades.indexOf(studentGrade);
    let lastIndex = grades.lastIndexOf(studentGrade);
    return [firstIndex + 1, lastIndex - firstIndex + 1];
}

async function getGlobalRank(){
    var url = `${URL_SERVER}/api/ranks/${await generateHash()}`;
    fetch(url, {
	    method: 'get'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
    })
    .then(str => JSON.parse(str))
    .then(data => {
        if (data.rank && data.total) {
            displayGlobalRank(data.rank, data.total, data.grades);
        }
    })
    .catch(error => {
        console.error('Error in getGlobalRank:', error);
        // En cas d'erreur, ne pas afficher de classement incorrect
    });
}

function displayGlobalRank(rank, total, grades = null) {
    var avg = document.getElementById("avg");
    const gradeText = getGlobalGrade();
    const rankText = `${rank}/${total}`;
    if (grades && grades.length > 0) {
        avg.innerHTML = `${gradeText} <br/> <span class="global-rank-clickable" style="cursor: pointer; text-decoration: underline;">${rankText}</span>`;
        const clickableElement = avg.querySelector('.global-rank-clickable');
        if (clickableElement) {
            clickableElement.addEventListener('click', function(event) {
                const userGrade = parseFloat(gradeText) || 0;
                const itemPosition = clickableElement.getBoundingClientRect();
                showHistogram(event, grades, userGrade, itemPosition, true);
            });
            clickableElement.addEventListener('mouseover', function(event) {
                const userGrade = parseFloat(gradeText) || 0;
                const itemPosition = clickableElement.getBoundingClientRect();
                showHistogram(event, grades, userGrade, itemPosition, true);
            });
        }
    } else {
        // Affichage simple sans histogramme
        avg.innerHTML = `${gradeText} <br/> ${rankText}`;
    }
}

async function updateGlobalRank(){
    const url = `${URL_SERVER}/api/ranks`
    var hash = await generateHash()
    const data = {
        hash: hash,
        year: getYear(),
        maquette: getSemesterId(),
        departement: getDepartementId(),
        grade: getGlobalGrade()
    };
    const payload = JSON.stringify(data);
    const signature = await generateHMACSignature(payload);
    const extensionUserAgent = `GestNoteRanking/${globalExtensionVersion}`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GestNote-Signature': signature,
        'X-Extension-User-Agent': extensionUserAgent
      },
      body: payload
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // console.log('Response data:', data);
        if (data.rank && data.total) {
          displayGlobalRank(data.rank, data.total, data.grades);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
}

async function generateHMACSignature(payload) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode('658e02624f38c792ac9a97f2');
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await window.crypto.subtle.sign(
        'HMAC', cryptoKey, encoder.encode(payload)
    );
    return Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateHash() {
    const data = `${getUserName()}${getYear()}${getSemesterId()}${getDepartementId()}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function removeGlobalRanking() {
    document.getElementById("avg").innerText = getGlobalGrade();
}

function updateInformationText(agree){
    var informationText = document.getElementById('informationText');
    if (informationText!=null){
        informationText.innerHTML = createInformationText(agree);
        return;
    }
    var informationText = createInformationDiv(agree);
    var noteTab = document.getElementById('notetab');
    noteTab.before(informationText);
}

function createInformationDiv(agree){
    var informationDiv = document.createElement('div');
    informationDiv.id = "informationText";
    informationDiv.style.fontStyle = "italic";
    informationDiv.style.marginBottom = "15px";
    informationDiv.innerHTML = createInformationText(agree);
    return informationDiv;
}

function createInformationText(agree){
    var textStart = document.createElement('span');
    textStart.innerText = "Partage de la moyenne: ";
    var state = document.createElement('span');
    state.innerText = agree == true ? "ACTIVE" : "DESACTIVE";
    state.style.color = agree == true ? "green" : "red";
    state.style.fontWeight = "bold";
    var textHelp = document.createElement('span');
    textHelp.innerHTML = "</br>Vous pouvez modifier ce paramètre depuis l'extension GestNote Ranking en accédant à l'onglet Extensions dans le coin supérieur droit de votre navigateur."
    var textUsers = document.createElement('span');
    textUsers.innerHTML = "</br>Votre classement est affiché en fonction des autres étudiants qui ont accepté de partager leur moyenne."
    var textTime = document.createElement('span');
    textTime.innerHTML = "</br>L'apparition du classement peut prendre un certain temps. Nous vous demandons d'être patient."
    var div = document.createElement('div');
    div.appendChild(textStart);
    div.appendChild(state);
    div.appendChild(textHelp);
    div.appendChild(textUsers);
    div.appendChild(textTime);
    return div.innerHTML;
}

async function runGlobalRanking() {
    const agree = localStorage.getItem('allow')==="true";
    updateInformationText(agree);
    if (!agree) return removeGlobalRanking();
    try {
        await updateGlobalRank();
    } catch (error) {
        console.error('Error in updateGlobalRank:', error);
        try {
            await getGlobalRank();
        } catch (getRankError) {
            console.error('Error in getGlobalRank fallback:', getRankError);
        }
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    localStorage.setItem('allow', request.allow);
    runGlobalRanking();
});

document.onchange = function () {
    getSemesterRanking();
    runGlobalRanking();
}

setTimeout(() => {
    getSemesterRanking(),
    runGlobalRanking()
  }, "1000");