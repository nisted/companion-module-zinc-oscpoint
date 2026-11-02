## OSCPoint: PowerPoint, but you drive it over OSC

OSCPoint is a PowerPoint add-in that lets you control PowerPoint on Windows using Open Sound Control (OSC).

You'll need the free add-in downloaded and installed on each of your show machines. Everything you need is at the link below:

https://github.com/phuvf/oscpoint

### Connection status: no fibbing

UDP doesn't do handshakes, so just opening a port proves nothing. This version only shows **OK** once OSCPoint actually replies.

- **Connecting** ("Waiting for OSCPoint to reply...") is what you'll see at first, while I wait to hear back.
- **OK** ("Connected.") means a real message has come back from OSCPoint.
- **Connection failure** ("No response from OSCPoint at IP:port") means I've heard nothing for longer than the timeout. Is PowerPoint open, is the IP right, and are the ports right? I'll keep trying in the meantime.

When things go quiet for more than 5 seconds, I give OSCPoint a nudge (a feedback refresh request) to see if it's still there.

**Connection timeout (seconds, 0 = off)** sets how long I wait before calling it failed. Default is **10**, range 0 to 120. Set it to **0** and you get the old behaviour: OK as soon as the local port is open ("Listening (heartbeat disabled)"), whether OSCPoint is there or not.

You'll need OSC feedbacks switched on in OSCPoint for any of this to work. No feedback, no replies, no OK.

### Main and backup: keeping two machines in step

Got a main PowerPoint machine and a backup? The backup can follow the main one: same slide, same build, and (if you like) same start, end and pause of the slide show.

#### Setting up the two connections

1. Install OSCPoint on both machines.
2. In Companion, add two OSCPoint connections: one pointing at the main machine's IP, one at the backup's.
3. Give each connection its own **Local port**, and set the matching port on that machine's OSCPoint ribbon tab, so you get feedback from both. The [configuration examples page on GitHub](https://github.com/phuvf/oscpoint/blob/main/CONFIGURATION.md) has example setups.
4. Note the label of the main connection (say, `Main`). Everything below assumes it's called **Main**. If yours is called something else, swap "Main" for your label in every option.

Companion modules can't peek at another connection's variables directly, so the main machine's position comes in through option fields that take variables, like `$(Main:currentSlide)`.

#### Action: Sync: follow another connection (slide + build)

Put this on the **backup** connection. It moves the backup PowerPoint to match the main one.

| Option | Default | What it does |
| --- | --- | --- |
| Source slide | `$(Main:currentSlide)` | The slide to go to. |
| Source build position | `$(Main:buildPosition)` | The build to go to on that slide. |
| Source show state (optional) | `$(Main:state)` | Lets the backup copy start, end and pause. |
| Also mirror start / end / pause of the slide show | On | If the main show ends, the backup ends. If the backup isn't running, it starts at the right slide. Pause and resume are copied too. |
| Use OSCPoint Helper to jump straight to the build (no flash-through) | Off | Needs the Helper (see below). Jumps straight to the slide and build instead of stepping through each build. |
| Delay between build steps (ms) | 30 | Gap between each "next" or "previous" when stepping through builds. 0 to 1000. |
| Wait after starting slide show (ms) | 1000 | How long to wait after starting the show before stepping to the build. 0 to 10000. |

How it gets there:

- **Same slide, different build:** steps forwards or backwards through the builds.
- **Different slide:** goes to the slide, then steps forward to the build.
- **With the Helper ticked and the Helper online:** jumps straight to the slide and build in one go.
- If the backup's slide show isn't running and mirroring is off, the sync is ignored.
- If the source slide isn't a valid number (usually a typo in the connection label), nothing happens and a note goes in the debug log.

If several syncs fire close together, they queue up one after another rather than tripping over each other. It also remembers where it last sent the backup for a moment, so it doesn't overshoot while the backup's own feedback catches up.

**Making it follow automatically:** add a Companion trigger with the event "On variable change" for `$(Main:currentSlide)`, `$(Main:buildPosition)` and `$(Main:state)`, and the action **Sync: follow another connection**. Or just put it on a button for a manual "sync now".

#### Feedback: Sync: out of step with source connection

Goes red (white text) when the backup isn't on the same slide and build as the main one. Options: **Source slide** (`$(Main:currentSlide)`) and **Source build position** (`$(Main:buildPosition)`).

#### Action: Open presentation matching another connection

Opens the file with the same name as the main machine's presentation, from this machine's active folder. If it's already open, it switches to it.

- **Presentation name**, default `$(Main:presentationName)`.
- If the name has no `.ppt` or `.pptx` on the end, I look for a match in this machine's active folder list (not fussy about capitals).
- If the file isn't in the active folder list, I warn in the log and try anyway.
- File access must be enabled in OSCPoint on this machine.

#### Presets: Main / backup sync

Under **Main / backup sync → Follow another connection**. Use them on the backup connection, and edit "Main" to match your label.

- **Sync to Main now**: runs the sync once. Goes red when out of step.
- **Main vs this machine (slide.build)**: shows both positions side by side, green when matched, red when not. It shows this machine as `$(OSCPoint:...)`, so if your backup connection has a different label, edit that too.
- **Open Main's presentation here**: opens the matching file.
- **Open Main's presentation, then sync**: opens the matching file, waits 3 seconds, then syncs.

### OSCPoint Helper: the optional extra

The OSCPoint Helper is a separate little Windows tray app that runs on the PowerPoint machine, alongside OSCPoint. You don't need it for anything above, apart from the "jump straight to the build" sync option. It adds:

- custom slide shows
- go to a build directly (no flash-through)
- Presenter View notes: scrolling and text size
- a VT remaining-time overlay

**Getting it:** grab `OSCPointHelper.exe` from the [OSCPoint Helper releases page](https://github.com/nisted/oscpoint-helper/releases) and run it on each PowerPoint machine. It's a single file, no installer, no fuss.

#### Settings

- **OSCPoint Helper port (0 = not used)**: default **35553**. The Helper lives at the same IP as the connection (the **Remote IP**), on this port. Set it to **0** if you're not using it, and Helper actions will be ignored (with a warning in the log).
- The Helper's replies come back on the connection's **Local port**, same as OSCPoint's.

I ping the Helper every 5 seconds. If it goes quiet for 12 seconds after being online, it's marked offline and a warning goes in the log.

#### Actions

**Helper: start custom slide show**: starts a named custom show (the ones under Slide Show > Custom Slide Show in PowerPoint).
- **Custom show**: dropdown filled from the open presentation's list. You can also type a name or use a variable.
- **End any running slide show first**: default on.

**Helper: refresh custom show list**: asks the Helper for the latest custom show list. No options.

**Helper: go to build (no flash-through)**: jumps straight to a build using PowerPoint's GotoClick.
- **Slide (blank = current)**: default blank.
- **Build (0 = before first build)**: default 1.

**Helper: scroll Presenter View notes**
- **Direction**: Down (lines), Up (lines), Page down, Page up, To top, To bottom. Default Down (lines).
- **Lines**: default 1, range 1 to 50. Only used for Down and Up.
- On a rotary, put "Down" on rotate right and "Up" on rotate left.

**Helper: Presenter View notes text size**
- **Size**: Larger or Smaller. Default Larger.
- **Steps**: default 1, range 1 to 10.

**Helper: VT remaining-time overlay**
- **Action**: Enable, Hide, Toggle, Bigger, Smaller, Positioning mode on, Positioning mode off. Default Toggle.

#### Feedback

**Helper: OSCPoint Helper is responding**: goes green (white text) while the Helper is online. No options.

#### Variables

| Variable | What's in it |
| --- | --- |
| `helperStatus` | OSCPoint Helper status: offline / no-powerpoint / powerpoint / slideshow. Shows "not used" when the Helper port is 0. |
| `helperVersion` | OSCPoint Helper version. |
| `customShows` | JSON array of custom slide show names (from OSCPoint Helper). |
| `customShowCount` | Number of custom slide shows in the active presentation. |

#### Presets: OSCPoint Helper

- **Custom shows & builds**: Helper status (red, green when the Helper is online), Start custom show (pick the show in the button's action), Refresh custom show list (shows the count), Go to build.
- **Presenter View notes**: Notes scroll up, Notes scroll down (3 lines each), Notes to top, Notes scroll (rotary, press = top), Notes text larger, Notes text smaller, Notes text size (rotary).
- **VT remaining-time overlay**: VT timer overlay on/off, VT timer bigger, VT timer smaller, VT timer positioning mode (first press on, second press off).

The Helper status and count presets use `$(OSCPoint:...)`, so edit the label if your connection is called something else.

### Psst. This one's got mates. 🍹

This tweaked OSCPoint module is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It's all here: [github.com/nisted/companion-modules](https://github.com/nisted/companion-modules)
