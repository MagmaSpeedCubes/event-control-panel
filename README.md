# event-control-panel

Create a self contained event A/V app which handles intercom, music, and slide.

The UI should be a control panel with the following sections

Center: current local time

Top: intercom controls including mode (live, recorded), volume, and music options (fade, pause, allow)

Bottom: settings 

Left: Current song playing and up next list. File box at bottom for option to add more songs. Above file box, options to play, pause, loop, and shuffle songs. Clickong on a song should stop playing the current song and jump to that one. 

Right: Current shown slide, image, or video and up next list. File box at bottom for option to add more media. Above file box, options to play, pause, or change transition time.  Clicking on a piece of media should stop playing the current piece of media and jump to the clicked one.



Control panel tasks (these tasks are triggered by manual input from the control panel):
-Intercom announcements. Take input from the laptop microphone or whatever device is being used as input and pass it through to the output device. Passthrough can either be live (passes through immediately when intercom active) or recorded (records audio when intercom active, plays when deactivated) Any music playing from the app should pause when an announcement is playing. 



Passive tasks (these tasks continue in the background without any input)
-Loops through pieces of event media. This can be images, videos, or pages of a slide deck. Create a second window to handle event media so the control panel remains accessible.
-Plays locally downloaded and imported music through file I/O. O

## Run instructions

This is a self-contained static app you can run from a local HTTP server. Browser permissions for microphone require a secure context (localhost or https). The easiest way to run:

1. Start a simple HTTP server in this folder (Python 3):

```bash
python3 -m http.server 8000
```

2. Open the control panel in your browser:

http://localhost:8000/index.html

3. Click `Open Display Window` to open the second window which will show slides/videos.

Notes:
- Use the `Music` file picker to add audio files. Click a song to jump to it. Use `Play`, `Pause`, `Loop`, and `Shuffle`.
- Use the `Slides / Media` file picker to add images or videos. Click items to show them on the display window. Set the transition time to control automatic looping.
- Intercom: choose `Live` (passthrough microphone to output) or `Recorded` (record while active, plays back when stopped). You must allow microphone access. The options `Pause music during announcement` and `Fade music` control music behavior during announcements.

If you want help packaging this into an Electron app or adding persistent playlists, tell me and I can continue.





