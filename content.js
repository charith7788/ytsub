/*
    Title   :   Custom Youtube Subtitle
    Version :   1.0.1 (updated 2025/02/14)
    Description: Add and sync custom subtitles (SRT format) to YouTube videos.
    Author  :   Charitha Dayantha
    Country :   Sri Lanka
    Github  :   https://github.com/charith7788
    License :   GNU Public License

    content.js

*/


let subtitles = []; // Stores current subtitle data
let originalSubtitles = []; // Stores the original subtitle data for resetting
let currentSubtitleIndex = -1; // Tracks the current subtitle being displayed
let subtitleDiv = null; // The div element for displaying subtitles
let isSubtitleVisible = true; // Tracks subtitle visibility
let subtitleHistory = []; // Stores history for undo functionality
let isManualAdjustment = false; // Tracks if subtitles are being manually adjusted
let currentVideoId = null; // Tracks the current video ID
let isHoveringVideo = false;

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "parseSRT") {
        subtitleHistory = []; // Clear history when new subtitles are loaded
        parseSRT(request.data);
    }
});

// Parse the SRT subtitle file
function parseSRT(data) {
    const lines = data.split('\n');
    subtitles = [];
    originalSubtitles = []; // Reset originalSubtitles
    let index = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        if (!isNaN(lines[i].trim())) {
            index++;
            const startTimeEndTime = lines[i + 1].split(' --> ');
            const startTime = convertSRTTimeToSeconds(startTimeEndTime[0]);
            const endTime = convertSRTTimeToSeconds(startTimeEndTime[1]);

            // Collect all text lines until an empty line
            let textLines = [];
            let j = i + 2;
            while (j < lines.length && lines[j].trim() !== '') {
                textLines.push(lines[j].trim());
                j++;
            }

            const text = textLines.join('\n'); // Join lines with a newline
            subtitles.push({ start: startTime, end: endTime, text: text });
            originalSubtitles.push({ start: startTime, end: endTime, text: text }); // Store original

            i = j; // Skip processed lines
        }
    }
    console.log('Subtitles loaded:', subtitles);
}

// Convert SRT timestamp to seconds
function convertSRTTimeToSeconds(timeString) {
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2].replace(',', '.'));
    return hours * 3600 + minutes * 60 + seconds;
}

// Create subtitle div
function createSubtitleDiv() {
    const videoPlayer = document.querySelector('.html5-video-player');
    if (videoPlayer && !subtitleDiv) {
        subtitleDiv = document.createElement('div');
        subtitleDiv.style.position = 'absolute';
        subtitleDiv.style.bottom = '10%';
        subtitleDiv.style.left = '50%';
        subtitleDiv.style.transform = 'translateX(-50%)';
        subtitleDiv.style.color = 'white';
        subtitleDiv.style.fontSize = '20px';
        subtitleDiv.style.textShadow = '1px 1px 3px black';
        subtitleDiv.style.zIndex = '10000';
        subtitleDiv.style.textAlign = 'center';
        subtitleDiv.style.padding = '8px 12px';
        subtitleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        subtitleDiv.style.borderRadius = '5px';
        subtitleDiv.id = 'custom-subtitle';
        videoPlayer.appendChild(subtitleDiv);
    }
}

// Function to display the time difference
function displayTimeDifference(difference) {
    const videoPlayer = document.querySelector('.html5-video-player');
    if (!videoPlayer) return;

    // Remove any existing time difference display
    const existingDisplay = document.getElementById('time-difference-display');
    if (existingDisplay) {
        existingDisplay.remove();
    }

    // Create a new div to display the time difference
    const timeDisplayDiv = document.createElement('div');
    timeDisplayDiv.id = 'time-difference-display';
    timeDisplayDiv.style.position = 'absolute';
    timeDisplayDiv.style.top = '10px';
    timeDisplayDiv.style.left = '10px';
    timeDisplayDiv.style.color = 'white';
    timeDisplayDiv.style.fontSize = '16px';
    timeDisplayDiv.style.textShadow = '1px 1px 3px black';
    timeDisplayDiv.style.zIndex = '10000';
    timeDisplayDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    timeDisplayDiv.style.padding = '5px 10px';
    timeDisplayDiv.style.borderRadius = '5px';
    timeDisplayDiv.textContent = `Subtitle Delay: ${difference.toFixed(2)}s`;

    // Append the div to the video player
    videoPlayer.appendChild(timeDisplayDiv);

    // Fade out and remove the div after 1.5 seconds
    setTimeout(() => {
        timeDisplayDiv.style.transition = 'opacity 0.5s';
        timeDisplayDiv.style.opacity = '0';
        setTimeout(() => {
            timeDisplayDiv.remove();
        }, 500); // Remove after fade-out
    }, 1500);
}

// Adjust subtitle font size
function adjustSubtitleSize(increase = true) {
    const subtitleElement = document.getElementById("custom-subtitle"); // YouTube subtitle element
    if (!subtitleElement) return;

    const currentSize = parseFloat(window.getComputedStyle(subtitleElement).fontSize);
    const newSize = increase ? currentSize + 1 : currentSize - 1;

    subtitleElement.style.fontSize = `${newSize}px`;
    console.log(`Subtitle size changed to ${newSize}px`);
}

// Reset subtitle font size
function resetSubtitleFontSize(){
    const subtitleElement = document.getElementById("custom-subtitle"); // YouTube subtitle element
    if (!subtitleElement) return;

    subtitleElement.style.fontSize = '20px';
    console.log('Subtitle size changed to 20px');
}


// Display subtitle
function displaySubtitle(index) {
    if (subtitleDiv && index >= 0 && index < subtitles.length && isSubtitleVisible) {
        subtitleDiv.innerHTML = subtitles[index].text.replace(/\n/g, '<br>');
        subtitleDiv.style.display = 'block';
    } else if (subtitleDiv) {
        subtitleDiv.style.display = 'none';
    }
}

// Sync subtitles with video
function syncSubtitles() {
    if (isManualAdjustment) return; // Skip syncing during manual adjustments

    const video = document.querySelector('video');
    if (video) {
        const currentTime = video.currentTime;
        let found = false;

        for (let i = 0; i < subtitles.length; i++) {
            if (currentTime >= subtitles[i].start && currentTime <= subtitles[i].end) {
                currentSubtitleIndex = i;
                createSubtitleDiv();
                displaySubtitle(currentSubtitleIndex);
                found = true;
                break;
            }
        }

        if (!found) {
            currentSubtitleIndex = -1;
            displaySubtitle(currentSubtitleIndex);
        }
    }
}

// Reset subtitles to original timings
function resetSubtitles() {
    subtitles = JSON.parse(JSON.stringify(originalSubtitles)); // Restore from originalSubtitles
    currentSubtitleIndex = -1;
    console.log('Subtitles reset to initial position.');
    displaySubtitle(currentSubtitleIndex);
}

// Clear all subtitles from memory
function clearSubtitles() {
    subtitles = [];
    originalSubtitles = [];
    currentSubtitleIndex = -1;
    console.log('Subtitles cleared from memory.');
    if (subtitleDiv) {
        subtitleDiv.style.display = 'none'; // Hide the subtitle div
    }
}

// Adjust subtitle timings backward (manual sync)
function adjustSubtitlesBackward() {
    const video = document.querySelector('video');
    if (!video || !subtitles || subtitles.length === 0 || currentSubtitleIndex < 0) {
        console.error('Video or subtitles not found, or subtitles are empty.');
        return;
    }

    subtitleHistory.push(JSON.parse(JSON.stringify(subtitles))); // Save current state for undo
    const currentTime = video.currentTime;

    // Calculate the time difference between the video's current time and the subtitle's start time
    const timeDifference = currentTime - subtitles[currentSubtitleIndex].start;

    // Apply the time difference to all subtitles
    for (let i = 0; i < subtitles.length; i++) {
        subtitles[i].start += timeDifference;
        subtitles[i].end += timeDifference;
    }

    currentSubtitleIndex--;
    displaySubtitle(currentSubtitleIndex);

    // Display the time difference between the current subtitle's start time and its original start time
    const originalStartTime = originalSubtitles[currentSubtitleIndex].start;
    const currentStartTime = subtitles[currentSubtitleIndex].start;
    const startTimeDifference = currentStartTime - originalStartTime;
    displayTimeDifference(startTimeDifference);    

    // Temporarily disable syncSubtitles
    isManualAdjustment = true;
    setTimeout(() => {
        isManualAdjustment = false;
    }, 1000); // Re-enable after 1 second
}

// Adjust subtitle timings forward (manual sync)
function adjustSubtitlesForward() {
    const video = document.querySelector('video');
    if (!video || !subtitles || subtitles.length === 0 || currentSubtitleIndex >= subtitles.length - 1) {
        console.error('Video or subtitles not found, or subtitles are empty.');
        return;
    }

    subtitleHistory.push(JSON.parse(JSON.stringify(subtitles))); // Save current state for undo
    const currentTime = video.currentTime;

    // Calculate the time difference between the video's current time and the subtitle's start time
    const timeDifference = currentTime - subtitles[currentSubtitleIndex].start;

    // Apply the time difference to all subtitles
    for (let i = 0; i < subtitles.length; i++) {
        subtitles[i].start += timeDifference;
        subtitles[i].end += timeDifference;
    }

    currentSubtitleIndex++;
    displaySubtitle(currentSubtitleIndex);

    // Display the time difference between the current subtitle's start time and its original start time
    const originalStartTime = originalSubtitles[currentSubtitleIndex].start;
    const currentStartTime = subtitles[currentSubtitleIndex].start;
    const startTimeDifference = currentStartTime - originalStartTime;
    displayTimeDifference(startTimeDifference);    

    // Temporarily disable syncSubtitles
    isManualAdjustment = true;
    setTimeout(() => {
        isManualAdjustment = false;
    }, 1000); // Re-enable after 1 second
}


// Adjust subtitle timings backward by 100ms
function adjustSubtitlesBackward100ms() {
    if (!subtitles || subtitles.length === 0) {
        console.error('Subtitles not found or empty.');
        return;
    }

    subtitleHistory.push(JSON.parse(JSON.stringify(subtitles))); // Save current state for undo

    const video = document.querySelector('video');
    if (!video) return;

    // Find the nearest subtitle
    let nearestSubtitleIndex = -1;
    let minTimeDifference = Infinity;

    for (let i = 0; i < subtitles.length; i++) {
        const timeDifference = Math.abs(video.currentTime - subtitles[i].start);
        if (timeDifference < minTimeDifference) {
            minTimeDifference = timeDifference;
            nearestSubtitleIndex = i;
        }
    }

    if (nearestSubtitleIndex === -1) {
        console.error('No nearest subtitle found.');
        return;
    }

    // Shift all subtitles backward by 100ms
    for (let i = 0; i < subtitles.length; i++) {
        subtitles[i].start += 0.1; // 100ms = 0.1 seconds
        subtitles[i].end += 0.1;
    }

    currentSubtitleIndex = nearestSubtitleIndex;
    displaySubtitle(currentSubtitleIndex);

    // Display the time difference between the current subtitle's start time and its original start time
    const originalStartTime = originalSubtitles[currentSubtitleIndex].start;
    const currentStartTime = subtitles[currentSubtitleIndex].start;
    const startTimeDifference = currentStartTime - originalStartTime;
    displayTimeDifference(startTimeDifference);

    // Temporarily disable syncSubtitles
    isManualAdjustment = true;
    setTimeout(() => {
        isManualAdjustment = false;
    }, 1000); // Re-enable after 1 second
}

// Adjust subtitle timings forward by 100ms
function adjustSubtitlesForward100ms() {
    if (!subtitles || subtitles.length === 0) {
        console.error('Subtitles not found or empty.');
        return;
    }

    subtitleHistory.push(JSON.parse(JSON.stringify(subtitles))); // Save current state for undo

    const video = document.querySelector('video');
    if (!video) return;

    // Find the nearest subtitle
    let nearestSubtitleIndex = -1;
    let minTimeDifference = Infinity;

    for (let i = 0; i < subtitles.length; i++) {
        const timeDifference = Math.abs(video.currentTime - subtitles[i].start);
        if (timeDifference < minTimeDifference) {
            minTimeDifference = timeDifference;
            nearestSubtitleIndex = i;
        }
    }

    if (nearestSubtitleIndex === -1) {
        console.error('No nearest subtitle found.');
        return;
    }

    // Shift all subtitles forward by 100ms
    for (let i = 0; i < subtitles.length; i++) {
        subtitles[i].start -= 0.1; // 100ms = 0.1 seconds
        subtitles[i].end -= 0.1;
    }

    currentSubtitleIndex = nearestSubtitleIndex;
    displaySubtitle(currentSubtitleIndex);

    // Display the time difference between the current subtitle's start time and its original start time
    const originalStartTime = originalSubtitles[currentSubtitleIndex].start;
    const currentStartTime = subtitles[currentSubtitleIndex].start;
    const startTimeDifference = currentStartTime - originalStartTime;
    displayTimeDifference(startTimeDifference);

    // Temporarily disable syncSubtitles
    isManualAdjustment = true;
    setTimeout(() => {
        isManualAdjustment = false;
    }, 1000); // Re-enable after 1 second
}


    
// Undo subtitle adjustments
function undoSubtitles() {
    if (subtitleHistory.length > 0) {
        subtitles = subtitleHistory.pop(); // Restore previous state
        displaySubtitle(currentSubtitleIndex);
    }
}

// Detect video changes
function detectVideoChange() {
    const video = document.querySelector('video');
    if (video) {
        const videoId = new URL(window.location.href).searchParams.get('v');
        if (videoId && videoId !== currentVideoId) {
            currentVideoId = videoId;
            clearSubtitles(); // Clear subtitles when a new video is loaded
        }
    }
}



// Detect when the mouse enters and leaves the video player
document.addEventListener("mouseover", function (event) {
    if (event.target.tagName === "VIDEO") {
        isHoveringVideo = true;
    }
});

document.addEventListener("mouseout", function (event) {
    if (event.target.tagName === "VIDEO") {
        isHoveringVideo = false;
    }
});

// Key bindings
document.addEventListener('keydown', function(event) {
    if (!isHoveringVideo) return;

    const video = document.querySelector('video');
    if (video && subtitles && subtitles.length > 0) {
        if (event.key === 's') { // Show subtitles
            isSubtitleVisible = true;
            displaySubtitle(currentSubtitleIndex);
        } else if (event.key === 'h') { // Hide subtitles
            isSubtitleVisible = false;
            displaySubtitle(currentSubtitleIndex);
        } else if (event.key === ',' || event.key === '<') { // Manual sync backward
            event.preventDefault();
            event.stopPropagation();
            adjustSubtitlesBackward();
            adjustSubtitlesBackward();
        } else if (event.key === '.' || event.key === '>') { // Manual sync forward
            event.preventDefault();
            event.stopPropagation();
            adjustSubtitlesForward();
            adjustSubtitlesForward();
        } else if (event.key === '[') { // Adjust backward by 100ms
            event.preventDefault();
            event.stopPropagation();
            adjustSubtitlesBackward100ms();
        } else if (event.key === ']') { // Adjust forward by 100ms
            event.preventDefault();
            event.stopPropagation();
            adjustSubtitlesForward100ms();
        } else if (event.key === 'u') { // Undo changes
            undoSubtitles();
        } else if (event.key === 'r') { // Reset to original timings
            event.preventDefault();
            event.stopPropagation();
            resetSubtitles();
            resetSubtitleFontSize();
        } else if (event.key === "+") { // Increase subtitle font size by 1px
            event.preventDefault();
            event.stopPropagation();
            adjustSubtitleSize(true)
        } else if (event.key === "-") { // Increase subtitle font size by 1px
            event.preventDefault();
            event.stopPropagation();
            adjustSubtitleSize(false);
        }else if (event.key === "*") { // Reset subtitle font size to 20px
            event.preventDefault();
            event.stopPropagation();
            resetSubtitleFontSize();
        }
        
    }
}, true); // Use capture phase to intercept the event before YouTube handles it

// Sync subtitles every 500ms
setInterval(syncSubtitles, 500);

// Detect video changes every second
setInterval(detectVideoChange, 1000);
