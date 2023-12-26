function getSemesterId() {
    var maq = document.getElementById("maq");
    var semesterId = maq.options[maq.selectedIndex].value;
    return semesterId;
}

function getDepartementId() {
    var dpt = document.getElementById('dpt');
    var departementId = dpt.getAttribute("value");
    return departementId;
}

function getUserName() {
    return document.getElementById('evalnumber').parentElement.parentElement.parentElement.lastElementChild.innerText
}

function getYear() {
    var maq = document.getElementById('maq');
    return Number(maq[maq.selectedIndex].innerText.split('/')[0]);
}

function getGlobalGrade() {
    return document.getElementById("avg").innerText.split('\n')[0];
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
        if (gradesDiv[i].id.includes("bonus")){
            continue;
        }
        if (gradesDiv[i].innerHTML == "-") {
            continue;
        }
        let grades = allGrades[gradesDiv[i].id];
        let studentGrade = parseFloat(gradesDiv[i].innerHTML);
        let [rank, numberOfSameNotes] = getPersonnalRank(grades, studentGrade);

        if (grades.length == 0 || rank == -1) {
            return ;
        }

        // Create a new div element
        let element = document.createElement("div");
        element.className = "item";
        element.style.margin = "0px";
        element.style.float = "left";
        element.style.paddingLeft = "5px";

        // Add the position and the percentage of the student
        if (numberOfSameNotes > 1) {
            element.innerHTML = `<div class='rank'>${rank}-${rank+numberOfSameNotes-1}/${grades.length}</div>
                                 <div class='pourcent'>${Math.round(rank/grades.length*10000)/100}-${Math.round((rank+numberOfSameNotes-1)/grades.length*10000)/100}%</div>`

        } else {
            element.innerHTML = `<div class='rank'>${rank}/${grades.length}</div>
                                 <div class='pourcent'>${Math.round(rank/grades.length*10000)/100}%</div>`
        }

        gradesDiv[i].parentNode.after(element);
    }

    // Add the event listener to display the percentage
    var items = document.querySelectorAll('.item');

    items.forEach(function(item) {
        let pourcent = item.querySelector('.pourcent');
        let rank = item.querySelector('.rank');

        // Hide the percentage by default
        pourcent.style.display = 'none';

        // Add the event listener
        item.addEventListener('mouseover', function() {
            pourcent.style.display = 'inline';
            rank.style.display = 'none';
        });
        item.addEventListener('mouseout', function() {
            pourcent.style.display = 'none';
            rank.style.display = 'inline';
        });
    });
}

function getPersonnalRank(grades, studentGrade) {
    grades.sort(function(a,b) { return b - a;});
    let firstIndex = grades.indexOf(studentGrade);
    let lastIndex = grades.lastIndexOf(studentGrade);
    return [firstIndex + 1, lastIndex - firstIndex + 1];
}

async function getGlobalRank(){
    var url = `http://localhost:5000/api/ranks/${await generateHash()}`;
    fetch(url, {
	    method: 'get'
    })
    .then(response => response.text())
    .then(str => JSON.parse(str))
    .then(data => {
        displayGlobalRank(data.rank, data.total);
    })
}

function displayGlobalRank(rank, total) {
    var avg = document.getElementById("avg");
    avg.innerHTML = `${getGlobalGrade()} <br/> ${rank}/${total}`
}

async function updateGlobalRank(){
    const url = "http://localhost:5000/api/ranks"
    var hash = await generateHash()
    const data = {
        hash: hash,
        year: getYear(),
        maquette: getSemesterId(),
        departement: getDepartementId(),
        grade: getGlobalGrade()
    };
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data:', data);
      })
      .catch(error => {
        console.error('Error:', error);
      });
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

async function runGlobalRanking() {
    const agree = localStorage.getItem('allow')==="true";
    if (!agree) return removeGlobalRanking();
    await updateGlobalRank();
    await getGlobalRank();
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    localStorage.setItem('allow', request.allow);
    runGlobalRanking()
});

document.onchange = function () {
    getSemesterRanking();
    runGlobalRanking();
}

setTimeout(() => {
    getSemesterRanking(),
    runGlobalRanking()
  }, "1000");