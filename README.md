# Dom Smith, personal site

A single static page: `index.html`, `styles.css` and `main.js`. No build step.

To preview it locally, serve the folder (ES modules don't load from `file://`):

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

- Light and dark themes follow the device setting until someone uses the toggle, which is remembered.
- The hero's star field uses Three.js from unpkg. It pauses off screen and stays still for visitors who ask for reduced motion.
- `resume.html` is the full resume; its "Save as PDF" button prints a clean black-and-white copy.
