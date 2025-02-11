/*
    Title   :   Custom Youtube Subtitle
    Version :   1.0.0 (initial version)
    Author  :   Charitha Dayantha
    Country :   Sri Lanka
    Github  :   https://github.com/charith7788
    License :   GNU Public License

    content.js

*/

document.getElementById('addSubtitle').addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt';

    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const subtitleContent = e.target.result;
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "parseSRT", data: subtitleContent});
                });
            };
            reader.readAsText(file);
        }
    };

    input.click();
});