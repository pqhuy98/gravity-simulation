# Gravity Simulation  
Simulation of the gravitational N-body system. Built completely from vanilla HTML, CSS and JavaScript.

Have a look at this cool stuff: [gravity.quangdel.com](https://gravity.quangdel.com/).  

## Features:
- Zoom in/out (mouse wheel), camera move (mouse left and drag).
- Left click on space to create new star systems.
- Frame rate is shown on top-right corner.
- Number of objects is shown on bottom left corner, first number.
- Press key `R` to restart, key `C` to clear cache and restart.

## Technical features:
- Number of objects is auto-adjusted based on client's frame rate and cached on `localStorage`.  
- Very fast gravity approximation using Quadtree, `O(N*log(N))` instead of `O(N^2)` ([Barnes-Hut simulation](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation)).
- Objects and glows are drawn using [HTML Canvas](https://www.w3schools.com/html/html5_canvas.asp).