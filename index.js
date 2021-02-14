// constants

const GRAVITY_CONSTANT =1e1;
const MAX_BODY_RADIUS= 20;
const SUPERSTAR_MASS = 1e7;
const SUPERSTAR_RADIUS = MAX_BODY_RADIUS * 0.7;
const BODIES_COUNT = 200;
const INITIAL_STAR_DISTANCE = 1000;

const INITIAL_DEVIATION = 1.00;
const EXPANSION_RATE = 0.01;
const DELTA_T = 1 / 1000; // seconds
const LOOP_INTERVAL = 1000 / 60 // 60 FPS

const CCW = Math.floor(Math.random() * 2) * 2 - 1;
const EPS = 1e-9;

const INVISIBLE_CLEANUP = {
    maxDistance: 50,
    durationThreshold: 20, // seconds
    massThreshold: 2,
}
// const BASE_HUE = Math.random() * 360;

var CAMERA = {
    position: {
        x: 0,
        y: 0,    
    },
    scale: 2,
    cursorLock: {
        isMoving: false,
        disableOtherClickEvents: false,
        lockPoint: {
            x: 0,
            y: 0,
        }
    }
};
var MOUSE_POS = {
    x: 0.5,
    y: 0.5,
}
var bodies = [
    // 20
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

// Create initial bodies

window.onload = () => {
    let d = Math.random();
    let s1 = createSuperStar({
        x: - INITIAL_STAR_DISTANCE / 2, y: 0,
        ccw: Math.floor(Math.random() * 2) * 2 - 1,
        spawnRadius: MAX_BODY_RADIUS * 30,
        orbitCount: BODIES_COUNT * d,
    });

    let s2 = createSuperStar({
        x: INITIAL_STAR_DISTANCE / 2, y: 0,
        ccw: Math.floor(Math.random() * 2) * 2 - 1,
        spawnRadius: MAX_BODY_RADIUS * 30,
        orbitCount: BODIES_COUNT * (1 - d),
    });
    let R = magnitude(s1.position, s2.position);
    let m1 = s1.mass, m2 = s2.mass;
    let M = m1 + m2;
    let v =  Math.sqrt(GRAVITY_CONSTANT * m1 * m2 / (R * 2) / (m1 + m2));
    v *= randomFloat(0.01, 0.1);
    s1.velocity = {
        x: 0, y: v,
    }
    s2.velocity = {
        x: 0, y: -v,
    }
}

// listeners
const UNIVERSE = document.getElementById("universe");
// add bodies
UNIVERSE.addEventListener("click", e => {
    if (CAMERA.cursorLock.disableOtherClickEvents) {
        return;
    }
    let { x, y } = coordScreenToUniverse(MOUSE_POS, CAMERA);

    createSuperStar({
        x, y,
        ccw: Math.floor(Math.random() * 2) * 2 - 1,
        spawnRadius: MAX_BODY_RADIUS * 30,
        orbitCount: BODIES_COUNT * 0.4,
        initialRadius: 0,
    });
});
// zoom
UNIVERSE.addEventListener("wheel", e => {
    e.preventDefault();
    e.stopPropagation();
    let sign = e.deltaY / 100; // -1 or 1
    CAMERA.scale *= Math.exp(sign * Math.log(1.1));
});
// move
UNIVERSE.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();
    CAMERA.cursorLock.isMoving = true;
    CAMERA.cursorLock.disableOtherClickEvents = false;
    MOUSE_POS = getMousePosition(e);
});
UNIVERSE.addEventListener("mouseup", e => {
    CAMERA.cursorLock.isMoving = false;
});
UNIVERSE.addEventListener("mousemove", e => {
    CAMERA.cursorLock.disableOtherClickEvents = true;
    MOUSE_POS = getMousePosition(e);
    if (!CAMERA.cursorLock.isMoving) {
        CAMERA.cursorLock.lockPoint = coordScreenToUniverse(MOUSE_POS, CAMERA);
    }
});

// generate initial bodies
function createSuperStar({ x, y, spawnRadius = MAX_BODY_RADIUS * 50, ccw = CCW, orbitCount = 0, initialRadius = 1}) {
    let superStar = createBody({
        x, y,
        mass: SUPERSTAR_MASS,
        initialRadius: 3 * MAX_BODY_RADIUS * initialRadius,
        targetRadius: 3 * MAX_BODY_RADIUS,
    });
    setTimeout(() => {
        for(let i = 0; i < orbitCount; i++) {
            createRandomBody({
                centralBody: superStar,
                spawnRadius, ccw,
                initialRadius,
            });
        }
        var itv = setInterval(() => {
            if (superStar.deleted) {
                clearInterval(itv);
            }
            if (bodies.length < BODIES_COUNT) {
                createRandomBody({
                    centralBody: superStar,
                    spawnRadius, ccw,
                    initialRadius: 0,
                });
            }
        }, 100);
    }, 0);
    return superStar;
}

var mn = 1e9, mx = -1e9, ERR;
// simulation loop
setInterval(() => {
    loop();

    // calculate distance error
    let mag = magnitude(sub(bodies[0].position, bodies[1].position));
    mn = Math.min(mag, mn);
    mx = Math.max(mag, mx);
    ERR = ((mx - mn) / mx * 100).toFixed(2);

}, LOOP_INTERVAL);

function createRandomBody({ centralBody, spawnRadius = MAX_BODY_RADIUS * 50, ccw = CCW, initialRadius = 1}) {
    // http://www.anderswallin.net/2009/05/uniform-random-points-in-a-circle-using-polar-coordinates/
    let angle = Math.random() * 2 * Math.PI;
    let r = spawnRadius * Math.sqrt(Math.random()) + centralBody.radius;
    let x = Math.cos(angle) * r + centralBody.position.x;
    let y = Math.sin(angle) * r + centralBody.position.y;
    let radius = randomizeRadius();

    let body = createBody({
        x, y,
        mass: randomizeMass(),
        initialRadius: initialRadius * radius,
        targetRadius: radius,
    });
    body.initialRadius *= body.mass;

    let gravityDirection = normalize(gravityForce(body));
    let F = Math.sqrt(GRAVITY_CONSTANT * centralBody.mass / r);
    let f = mul(gravityDirection, F);

    body.velocity.x = f.y * ccw + centralBody.velocity.x;
    body.velocity.y = -f.x * ccw + centralBody.velocity.y;

    let deviation = INITIAL_DEVIATION;
    body.velocity.x *= randomFloat(1/deviation, deviation);
    body.velocity.y *= randomFloat(1/deviation, deviation);
}

function createBody({ x, y, mass, initialRadius, targetRadius }) {
    // create body
    let core = document.createElement("div");
    let glow = document.createElement("div");
    UNIVERSE.append(glow);
    UNIVERSE.append(core);

    // add to bodies
    let body = {
        radius: initialRadius,
        targetRadius: targetRadius,
        mass: mass,
        deleted: false,
        lastShown: Date.now(),
        velocity: {
            x: 0,
            y: 0,
        },
        position: {
            x: x,
            y: y,
        },
        baseHue: Math.random() * 360,
        dom: {
            core,
            glow,
        },
    };
    // body.targetRadius = body.radius;
    core.addEventListener("click", (e) => {
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
    let { core, glow } = body.dom;

    let pos = coordUniverseToScreen(body.position, camera);
    let leftPercent = pos.x * 100;
    let topPercent = pos.y * 100;
    let size = Math.round(2 * body.radius / camera.scale); // Round to prevent lagging

    let color1 = "hsl(" + ((body.baseHue - 1 * Math.log(body.radius)) % 360) + ", 100%, 70%)";
    let color2 = "hsl(" + ((body.baseHue - 1 * Math.log(body.radius)) % 360)+ ", 100%, 70%)";

    // update dom elements

    // glow.style.visibility='visible';
    glow.className = "glow" + (selected === body ? " selected" : "");
    glow.style.left = leftPercent + "%";
    glow.style.top = topPercent + "%";
    glow.style.width = size + "px";
    glow.style.height = size + "px";
    glow.style.boxShadow = `
        0 0 50px #fff,
        -50px 0 100px ` + color1 + `,
        50px 0 100px ` + color2;

    core.className = "core" + (selected === body ? " selected" : "");
    core.style.left = leftPercent + "%";
    core.style.top = topPercent + "%";
    core.style.width = size + "px";
    core.style.height = size + "px";

    if (Math.abs(leftPercent / 100 * 2 - 1) < INVISIBLE_CLEANUP.maxDistance && Math.abs(topPercent / 100 * 2 - 1) < INVISIBLE_CLEANUP.maxDistance) {
        body.lastShown = Date.now();
    } 
}

// simulation loop
function loop() {
    collisionDetection();
    cleanUpBodies();
    moveBodies();
    applyGravity();
    
    if (selected) {
        CAMERA.position = selected.position;
    } else {
        if (CAMERA.cursorLock.isMoving) {
            let newCenter = alignScreenAndUniverse(MOUSE_POS, CAMERA.cursorLock.lockPoint, CAMERA);
            CAMERA.position = newCenter;            
        }
    }
    // render all bodies
    bodies.forEach((body) => {
        renderBody(body);
    });
    // console.log("!");
}

function collisionDetection() {
    // Collision simulation
    for(let i0 = 0; i0 < bodies.length; i0++) {
        for(let j0 = i0 + 1; j0 < bodies.length; j0++) {
            let i = i0, j = j0;
            let b1 = bodies[i];
            let b2 = bodies[j];
            if (b1.deleted || b2.deleted) {
                continue;
            }
            if (b1.mass < b2.mass) {
                [b1, b2] = [b2, b1];
                [i, j] = [j, i];
            }
            let t = willCollide(b1, b2);
            if (t === null || t >= DELTA_T) {
                continue;
            }

            b1.targetRadius = Math.sqrt(b1.targetRadius * b1.targetRadius + b2.targetRadius * b2.targetRadius);
            b1.velocity = mul(add(mul(b1.velocity, b1.mass), mul(b2.velocity, b2.mass)), 1 / (b1.mass + b2.mass));
            b1.mass = b1.mass + b2.mass;
            if (b1.radius < b2.radius) {
                b1.radius = b2.radius;
                b1.position = b2.position;
            }
            b2.deleted = true;
        }
    }
}

function moveBodies() {
    bodies.forEach((body) => {
        // x = x + v
        body.position = add(body.position, mul(body.velocity, DELTA_T));
        body.radius += (body.targetRadius - body.radius) * EXPANSION_RATE; 
    })
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
        body.velocity = add(body.velocity, mul(acceleration, DELTA_T));
    });
}

function cleanUpBodies() {
    // Remove bodies that are too far away from camera
    // cleanUpFarParticles();
    
    // remove all deleted objects
    let newBodies = [];
    for(let i = 0; i < bodies.length; i++) {
        if (!bodies[i].deleted) {
            newBodies.push(bodies[i]);
        } else {
            bodies[i].dom.glow.parentNode.removeChild(bodies[i].dom.glow);
            bodies[i].dom.core.parentNode.removeChild(bodies[i].dom.core);
            delete bodies[i];
        }
    }
    bodies = newBodies;
}

function cleanUpFarParticles() {
    bodies.forEach((b) => {
        let dt = (Date.now() - b.lastShown) / 1000;
        let massThreshold = dt / INVISIBLE_CLEANUP.durationThreshold * INVISIBLE_CLEANUP.massThreshold;
        if (dt > INVISIBLE_CLEANUP.durationThreshold && b.mass < massThreshold) {
            b.deleted = true;
        }
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
function getMousePosition(e, universe = UNIVERSE) {
    let rect = UNIVERSE.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
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
// covert screen coordinates to universe coordinates
function coordScreenToUniverse(screenXY, camera = CAMERA) {
    return {
        x: camera.position.x + (screenXY.x - 0.5) * window.innerWidth * camera.scale,
        y: camera.position.y + (screenXY.y - 0.5) * window.innerHeight * camera.scale,
    }
}
// covert universe coordinates to screen coordinates
function coordUniverseToScreen(universeXY, camera = CAMERA) {
    let a = mul(sub(universeXY, camera.position), 1 / camera.scale);
    return {
        x: a.x / window.innerWidth + 0.5,
        y: a.y / window.innerHeight + 0.5,
    };
}
// move camera so that universe coordinate aligns with screen coordinates
// return the center of new camera
function alignScreenAndUniverse(screenXY, universeXY, camera = CAMERA) {
    return {
        x: universeXY.x + (0.5 - screenXY.x) * window.innerWidth * camera.scale,
        y: universeXY.y + (0.5 - screenXY.y) * window.innerHeight * camera.scale,
    }
} 

// physics functions
function gravityForce(body) {
    let force = zero();
    bodies.forEach((other) => {
        if (body !== other) {
            let distance = magnitude(sub(body.position, other.position));
            // f = G*m1*m2*(x1-x2)/r^3
            let f = mul(sub(other.position, body.position), GRAVITY_CONSTANT * body.mass * other.mass / (distance * distance * distance + EPS));
            force = add(force, f);
        }
    });
    return force;
}

// return the earliest time that two bodies collide, given their current positions and velocities.
// x y   -> initial postion of body 1
// dx dy -> velocity of body 1
// u v   -> initial postion of body 2
// du dv -> velocity of body 2
// R     -> collision happens when their distance <= R

// Position of body 1 at time t:
// x(t) = x + t*dx
// y(t) = y + t*dy

// Position of body 2 at time t:
// u(t) = u + t*du
// v(t) = v + t*dv

// When their distance within R:
// (x(t) - u(t))^2 + (y(t) - v(t))^2 <= R^2

// <=> (x + t*dx - u - t*du)^2 + (y + t*dy - v - t*dv)^2 <= R^2
// <=> (t*(dx - du) + x - u)^2 + (t*(dy - dv) + y - v)^2 <= R^2
// <=> t^2*(dx - du)^2 + 2*t*(dx - du)*(x - u) + (x - u)^2 + t^2*(dy - dv) + 2*t*(dy - dv)*(y - v) + (y - v)^2 <= R^2
// <=> t^2*((dx - du)^2 + (dy - dv)^2) + 2*t*((dx - du)*(x - u) + (dy - dv)*(y - v)) + (x - u)^2 + (y - v)^2 - R^2 <= 0
// This is a quadratic inequality a*t^2 + b*t + c <= 0.

// Solve it with:
// a = ((dx - du)^2 + (dy - dv)^2)
// b = 2*((dx - du)*(x - u) + (dy - dv)*(y - v))
// c = (x - u)^2 + (y - v)^2 - R^2
function willCollide(body1, body2) {
    let R = Math.max(body1.radius, body2.radius) - 0.85 * Math.min(body1.radius, body2.radius)
    let x = body1.position.x;
    let y = body1.position.y;
    let dx = body1.velocity.x;
    let dy = body1.velocity.y;
    let u = body2.position.x;
    let v = body2.position.y;
    let du = body2.velocity.x;
    let dv = body2.velocity.y;
    let a = (dx - du)*(dx - du) + (dy - dv)*(dy - dv); // a is always non-negative
    let b = 2*((dx - du)*(x - u) + (dy - dv)*(y - v));
    let c = (x - u)*(x - u) + (y - v)*(y - v) - R*R;

    if (a < EPS) { // a == 0
        // this is a linear inequality b*t + c <= 0
        if (b > 0) {
            // t <= c/b
            return 0; // two bodies already collide
        } else if (b < 0) {
            // t >= c/b
            return c/b; // they will collide when t = c/b
        } else { // b == 0
            // solve inequality 0*t + c <= 0
            if (c < 0) {
                return 0; // two bodies already collide at t = 0
            } else {
                return null; // they will not collide
            }
        }
    } else {
        // this is a quadratic inequality a*t^2 + b*t + c <= 0
        let discriminant = b*b - 4*a*c;
        if (Math.abs(discriminant) < EPS) { // discriminant == 0
            let sol = -b / 2 / a;
            if (sol < -EPS) {
                // they collided in the past, and will not in the future
                return null;
            } else {
                // found exactly one solution
                return sol;
            }
        } else if (discriminant > 0) {
            let sqrtD = Math.sqrt(discriminant);
            let sol1 = (-b - sqrtD) / 2 / a;
            let sol2 = (-b + sqrtD) / 2 / a;
            if (sol2 < 0) {
                return null; // no solution
            } else {
                // sol1 < 0 --> 0
                // 0 < sol1 --> sol1
                return Math.max(0, sol1);
            }
        } else { // discriminant < 0
            return null; // no solution
        }
    }
}
function randomizeRadius() {
    return Math.exp(Math.random() * Math.log(MAX_BODY_RADIUS));
}
function randomizeMass() {
    return Math.random();//Math.exp(Math.random()) / Math.E;
}