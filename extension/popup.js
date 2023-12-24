document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('toggle');
    const savedState = localStorage.getItem('allow');

    if (savedState) {
        toggle.checked = savedState === 'true';
    }

    sendState(toggle);

    toggle.addEventListener('change', function() {
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