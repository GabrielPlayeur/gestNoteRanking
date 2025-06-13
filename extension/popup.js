document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('toggle');
    const savedState = localStorage.getItem('allow');
    const powerUp = document.getElementById('powerup');
    const downgrade = document.getElementById('downgrade');
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          let activeTabUrl = tabs[0].url;
          if (activeTabUrl.includes("https://scolarite.polytech.univ-nantes.fr/")) {
            downgrade.style.opacity = '0';
            document.getElementById("placeholder").style.display = "none";
            document.getElementById("main").style.justifyContent = "space-evenly";
            document.getElementById("title").style.marginBlockEnd = "0px";
            let hidden = document.getElementsByClassName("hidden");
            for (let i = 0; i < hidden.length; i++) {
                hidden[i].style.display = "block";
            }
            if (savedState) {
                toggle.checked = savedState === 'true';
            }
            sendState(toggle);
          }
        }
      });

    // gestion des animations
    toggle.addEventListener('change', function() {
        if (this.checked) {
            powerUp.style.transition = 'bottom .6s ease-in-out';
            powerUp.style.visibility = 'visible';
            powerUp.style.bottom = '400px';
            downgrade.style.opacity = '0';
        } else {
            powerUp.style.transition = 'none';
            powerUp.style.visibility = 'hidden';
            powerUp.style.bottom = '-100px';
            downgrade.style.opacity = '1';
            setTimeout(function() {
                downgrade.style.opacity = '0';
            }, 400);
        }
        sendState(toggle);
    });
})

function sendState(toggle){
    localStorage.setItem('allow', toggle.checked);
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {allow: toggle.checked})
            .then(response => {
                setTimeout(() => {
                    console.log('Message sent successfully:', response);
                }, 100);
            })
            .catch(error => {
                console.error('Error sending message:', error);
            });
    });
}