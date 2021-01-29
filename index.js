// linear algebra helpers
function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}
function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}
function mul(a, k) {
    return { x: a.x * k, y: a.y * k };
}
function zero() {
    return { x: 0, y: 0 };
}
function magnitude(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y);
}
function normalize(a) {
    let mag = magnitude(a);
    return { x: a.x / mag, y: a.y / mag };
}
// camera helper
function getCameraBounds(camera = CAMERA) {
    let w = window.innerWidth * camera.scale;
    let h = window.innerHeight * camera.scale;
    return {
        lower: {
            x: camera.x - w/2,
            y: camera.y - h/2,
        },
        upper: {
            x: camera.x + w/2,
            y: camera.y + h/2,
        },
    };
}


// constants

const GRAVITY_CONSTANT = 1e7;
const MAX_BODY_SIZE = 30;
const FPS = 100;

var CAMERA = { x: 0, y: 0, scale: 1 };
var bodies = [
    // {
    //  velocity: {
    //      x: ...,
    //      y: ...,
    //  },
    //  mass: ...,
    //  position: {
    //      x: ...,
    //      y: ...,
    //  },
    //  img: <img/>
    // },
];

// listeners
var UNIVERSE = document.getElementById("universe");
// add bodies
UNIVERSE.addEventListener("click", e => {
    let rect = e.target.getBoundingClientRect();
    let relativeX = (e.clientX - rect.left) / rect.width; // relative x position within the element, from 0 to 1.
    let relativeY = (e.clientY - rect.top) / rect.height;  // relative y position within the element, from 0 to 1.
    let bounds = getCameraBounds();
    let boundsSize = sub(bounds.upper, bounds.lower);
    let x = relativeX * boundsSize.x + bounds.lower.x;
    let y = relativeY * boundsSize.y + bounds.lower.y;

    createBody(x, y);
});
// zoom
UNIVERSE.addEventListener("wheel", e => {
    e.preventDefault();
    e.stopPropagation();
    let sign = e.deltaY / 100; // -1 or 1
    if (sign > 0) {
        CAMERA.scale *= 1.1;
    } else {
        CAMERA.scale /= 1.1;
    }
});

// generate bodies
for(let i = 0; i < 10; i++) {
    let w = window.innerWidth;
    let h = window.innerHeight;
    createBody(Math.random() * w - w/2, Math.random() * h - h/2);
}

function randomizeMass() {
    return Math.exp(Math.random()) / Math.log(MAX_BODY_SIZE);
}

function createBody(x, y) {
    // create body
    let image = document.createElement("div");
    document.getElementById("universe").append(image);

    // add to bodies
    bodies.push({
        mass: randomizeMass(),
        velocity: {
            x: 0,
            y: 0,
        },
        force: {
            x: 0,
            y: 0,
        },
        position: {
            x: x,
            y: y,
        },
        img: image,
    });
    renderBody(bodies[bodies.length - 1]);
}

function renderBody(body, camera = CAMERA) {
    let bounds = getCameraBounds(CAMERA);
    let boundsSize = sub(bounds.upper, bounds.lower);
    let leftPercent = (body.position.x - bounds.lower.x) / boundsSize.x * 100;
    let topPercent = (body.position.y - bounds.lower.y) / boundsSize.y * 100;
    let size = body.mass * MAX_BODY_SIZE / camera.scale;

    // update body properties
    body.img.className = "star";
    body.img.style.left = leftPercent + "%";
    body.img.style.top = topPercent + "%";
    body.img.style.width = size + "px";
    body.img.style.height = size + "px";
}

// simulation loop
function loop() {
    bodies.forEach((body) => {
        body.force = zero();
    });
    // Calculate combined forces of all bodies
    bodies.forEach((body) => {
        bodies.forEach((other) => {
            if (body !== other) {
                let distance = magnitude(sub(body.position, other.position));
                // F = G*m1*m2/r^2
                let F = GRAVITY_CONSTANT * body.mass * other.mass / (distance * distance);
                let f = normalize(sub(other.position, body.position));
                f = mul(f, F);
                body.force = add(body.force, f);
            }
        });
    });
    // Applying forces to velocities, and relocate bodies
    bodies.forEach((body) => {
        // F = ma => a = F/m
        let acceleration = mul(body.force, 1 / body.mass);
        // v = v + a*t  ,   t = 1/FPS
        body.velocity = add(body.velocity, mul(acceleration, 1/FPS));
        // x = x + v*t  ,   t = 1/FPS
        body.position = add(body.position, mul(body.velocity, 1/FPS));
        renderBody(body);
    });
}

setInterval(loop, 1000 / FPS);