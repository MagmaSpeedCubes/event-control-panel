# event-control-panel
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






