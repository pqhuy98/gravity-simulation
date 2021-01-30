// constants

const GRAVITY_CONSTANT = 1e-3;
const SUPERSTAR_MASS = 1e7;
const MAX_BODY_RADIUS = 10;
const BODIES_COUNT = 500;
const INITIAL_DEVIATION = 1.05;
const EXPANSION_RATE = 0.05
const FPS = 60;
const CCW = Math.floor(Math.random() * 2) * 2 - 1;

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
    //  dom: <dom/>
    // },
];
var selected = null;

// listeners
const UNIVERSE = document.getElementById("universe");
// add bodies
UNIVERSE.addEventListener("click", e => {
    let rect = e.target.getBoundingClientRect();
    let relativeX = (e.clientX - rect.left) / rect.width; // relative x position within the element, from 0 to 1.
    let relativeY = (e.clientY - rect.top) / rect.height;  // relative y position within the element, from 0 to 1.
    let bounds = getCameraBounds();
    let boundsSize = sub(bounds.upper, bounds.lower);
    let x = relativeX * boundsSize.x + bounds.lower.x;
    let y = relativeY * boundsSize.y + bounds.lower.y;

    let body = createBody({
        x, y,
        mass: randomizeMass(),
        initialRadius: 0,
        targetRadius: randomizeRadius(),
    });
    console.log(magnitude(sub(bodies[0].position, body.position)), bodies[0].radius - body.radius, bodies[0].position, body.position);
});
// zoom
UNIVERSE.addEventListener("wheel", e => {
    e.preventDefault();
    e.stopPropagation();
    let sign = e.deltaY / 100; // -1 or 1
    CAMERA.scale *= Math.exp(sign * Math.log(1.1));
    // GRAVITY_CONSTANT *= Math.exp(sign * Math.log(1.1));
});

// generate initial bodies
createBody({
    x: 0, y: 0,
    mass: SUPERSTAR_MASS,
    initialRadius: 3 * MAX_BODY_RADIUS,
    targetRadius: 3 * MAX_BODY_RADIUS,
});
for(let i = 0; i < BODIES_COUNT; i++) {
    createRandomBody({
        initialRadius: 1,
    });
}

// simulation loop
setInterval(() => {
    if (bodies.length < BODIES_COUNT) {
        createRandomBody({ initialRadius: 0 });
    }
    loop();
}, 1000/FPS);

function createRandomBody({ initialRadius = 1}) {
    // http://www.anderswallin.net/2009/05/uniform-random-points-in-a-circle-using-polar-coordinates/
    let angle = Math.random() * 2 * Math.PI;
    let R = (window.innerWidth + window.innerHeight) / 2 / 2;
    let r = R * Math.sqrt(Math.random()) + bodies[0].radius;
    let x = Math.cos(angle) * r + bodies[0].position.x;
    let y = Math.sin(angle) * r + bodies[0].position.y;
    let radius = randomizeRadius();

    let body = createBody({
        x, y,
        mass: randomizeMass(),
        initialRadius: initialRadius * radius,
        targetRadius: radius,
    });
    if (body === bodies[0]) {
        return;
    }

    let gravityDirection = normalize(gravityForce(body));
    let F = Math.sqrt(GRAVITY_CONSTANT * bodies[0].mass / magnitude(body.position));
    let f = mul(gravityDirection, F);

    let sign = CCW;//Math.floor(Math.random() * 2) * 2 - 1;
    body.velocity.x = f.y * sign;
    body.velocity.y = -f.x * sign;

    let deviation = INITIAL_DEVIATION;
    body.velocity.x *= randomFloat(1/deviation, deviation);
    body.velocity.y *= randomFloat(1/deviation, deviation);
}

function createBody({ x, y, mass, initialRadius, targetRadius }) {
    // create body
    let image = document.createElement("div");
    document.getElementById("universe").append(image);

    // add to bodies
    let body = {
        radius: initialRadius,
        targetRadius: targetRadius,
        mass: mass,
        velocity: {
            x: 0,
            y: 0,
        },
        position: {
            x: x,
            y: y,
        },
        dom: image,
    };
    // body.targetRadius = body.radius;
    image.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selected !== body) {
            selected = body;
            console.log(selected);
        } else {
            selected = null;
        }
    });

    bodies.push(body);
    renderBody(body);
    return body;
}

function renderBody(body, camera = CAMERA) {
    // if (!isInView(body, camera)) {
    //     body.dom.style.visibility='hidden';
    // }

    let bounds = getCameraBounds(CAMERA);
    let boundsSize = sub(bounds.upper, bounds.lower);

    let leftPercent = (body.position.x - bounds.lower.x) / boundsSize.x * 100;
    let topPercent = (body.position.y - bounds.lower.y) / boundsSize.y * 100;
    let size = Math.round(2 * body.radius / camera.scale);

    let color1 = "hsl(" + ((60 + 0.1 * body.radius) % 360) + ", 100%, 50%)";
    let color2 = "hsl(" + ((60 + 0.1 * body.radius) % 360)+ ", 100%, 50%)";

    // update body properties
    // body.dom.style.visibility='visible';
    body.dom.className = "star" + (selected === body ? " selected" : "");
    body.dom.style.left = leftPercent + "%";
    body.dom.style.top = topPercent + "%";
    body.dom.style.width = size + "px";
    body.dom.style.height = size + "px";
    body.dom.style.boxShadow = `
        0 0 50px #fff,
        -50px 0 100px ` + color1 + `,
        50px 0 100px ` + color2;
}

// simulation loop
function loop() {
    collisionDetection();
    applyGravity();
    // render all bodies
    bodies.forEach((body) => {
        renderBody(body);
    });
    console.log("!");
}

function collisionDetection() {
    // Collision simulation
    let deleted = {};
    for(let i = 0; i < bodies.length; i++) {
        for(let j = i + 1; j < bodies.length; j++) {
            let b1 = bodies[i];
            let b2 = bodies[j];
            if (!deleted[i] && !deleted[j] && isCollided(b1, b2)) {
                if (b1.mass < b2.mass) {
                    b1.position = b2.position;
                }
                b1.mass = b1.mass + b2.mass;
                b1.targetRadius = Math.sqrt(b1.targetRadius * b1.targetRadius + b2.targetRadius * b2.targetRadius);
                b1.velocity = mul(add(mul(b1.velocity, b1.mass), mul(b2.velocity, b2.mass)), 1 / (b1.mass + b2.mass));
                b1.position = mul(add(mul(b1.position, b1.mass), mul(b2.position, b2.mass)), 1 / (b1.mass + b2.mass));
                if (b1.radius < b2.radius) {
                    b1.radius = b2.radius;
                }
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
            bodies[i].dom.parentNode.removeChild(bodies[i].dom);
            delete bodies[i];
        }
    }
    bodies = newBodies;
}

function applyGravity() {
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
        body.radius += (body.targetRadius - body.radius) * EXPANSION_RATE; 
    });
}

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
function isInView(body, camera = CAMERA) {
    let lower = sub(body.position, { x: body.radius, y: body.radius });
    let upper = add(body.position, { x: body.radius, y: body.radius });
    let bounds = getCameraBounds(camera);
    if (lower.x < bounds.lower.x || lower.y < bounds.lower.y) return false;
    if (upper.x > bounds.upper.x || upper.y > bounds.upper.y) return false;
    return true;
}

// physics functions
function gravityForce(body) {
    let force = zero();
    bodies.forEach((other) => {
        if (body !== other) {
            let distance = magnitude(sub(body.position, other.position));
            // // two bodies collided, no gravity force
            // if (isCollided(body, other)) {
            //     return;
            // }
            // f = G*m1*m2*(x1-x2)/r^3
            let f = mul(sub(other.position, body.position), GRAVITY_CONSTANT * body.mass * other.mass / (distance * distance * distance));
            force = add(force, f);
        }
    });
    return force;
}
function isCollided(body1, body2) {
    let distance = magnitude(sub(body1.position, body2.position));
    return distance < (Math.max(body1.radius, body2.radius) -1 * Math.min(body1.radius, body2.radius));
}
function randomizeRadius() {
    return Math.exp(Math.random() * Math.log(MAX_BODY_RADIUS));
}
function randomizeMass() {
    return Math.random();//Math.exp(Math.random()) / Math.E;
}