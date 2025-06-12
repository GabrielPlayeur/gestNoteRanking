const graphContainer = document.createElement('div');
graphContainer.style.position = 'absolute';
graphContainer.style.display = 'none';
graphContainer.style.backgroundColor = 'white';
graphContainer.style.border = '1px solid black';
graphContainer.style.margin = '3px';
graphContainer.style.zIndex = "1";
document.body.appendChild(graphContainer);

graphContainer.addEventListener('mouseover', function() {
    graphContainer.style.display = 'block';
});
graphContainer.addEventListener('mouseout', function() {
    hideHistogram();
});

const pointerHelper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
pointerHelper.style.position = 'absolute';
pointerHelper.id = 'pointerHelper';
pointerHelper.style.display = 'none';

const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
polygon.style.fill = 'transparent';
// bleu transparent
// polygon.style.fill = 'rgba(110, 164, 213, 0.7)';

pointerHelper.appendChild(polygon);

document.body.appendChild(pointerHelper);

// Create a simple bridge for global histogram
const globalBridge = document.createElement('div');
globalBridge.style.position = 'absolute';
globalBridge.style.display = 'none';
globalBridge.style.backgroundColor = 'transparent';
globalBridge.style.zIndex = "1";
document.body.appendChild(globalBridge);

globalBridge.addEventListener('mouseover', function() {
    graphContainer.style.display = 'block';
});
globalBridge.addEventListener('mouseout', function() {
    hideHistogram();
});

function updatePointerHelperPosition(itemPosition, graphContainerPosition) {
    pointerHelper.style.display = 'block';

    // graphContainer à droite
    if (itemPosition.left < graphContainerPosition.left) {
        pointerHelper.style.left = `${itemPosition.left + window.scrollX}px`;
        pointerHelper.style.top = `${itemPosition.bottom + window.scrollY}px`;
        pointerHelper.style.height = `${graphContainerPosition.bottom - itemPosition.bottom}px`;
        pointerHelper.style.width = `${graphContainerPosition.right - itemPosition.left}px`;

        let pointerHelperWidth = parseFloat(pointerHelper.style.width);
        let pointerHelperHeight = parseFloat(pointerHelper.style.height);

        polygon.setAttribute("points", `0,0 ${itemPosition.width},0 ${pointerHelperWidth},${graphContainerPosition.top - itemPosition.bottom}  ${graphContainerPosition.left - itemPosition.left + 1},${graphContainerPosition.top - itemPosition.bottom + 1}  ${graphContainerPosition.left - itemPosition.left},${pointerHelperHeight}`);
    }
    // graphContainer à gauche
    else if (itemPosition.right > graphContainerPosition.right) {
        pointerHelper.style.left = `${graphContainerPosition.left + window.scrollX}px`;
        pointerHelper.style.top = `${itemPosition.bottom + window.scrollY}px`;
        pointerHelper.style.height = `${graphContainerPosition.bottom - itemPosition.bottom}px`;
        pointerHelper.style.width = `${itemPosition.right - graphContainerPosition.left}px`;

        let pointerHelperWidth = parseFloat(pointerHelper.style.width);
        let pointerHelperHeight = parseFloat(pointerHelper.style.height);

        polygon.setAttribute("points", `${pointerHelperWidth},0 ${graphContainerPosition.width},${pointerHelperHeight} ${graphContainerPosition.width - 1},${graphContainerPosition.top - itemPosition.bottom + 1}  0,${graphContainerPosition.top - itemPosition.bottom}  ${itemPosition.left - graphContainerPosition.left},0`);
    }
}

function showHistogram(event, grades, userGrade, itemPosition, isGlobal = false) {
    const svgWidth = 240, svgHeight = 135;
    const margin = { top: 10, right: -5, bottom: 10, left: 25 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    if (isGlobal) {
        const rightPosition = itemPosition.right + window.scrollX + 15;
        if (rightPosition + svgWidth > document.documentElement.clientWidth + window.scrollX) {
            graphContainer.style.left = `${itemPosition.left + window.scrollX - svgWidth - 5}px`;
        } else {
            graphContainer.style.left = `${rightPosition}px`;
        }
        const elementCenterY = itemPosition.top + (itemPosition.height / 2);
        const histogramCenterY = elementCenterY - 2*(svgHeight / 2);
        graphContainer.style.top = `${histogramCenterY + window.scrollY - 25}px`;

        // Create bridge between clickable element and graph for global histogram
        const bridgeLeft = itemPosition.right + window.scrollX;
        const bridgeTop = Math.min(itemPosition.top, parseFloat(graphContainer.style.top) - window.scrollY) + window.scrollY;
        const bridgeWidth = parseFloat(graphContainer.style.left) - bridgeLeft + 45; // +45 for overlap
        const bridgeHeight = Math.max(itemPosition.height, svgHeight) + 45; // +45 for overlap

        globalBridge.style.left = `${bridgeLeft}px`;
        globalBridge.style.top = `${bridgeTop}px`;
        globalBridge.style.width = `${bridgeWidth}px`;
        globalBridge.style.height = `${bridgeHeight}px`;
        globalBridge.style.display = 'block';

        // --- Fix: Keep graph visible when mouse is over graphContainer for global graph ---
        graphContainer.onmouseover = function() {
            graphContainer.style.display = 'block';
        };
        graphContainer.onmouseout = function(e) {
            // Only hide if mouse leaves the graphContainer and not entering a child
            if (!graphContainer.contains(e.relatedTarget)) {
                hideHistogram();
            }
        };
    } else {
        const rightEdge = event.pageX + svgWidth;
        if (rightEdge > document.documentElement.clientWidth) {
            graphContainer.style.left = `${event.pageX - svgWidth}px`;
        } else {
            graphContainer.style.left = `${event.pageX}px`;
        }
        graphContainer.style.top = `${itemPosition.bottom + window.scrollY + 3}px`;
        globalBridge.style.display = 'none';
        graphContainer.onmouseover = null;
        graphContainer.onmouseout = null;
    }
    graphContainer.style.display = 'block';
    graphContainer.innerHTML = '';

    const svg = d3.select(graphContainer)
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)

    const xScale = d3.scaleLinear() // Echelle linéaire pour les notes de 0 à 20 avec un pas de 0.25
        .domain([0, 80])
        .range([margin.left, width]);

    // les éléments se superposent par ordre d'apparition dans le code

    // POURCENTAGE DE REUSSITE - Visuel -------------------------------------

    // dégradé blanc transparent
    var defs = svg.append("defs");
    var gradient = defs.append("linearGradient")
        .attr("id", "svgGradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%");
    gradient.append("stop")
        .attr('class', 'start')
        .attr("offset", "0%")
        .attr("stop-color", "rgba(255, 255, 255, 0)")
        .attr("stop-opacity", 1);
    gradient.append("stop")
        .attr('class', 'end')
        .attr("offset", "100%")
        .attr("stop-color", "rgba(255, 255, 255, 1)")
        .attr("stop-opacity", 1);

    // Création des rectangles pour le pourcentage de réussite
    svg.selectAll('rect.percentage')
        .data(d3.range(81))  // Crée un tableau de 0 à 20 avec un pas de 0.25
        .enter()
        .append('rect')
        .attr('class', 'percentage')
        .attr('x', d => xScale(d))
        .attr('y', height)
        .attr('width', xScale(1) - xScale(0) +0.05)
        .attr('height', 0)
        .attr('transform', 'translate(-0.5,0)')
        .attr('fill', d => {
            const percentage = getPercentageAboveGrade(d/4, grades);
            return `rgba(110, 164, 213, ${percentage/100})`;
        })
        .transition()
        .delay((d, i) => i * 5)
        .attr('height', 16);

    // application du dégradé sur les rectangles
    svg.selectAll('rect.overlay')
        .data(d3.range(81))  // Crée un tableau de 0 à 20 avec un pas de 0.25
        .enter()
        .append('rect')
        .attr('class', 'overlay')
        .attr('x', d => xScale(d))
        .attr('y', margin.top + height - 10)
        .attr('width', xScale(1) - xScale(0) +0.05)
        .attr('height', 16.1)
        .attr('transform', 'translate(-0.5,0)')
        .attr('fill', "url(#svgGradient)");

    // HISOGRAMME DES NOTES -------------------------------------

    // Donnees de l'histogramme
    let histogramData = d3.histogram()
        .domain([0,81])
        .thresholds(xScale.ticks(80)) // répartition en 80 intervalles
        (grades.map(g => Math.round(g*4)));

    let median = d3.median(grades);
    let mean = d3.mean(grades); 

    // Echelle verticale
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(histogramData, d => d.length)])
        .range([height, margin.top]);

    // Axe x
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => d/4));

    // Axe y
    svg.append("g")
        .attr("transform", `translate( ${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).ticks(3));

    // Création des barres de l'histogramme
    let bars = svg.selectAll("rect.histogram")
        .data(histogramData)
        .enter()
        .append("rect")
        .attr("class", "histogram")
        .attr("x", 1)
        .attr("transform", d => `translate( ${xScale(d.x0)-1.5} , ${height} )`)
        .attr("width", d => {
          const width = xScale(d.x1) - xScale(d.x0) - 1.5;
          return width < 0 ? 0 : width;
        })
        .attr("height", 0)
        .style("fill", function(d) {
            if (Math.round(userGrade*4) === d.x0) {
                return 'red';
            }
            if (Math.round(median*4) > d.x0){
                return '#2364aa'; // en dessous de la médianne
            }
            else {
                return '#3da5d9'; // au dessus de la médianne
            }
        });
    bars.transition()
        .delay((d, i) => i * 5)
        .attr("transform", d => `translate( ${xScale(d.x0)-1.5} , ${yScale(d.length) - 0.5} )`)
        .attr("height", d => height - yScale(d.length));

    // hitbox plus large pour le mouseover des barres de l'histogramme
    let barsHelper = svg.selectAll('rect.histogramHelper')
        .data(histogramData)
        .enter()
        .append('rect')
        .attr('class', 'histogramHelper')
        .attr('x', 1)
        .attr('transform', d => `translate( ${xScale(d.x0)-1.5} , ${yScale(d.length) - 0.5} )`)
        .attr('width', d => xScale(d.x1) - xScale(d.x0))
        .attr('height', d =>  height - yScale(d.length))
        .style('fill', 'transparent')
        .on('mouseover', function (event, d) {
            const tooltipText = `${d.x0/4}pts - ${d.length}`;
            showTooltip(event, tooltipText);
        })
        .on('mouseout', hideTooltip);

    // Dessins sous l'axe x -------------------------------------
    // Curseur moyenne
    svg.append('rect')
        .attr('x', xScale(mean.toFixed(2)*4) - 0.5)
        .attr('y', height + 0.5)
        .attr('width', 1)
        .attr('height', 0)
        .style('fill', 'red')
        .transition()
        .delay(mean*4*5)
        .attr('height', 7.5);

    // Mouseover trasparent pour le pourcentage de réussite 
    svg.selectAll('rect.percentageTooltip')
        .data(d3.range(81))  // Crée un tableau de 0 à 20 avec un pas de 0.25
        .enter()
        .append('rect')
        .attr('class', 'overlay')
        .attr('x', d => xScale(d))
        .attr('y', margin.top + height - 10)
        .attr('width', xScale(1) - xScale(0) +0.05)
        .attr('height', 16.1)
        .attr('transform', 'translate(-0.5,0)')
        .attr('fill', "transparent")
        .on('mouseover', function (event, d) {
            const percentage = getPercentageAboveGrade(d/4, grades);
            const tooltipText = `${d/4}pts - ${percentage}%<br>Moyenne: ${mean.toFixed(2)} - Médianne: ${median}`;
            showTooltip(event, tooltipText);
        })
        .on('mouseout', hideTooltip);

    // APPEL DU POLYGONE POINTER HELPER -------------------------------------
    graphContainerPosition = graphContainer.getBoundingClientRect();
    
    // Pour l'histogramme global, ne pas afficher le pointer helper
    if (!isGlobal) {
        updatePointerHelperPosition(itemPosition, graphContainerPosition);
    }

    // Fonctions de fonctionnement de l'histogramme -------------------------------------
    function getPercentageAboveGrade(grade, grades) {
        let normalizedGrade = grades.map(g => {
            return Math.round(g*4)/4;
        })

        normalizedGrade.sort(function(a,b) { return b - a;});
        let rank = normalizedGrade.indexOf(grade);
        if (rank === -1 && grade < Math.max(...normalizedGrade)) {
            let newGrade = grade - 0.25;
            while (rank === -1 && newGrade >= 0) {
                rank = normalizedGrade.indexOf(newGrade);
                newGrade -= 0.25;
            }
        }
        if (grade === 0) return 100;
        if (grade <= Math.min(...normalizedGrade)) return 100;
        if (rank === -1) return 0;
        return Math.round((rank+1)/normalizedGrade.length*10000)/100;
    }

    function showTooltip(event, text) {
        const tooltip = d3.select(graphContainer)
            .append('div')
            .style('position', 'absolute')
            .style('background-color', 'rgba(255, 255, 255, 0.8)')
            .style('border', '1px solid #aaa')
            .style('padding', '5px')
            .style('pointer-events', 'none')
            .style('backdrop-filter', 'blur(5px)')
            .html(text);
    }

    function hideTooltip() {
        d3.select(graphContainer)
            .select('div')
            .remove();
    }
}

function hideHistogram() {
    graphContainer.style.display = 'none';
    pointerHelper.style.display = 'none';
    globalBridge.style.display = 'none';
}