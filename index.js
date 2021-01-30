// constants

const GRAVITY_CONSTANT = 1e-2;
const MAX_BODY_RADIUS = 10;
const SUPERSTAR_MASS_THRESHOLD = 10;
const BODIES_COUNT = 500;
// const FPS = 100;

var CAMERA = {
    position: {
        x: 0,
        y: 0,
    },
    scale: 1
};
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
var selected = null;

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
    console.log(sign);
    CAMERA.scale *= Math.exp(sign * Math.log(10));
});

// generate bodies
createBody(0, 0, MAX_BODY_RADIUS, 1e5);
for(let i = 0; i < BODIES_COUNT; i++) {
    // http://www.anderswallin.net/2009/05/uniform-random-points-in-a-circle-using-polar-coordinates/
    let angle = Math.random() * 2 * Math.PI;
    let R = Math.min(window.innerWidth, window.innerHeight);
    let r = R * Math.sqrt(Math.random());
    let x = Math.cos(angle) * r;
    let y = Math.sin(angle) * r;

    createBody(x, y);
}
// add initial velocities
bodies.forEach((body) => {
    if (body === bodies[0]) {
        return;
    }

    let gravityDirection = normalize(gravityForce(body));
    let F = Math.sqrt(GRAVITY_CONSTANT * bodies[0].mass / magnitude(body.position));
    let f = mul(gravityDirection, F);

    body.velocity.x = f.y;
    body.velocity.y = -f.x;

    body.velocity.x *= randomFloat(1/1.2, 1.2);
    body.velocity.y *= randomFloat(1/1.2, 1.2);
});

function randomizeRadius() {
    return Math.exp(Math.random() * Math.log(MAX_BODY_RADIUS));
}
function randomizeMass() {
    return Math.exp(Math.random() * Math.log(1));
}

function createBody(x, y, radius = null, mass = null) {
    // create body
    let image = document.createElement("div");
    document.getElementById("universe").append(image);

    // add to bodies
    let body = {
        radius: radius || randomizeRadius(),
        mass: mass || randomizeMass(),
        velocity: {
            x: 0,
            y: 0,
        },
        position: {
            x: x,
            y: y,
        },
        img: image,
    };
    image.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selected !== body) {
            selected = body;
        } else {
            selected = null;
        }
    });

    bodies.push(body);
    renderBody(body);
}

function renderBody(body, camera = CAMERA) {
    let bounds = getCameraBounds(CAMERA);
    let boundsSize = sub(bounds.upper, bounds.lower);
    let leftPercent = (body.position.x - bounds.lower.x) / boundsSize.x * 100;
    let topPercent = (body.position.y - bounds.lower.y) / boundsSize.y * 100;
    let size = Math.round(body.radius / camera.scale);

    let redness = 0;
    if (body.mass > SUPERSTAR_MASS_THRESHOLD) {
        // redness = Math.min(255, body.mass / Math.sqrt(SUPERSTAR_MASS_THRESHOLD));
    }

    // update body properties
    body.img.className = "star" + (selected === body ? " selected" : "");
    body.img.style.left = leftPercent + "%";
    body.img.style.top = topPercent + "%";
    body.img.style.width = size + "px";
    body.img.style.height = size + "px";
    body.img.style.backgroundColor = "rgb(255," + (255 - redness) + "," + (255 - redness) + ")";
}

// simulation loop
function loop() {
    // Calculate combined forces of all bodies
    let force = {};
    bodies.forEach((body, i) => {
        force[i] = gravityForce(body);
    });
    // Applying forces to velocities, and relocate bodies
    bodies.forEach((body, i) => {
        // F = ma => a = F/m
        let acceleration = mul(force[i], 1 / body.mass);
        // v = v + a
        body.velocity = add(body.velocity, mul(acceleration, 1));
        // x = x + v
        body.position = add(body.position, mul(body.velocity, 1));
    });
    // Collision simulation
    let deleted = {};
    for(let i = 0; i < bodies.length; i++) {
        for(let j = i + 1; j < bodies.length; j++) {
            let b1 = bodies[i];
            let b2 = bodies[j];
            if (!deleted[i] && !deleted[j] && isCollided(b1, b2)) {
                b1.mass = b1.mass + b2.mass;
                b1.radius = Math.sqrt(b1.radius * b1.radius + b2.radius * b2.radius);
                b1.velocity = mul(add(mul(b1.velocity, b1.mass), mul(b2.velocity, b2.mass)), 1 / (b1.mass + b2.mass));
                b1.position = mul(add(mul(b1.position, b1.mass), mul(b2.position, b2.mass)), 1 / (b1.mass + b2.mass));
                deleted[j] = true;
            }
        }
    }
    // remove all deleted objects
    let newBodies = [];
    for(let i = 0; i < bodies.length; i++) {
        if (!deleted[i]) {
            newBodies.push(bodies[i]);
        } else {
            bodies[i].img.parentNode.removeChild(bodies[i].img);
            delete bodies[i];
        }
    }
    bodies = newBodies;
    // render all bodies
    bodies.forEach((body) => {
        renderBody(body);
    });
}

setInterval(loop, 0);

// linear algebra functions
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

// arithmetic functions
function randomFloat(l, r) {
    return Math.random() * (r - l) + l;
}

// camera helper
function getCameraBounds(camera = CAMERA) {
    let w = window.innerWidth * camera.scale;
    let h = window.innerHeight * camera.scale;
    return {
        lower: {
            x: camera.position.x - w/2,
            y: camera.position.y - h/2,
        },
        upper: {
            x: camera.position.x + w/2,
            y: camera.position.y + h/2,
        },
    };
}

// physics functions
function gravityForce(body) {
    let force = zero();
    bodies.forEach((other) => {
        if (body !== other) {
            let distance = magnitude(sub(body.position, other.position));
            // two bodies collided, no gravity force
            if (isCollided(body, other)) {
                return;
            }
            // F = G*m1*m2/r^2
            let F = GRAVITY_CONSTANT * body.mass * other.mass / (distance * distance);
            let f = normalize(sub(other.position, body.position));
            f = mul(f, F);
            force = add(force, f);
        }
    });
    return force;
}
function isCollided(body1, body2) {
    let distance = magnitude(sub(body1.position, body2.position));
    return distance < (Math.max(body1.radius, body2.radius) - Math.min(body1.radius, body2.radius));
}

