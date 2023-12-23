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

        let p = document.createElement("p");
        p.style.margin = "0px";
        p.style.float = "left";
        p.style.paddingLeft = "5px";
        p.innerHTML = `${rank}/${grades.length} [${numberOfSameNotes}]`;
        gradesDiv[i].parentNode.after(p);
    }
}

function getPersonnalRank(grades, studentGrade) {
    grades.sort(function(a,b) { return b - a;});
    let firstIndex = grades.indexOf(studentGrade);
    let lastIndex = grades.lastIndexOf(studentGrade);
    return [firstIndex + 1, lastIndex - firstIndex + 1];
}

async function getGlobalRank(){
    var url = `http://localhost:5000/ranking/${await generateHash()}`;
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
    avg.innerHTML = `${avg.innerText} <br/> ${rank}/${total} `
}

async function updateGlobalRank(){
    const url = "http://localhost:5000/update"
    var hash = await generateHash()
    const data = {
        hash: hash,
        year: getYear(),
        maquette: getSemesterId(),
        departement: getDepartementId(),
        grade: document.getElementById("avg").innerText
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

document.onchange = function () {
    getSemesterRanking();
    getGlobalRank();
}

setTimeout(() => {
    getSemesterRanking(),
    getGlobalRank(),
    updateGlobalRank()
  }, "1000");