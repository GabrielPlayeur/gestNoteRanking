function getAllGrades() {
    var script = document.getElementsByTagName("script")[9].innerHTML.split(".setValues(");
    var allGrades = Array();
    for (let i = 1; i < script.length; i++) {
        let evaluationGrades = script[i].split(").setNote(")[0];
        allGrades.push(JSON.parse(evaluationGrades.replace(/'/g,'"')));
    }
    return allGrades;
}

function addRanking() {
    var gradesDiv = document.getElementsByClassName("noteNotModified");
    var allGrades = getAllGrades();
    var bonusGradesCounter = 0;
    for (let i = 0; i < gradesDiv.length; i++) {
        if (gradesDiv[i].id.includes("bonus")){
            bonusGradesCounter++;
            continue
        }
        if (gradesDiv[i].innerHTML == "-") {
            continue
        }
        let grades = allGrades[i-bonusGradesCounter];
        let studentGrade = parseFloat(gradesDiv[i].innerHTML);
        let rank = getPersonnalRank(grades, studentGrade);

        if (grades.length == 0 || rank == -1) {
            continue
        }

        let p = document.createElement("p");
        p.style.margin = "0px";
        p.style.float = "left";
        p.style.paddingLeft = "5px";
        p.innerHTML = `${rank}/${grades.length}`;
        gradesDiv[i].parentNode.after(p)
    }
}

function getPersonnalRank(grades, studentGrade) {
    grades.sort(function(a,b) { return b - a;});
    return grades.indexOf(studentGrade)+1;
}

document.onchange = function () {
    addRanking();
}

setTimeout(() => {
    addRanking();
  }, "1000");