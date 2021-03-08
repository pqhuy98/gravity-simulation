// constants

const GRAVITY_CONSTANT = randomExp(1e2, 1e5);
const MAX_BODY_RADIUS = 10;
const SUPERSTAR_MASS = 1e7;
// const BODIES_COUNT = 500;
var BODIES_COUNT = (parseInt(localStorage.getItem("bodyCount")) || 2000);// * randomExp(0.8, 1 / 0.8);
const DYNAMIC_BODY_COUNT = true;

const INITIAL_STAR_DISTANCE = randomExp(750, 4000);
const SPAWN_RADIUS_FACTOR = randomExp(0.2, 0.7);
const STARS_ORBITTING = true;
const ORBITTERS_ORBITTING = true;
const INFINITE_ORBITTERS_CREATION = true;

const GLOW_COUNT_MINIMUM = 30;
const GLOW_COUNT_MAXIMUM = 500;
const GLOW_COUNT_PERCENT = 0.15;

const TIMER_FONT = "Verdana";
const TIMER_FONT_SIZE = 12;

const INITIAL_DEVIATION = randomExp(0.7, 1 / 0.7);
const EXPANSION_RATE = 0.01;
const DELTA_T = 1 / 1000; // seconds
const VELOCITY_MAX = null;

const CCW = Math.floor(Math.random() * 2) * 2 - 1;
const EPS = 1e-9;
const BARNES_HUT_THETA = 1;
const FPS_LIMIT = 99;

const INVISIBLE_CLEANUP = {
    maxDistance: 10,
    durationThreshold: 2, // seconds
    massThreshold: 2,
}

var CAMERA = {
    position: {
        x: 0,
        y: 0,
    },
    scale: randomExp(10, 10),
    targetScale: randomExp(10, 10),
    scalingFactor: randomFloat(0.1, 0.3),
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
    // },
];
var selected = null;

// Create initial bodies

window.onload = () => {
    let d = Math.random();
    let s1 = createSuperStar({
        x: - INITIAL_STAR_DISTANCE / 2, y: 0,
        ccw: Math.floor(Math.random() * 2) * 2 - 1,
        spawnRadius: INITIAL_STAR_DISTANCE * SPAWN_RADIUS_FACTOR,
        orbitCount: BODIES_COUNT * d,
    });

    let s2 = createSuperStar({
        x: INITIAL_STAR_DISTANCE / 2, y: 0,
        ccw: Math.floor(Math.random() * 2) * 2 - 1,
        spawnRadius: INITIAL_STAR_DISTANCE * SPAWN_RADIUS_FACTOR,
        orbitCount: BODIES_COUNT * (1 - d),
    });
    if (STARS_ORBITTING) {
        let R = magnitude(s1.position, s2.position);
        let m1 = s1.mass, m2 = s2.mass;
        let M = m1 + m2;
        let v = Math.sqrt(GRAVITY_CONSTANT * m1 * m2 / (R * 2) / (m1 + m2));
        v *= randomFloat(0.7, 1);
        s1.velocity = {
            x: 0, y: v,
        }
        s2.velocity = {
            x: 0, y: -v,
        }
    }
}

// listeners
const UNIVERSE = document.getElementById("universe");
const CONTEXT = UNIVERSE.getContext("2d");
window.onresize = function () {
    UNIVERSE.width = window.innerWidth;
    UNIVERSE.style.width = window.innerWidth;
    UNIVERSE.height = window.innerHeight;
    UNIVERSE.style.height = window.innerHeight;
}
window.onresize();

// add bodies
UNIVERSE.addEventListener("click", e => {
    if (CAMERA.cursorLock.disableOtherClickEvents) {
        return;
    }
    let { x, y } = coordScreenToUniverse(MOUSE_POS, CAMERA);

    createSuperStar({
        x, y,
        ccw: Math.floor(Math.random() * 2) * 2 - 1,
        spawnRadius: MAX_BODY_RADIUS * 100,
        orbitCount: Math.max((BODIES_COUNT - bodies.length) * 0.5, BODIES_COUNT * 0.01),
        initialRadius: 0,
    });
});
// zoom
UNIVERSE.addEventListener("wheel", e => {
    e.preventDefault();
    e.stopPropagation();
    let sign = e.deltaY / 100; // -1 or 1
    CAMERA.targetScale *= Math.exp(sign * Math.log(1.1));
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
function createSuperStar({ x, y, spawnRadius = MAX_BODY_RADIUS * 50, ccw = CCW, orbitCount = 0, initialRadius = 1 }) {
    let superStar = createBody({
        x, y,
        mass: SUPERSTAR_MASS,
        initialRadius: 3 * MAX_BODY_RADIUS * initialRadius,
        targetRadius: 3 * MAX_BODY_RADIUS,
    });
    setTimeout(() => {
        for (let i = 0; i < orbitCount; i++) {
            createRandomBody({
                centralBody: superStar,
                spawnRadius, ccw,
                initialRadius,
            });
        }
        if (INFINITE_ORBITTERS_CREATION) {
            var itv = setInterval(() => {
                if (superStar.deleted) {
                    clearInterval(itv);
                }
                for (let i = 0; i < 20; i++) {
                    if (bodies.length < BODIES_COUNT) {
                        createRandomBody({
                            centralBody: superStar,
                            spawnRadius, ccw,
                            initialRadius: 0,
                        });
                    } else break;
                }
            }, 150);
        }
    }, 0);
    return superStar;
}

// simulation loop
var mn = 1e9, mx = -1e9, ERR;
var times = [];
var latestFPS, avgFPS = null, fpsDeviation = 70;
var start = performance.now();
var lastTime = start;

function refreshLoop() {
    window.requestAnimationFrame(refreshLoop);
    const now = performance.now();

    if (now - lastTime < 1000 / FPS_LIMIT) return;
    lastTime = now;

    // FPS stuffs
    while (times.length > 0 && times[0] <= now - 1000) {
        times.shift();
    }
    times.push(now);
    latestFPS = times.length / Math.min(1, (performance.now() - start) / 1000);
    if (avgFPS === null) avgFPS = latestFPS;

    let newFPS = avgFPS * 0.5 + 0.5 * latestFPS;

    let devi = Math.abs(newFPS - avgFPS);
    fpsDeviation = fpsDeviation * 0.9 + 0.1 * devi;
    avgFPS = newFPS;

    // works
    loop();
    DYNAMIC_BODY_COUNT && (now - start > 1000) && updateBodyCount();
    // calculate distance error
    try {
        let mag = magnitude(sub(bodies[0].position, bodies[1].position));
        mn = Math.min(mag, mn);
        mx = Math.max(mag, mx);
        ERR = ((mx - mn) / mx * 100).toFixed(2);
        // console.log(ERR);
    } catch (e) { }
}


function createRandomBody({ centralBody, spawnRadius = MAX_BODY_RADIUS * 50, ccw = CCW, initialRadius = 1 }) {
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

    if (ORBITTERS_ORBITTING) {
        let gravityDirection = normalize(sub(centralBody.position, body.position));
        let F = Math.sqrt(GRAVITY_CONSTANT * centralBody.mass / r);
        let f = mul(gravityDirection, F);

        body.velocity.x = f.y * ccw + centralBody.velocity.x;
        body.velocity.y = -f.x * ccw + centralBody.velocity.y;

        let deviation = INITIAL_DEVIATION;
        body.velocity.x *= randomFloat(1 / deviation, deviation);
        body.velocity.y *= randomFloat(1 / deviation, deviation);
    }
}

function createBody({ x, y, mass, initialRadius, targetRadius }) {
    // create body
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
    };

    bodies.push(body);
    renderBodies([body]);
    return body;
}
var drawnCnt = 0;
function renderBodies(bodies, camera = CAMERA) {
    CONTEXT.fillStyle = "white";
    CONTEXT.shadowOffsetX = 0;
    CONTEXT.shadowOffsetY = 0;
    CONTEXT.shadowBlur = 50 / camera.scale;

    // calculate details
    let shadowSizeThreshold = 0;
    let drawn = [];
    bodies.forEach(body => {
        body._tmp = { skip: false };
        let pos = coordUniverseToScreen(body.position, camera);
        let x = pos.x * UNIVERSE.width;
        let y = pos.y * UNIVERSE.height;

        // let size = Math.round(2 * body.radius / camera.scale); // Round to prevent lagging
        let size = 2 * body.radius / camera.scale; // Round to prevent lagging

        if (x + size + CONTEXT.shadowBlur < 0 || x - size - CONTEXT.shadowBlur > UNIVERSE.width ||
            y + size + CONTEXT.shadowBlur < 0 || y - size - CONTEXT.shadowBlur > UNIVERSE.height) {
            body._tmp.skip = true;
            return;
        }

        let color = "hsl(" + ((body.baseHue - 1 * Math.log(body.radius)) % 360) + ", 100%, 70%)";

        if (Math.abs(pos.x * 2 - 1) < INVISIBLE_CLEANUP.maxDistance && Math.abs(pos.y * 2 - 1) < INVISIBLE_CLEANUP.maxDistance) {
            body.lastShown = Date.now();
        }
        drawn.push({ x, y, size, color });
    });
    drawnCnt = drawn.length;
    if (drawn.length === 0) return;

    drawn.sort((a, b) => b.size - a.size);
    let idx = Math.max(GLOW_COUNT_MINIMUM, Math.min(GLOW_COUNT_MAXIMUM, Math.round(drawn.length * GLOW_COUNT_PERCENT)));
    idx = Math.min(idx, drawn.length);
    shadowSizeThreshold = drawn[idx - 1].size - EPS;

    // draw shadows
    drawn.forEach((draw) => {
        let { x, y, size, color } = draw;
        if (size > shadowSizeThreshold) {
            CONTEXT.shadowColor = color;
            CONTEXT.beginPath();
            CONTEXT.arc(x, y, size, 0, 2 * Math.PI);
            CONTEXT.fill();
        }
    })

    // draw white circular stars
    CONTEXT.shadowColor = "transparent";
    CONTEXT.shadowBlur = 0;
    drawn.forEach((draw) => {
        let { x, y, size } = draw;
        CONTEXT.beginPath();
        CONTEXT.arc(x, y, size, 0, 2 * Math.PI);
        CONTEXT.fill();
    });
}

// simulation loop
function loop() {
    let t = new Tick(0);
    t.tick("----- start -----");
    buildQuadTree();
    t.tick("build quadtree");

    applyGravity();
    t.tick("apply gravity");

    collisionDetection();
    t.tick("collision detection");

    cleanUpBodies();
    t.tick("clean up");

    moveBodies();
    t.tick("move bodies");

    // CAMERA.scale += (CAMERA.targetScale - CAMERA.scale) / Math.abs(CAMERA.targetScale - CAMERA.scale) * 0.1;
    CAMERA.scale += (CAMERA.targetScale - CAMERA.scale) * CAMERA.scalingFactor;

    if (selected) {
        CAMERA.position = selected.position;
    } else {
        if (CAMERA.cursorLock.isMoving) {
            let newCenter = alignScreenAndUniverse(MOUSE_POS, CAMERA.cursorLock.lockPoint, CAMERA);
            CAMERA.position = newCenter;
        }
    }

    // render all bodies
    CONTEXT.clearRect(0, 0, UNIVERSE.width, UNIVERSE.height);

    // draw timer text
    CONTEXT.font = TIMER_FONT_SIZE + "px " + TIMER_FONT;
    CONTEXT.fillText(Math.ceil(reloadTime), 10, 10 + TIMER_FONT_SIZE);

    // draw bodies
    renderBodies(bodies);

    // draw FPS
    CONTEXT.font = TIMER_FONT_SIZE + "px " + TIMER_FONT;
    CONTEXT.fillText(Math.round(avgFPS) + "/" + Math.round(fpsDeviation), UNIVERSE.width - 40, 10 + TIMER_FONT_SIZE);

    // draw number of objects
    CONTEXT.font = TIMER_FONT_SIZE + "px " + TIMER_FONT;
    CONTEXT.fillText(bodies.length + "/" + BODIES_COUNT, 10, UNIVERSE.height - 10);

    // draw [r]
    CONTEXT.font = TIMER_FONT_SIZE + "px " + TIMER_FONT;
    CONTEXT.fillText("[R]", UNIVERSE.width - 27, UNIVERSE.height - 10);
}

function collisionDetection() {
    let sum = 0, cnt = 0;
    let collisions = [];
    // Collision simulation
    bodies.forEach((body, i) => {
        if (body.deleted) return;

        // find nearby bodies
        let result = { list: [], touched: 0, skipped: 0, getObjects: 0 };
        let dis = magnitude(body.velocity) * DELTA_T; // maximum travel distance in a frame
        let r = body.radius + dis;
        r *= 1.5;
        let lx = body.position.x - r;
        let ly = body.position.y - r;
        let sz = r * 2;
        qt.getInRange(lx, ly, sz, result);
        sum += result.touched;

        if (result.list.length > 1) {
            let b1 = body;
            for (const obj of result.list) {
                if (obj === body.qtObj) continue;

                // early stop
                let b2 = obj.body;
                if (b2.deleted) continue;

                // check collision
                let t = willCollide(b1, b2);
                if (t === null || t > DELTA_T) continue;

                if (b1.mass > b2.mass) {
                    collisions.push([b1, b2]);
                } else {
                    collisions.push([b2, b1]);
                }
            }
        }
    });

    collisions.forEach(([b1, b2]) => {
        if (b1.deleted || b2.deleted) return;
        cnt++;
        // merge
        let v1 = b1.targetRadius * b1.targetRadius;
        let v2 = b2.targetRadius * b2.targetRadius;
        b1.targetRadius = Math.sqrt((v1 * b1.mass + v2 * b2.mass) / (b1.mass + b2.mass));
        b1.velocity = mul(add(mul(b1.velocity, b1.mass), mul(b2.velocity, b2.mass)), 1 / (b1.mass + b2.mass));
        b1.mass = b1.mass + b2.mass;

        if (b1.radius < b2.radius) {
            b1.radius = b2.radius;
            b1.position = b2.position;
        }

        b2.deleted = true;
    })
    // console.log("avg touched:", sum / bodies.length, " --- cnt:", cnt);
}

function moveBodies() {
    bodies.forEach((body) => {
        if (body.deleted) return;
        // x = x + v
        body.position = add(body.position, mul(body.velocity, DELTA_T));
        body.radius += (body.targetRadius - body.radius) * EXPANSION_RATE;
    })
}

var qt;
function buildQuadTree() {
    if (bodies.length === 0) return;
    // use Quadtree
    let lx, ly, hx, hy;
    lx = hx = bodies[0].position.x;
    ly = hy = bodies[0].position.y;
    bodies.forEach(b => {
        lx = Math.min(lx, b.position.x);
        ly = Math.min(ly, b.position.y);
        hx = Math.max(hx, b.position.x);
        hy = Math.max(hy, b.position.y);
    });

    qt = new QuadNode(null, lx, ly, Math.max(hx - lx, hy - ly) + EPS);
    qt.build(bodies.map(b => {
        b.qtObj = {
            body: b,
            x: b.position.x,
            y: b.position.y,
            mass: b.mass,
        }
        return b.qtObj;
    }));
}

function applyGravity() {
    bodies.forEach((body) => {
        // v = v + dv
        body.velocity = add(body.velocity, mul(gravityAcceleration(body), DELTA_T * GRAVITY_CONSTANT));

        // clip new velocity at VELOCITY_MAX
        if (VELOCITY_MAX > 0) {
            let newMag = magnitude(body.velocity);
            if (newMag > VELOCITY_MAX) {
                body.velocity = mul(body.velocity, VELOCITY_MAX / newMag);
            }
        }
    });
}

function cleanUpBodies() {
    // Remove bodies that are too far away from camera
    cleanUpFarParticles();

    // remove all deleted objects
    let newBodies = [];
    for (let i = 0; i < bodies.length; i++) {
        if (!bodies[i].deleted) {
            newBodies.push(bodies[i]);
        } else {
            delete bodies[i];
        }
    }
    bodies = newBodies;
}

var cleanedCnt = 0;
function cleanUpFarParticles() {
    let cnt = 0;
    bodies.forEach(b => cnt += (!b.deleted ? 1 : 0));
    cnt = Math.max(cnt - BODIES_COUNT);
    bodies.forEach((b) => {
        let dt = (Date.now() - b.lastShown) / 1000;
        let massThreshold = dt / INVISIBLE_CLEANUP.durationThreshold * INVISIBLE_CLEANUP.massThreshold;
        if (cnt > 0 && !b.deleted && dt > INVISIBLE_CLEANUP.durationThreshold && b.mass < massThreshold) {
            b.deleted = true;
            cnt--;
            cleanedCnt++;
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
    let angle = Math.atan2(a.y, a.x);
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

// arithmetic functions
function randomFloat(l, r) {
    return Math.random() * (r - l) + l;
}

function randomExp(l, r) {
    return Math.exp(randomFloat(Math.log(l), Math.log(r)));
}

// camera helper
function getCameraBounds(camera = CAMERA) {
    let w = window.innerWidth * camera.scale;
    let h = window.innerHeight * camera.scale;
    return {
        lower: {
            x: camera.position.x - w / 2,
            y: camera.position.y - h / 2,
        },
        upper: {
            x: camera.position.x + w / 2,
            y: camera.position.y + h / 2,
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

// return acceleration caused by gravity
function gravityAcceleration(body) {
    let accel = zero();
    qt.getAcceleration(body.qtObj, accel, BARNES_HUT_THETA * BARNES_HUT_THETA);
    return accel;
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
    let R = Math.max(body1.radius, body2.radius);// + 0 * Math.min(body1.radius, body2.radius)
    let x = body1.position.x;
    let y = body1.position.y;
    let dx = body1.velocity.x;
    let dy = body1.velocity.y;
    let u = body2.position.x;
    let v = body2.position.y;
    let du = body2.velocity.x;
    let dv = body2.velocity.y;
    let a = (dx - du) * (dx - du) + (dy - dv) * (dy - dv); // a is always non-negative
    let b = 2 * ((dx - du) * (x - u) + (dy - dv) * (y - v));
    let c = (x - u) * (x - u) + (y - v) * (y - v) - R * R;

    if (a < EPS) { // a == 0
        // this is a linear inequality b*t + c <= 0
        if (b > 0) {
            // t <= c/b
            return 0; // two bodies already collide
        } else if (b < 0) {
            // t >= c/b
            return c / b; // they will collide when t = c/b
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
        let discriminant = b * b - 4 * a * c;
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

// performance checker
class Tick {
    constructor(enable = true) {
        this.time = performance.now();
        this.start = performance.now();
        this.enable = enable;
    }

    tick(msg = null) {
        if (this.enable && msg) console.log(msg, performance.now() - this.time);
        this.time = performance.now();
        return performance.now() - this.start;
    }
}

document.onkeypress = function (e) {
    e = e || window.event;
    if (fpsDeviation > 3) return;
    if (e.key.toLowerCase() === "r") {
        location.reload();
    } else if (e.key.toLowerCase() === "c") {
        saveBodyCount = () => { };
        localStorage.clear();
        location.reload();
    }
};

var reloadTime = randomExp(3 * 60, 5 * 60); // seconds
// Surprise reload
(() => {
    var lastTime = performance.now();
    let i = setInterval(() => {
        let dt = (performance.now() - lastTime) / 1000;
        lastTime = performance.now();
        reloadTime -= dt;
        if (reloadTime <= 0) {
            // clearInterval(i);
            location.reload();
        }
    }, 100);
})()

// var bodyCount = BODIES_COUNT;
var autoReload = 10;
function updateBodyCount() {
    if (drawnCnt < bodies.length * 0.8) return;
    if (avgFPS > 35) {
        BODIES_COUNT = Math.round(BODIES_COUNT * 0.7 + 0.3 * bodies.length * randomExp(1.3, 1.6));
        // if (bodies.length >= BODIES_COUNT && BODIES_COUNT < bodyCount * 0.7) {
        //     BODIES_COUNT = Math.round(BODIES_COUNT * randomExp(1.05, 1.15));
        // }
    } else if (avgFPS >= 32) {
        BODIES_COUNT = Math.round(BODIES_COUNT * 0.8 + 0.2 * bodies.length * randomExp(1.1, 1.3));
    } else if (avgFPS >= 28) {
        // fps is ok, flunctuate it only a bit
        BODIES_COUNT = Math.round(BODIES_COUNT * 0.9 + 0.1 * bodies.length * randomExp(0.95, 1.05));
    } else if (avgFPS >= 20) {
        BODIES_COUNT = Math.round(BODIES_COUNT * 0.7 + 0.3 * bodies.length / randomExp(1.1, 1.3));
    } else if (avgFPS >= 10) {
        BODIES_COUNT = Math.round(BODIES_COUNT * 0.6 + 0.4 * bodies.length / randomExp(1.3, 1.6));
    } else {
        BODIES_COUNT = Math.round(BODIES_COUNT * 0.5 + 0.5 * bodies.length / randomExp(1.6, 1.9));
    }
    if (fpsDeviation < 4) {
        if (avgFPS < 15) {
            autoReload--;
            autoReload === 0 && location.reload();
        } else {
            autoReload = 10;
        }
    }
};
DYNAMIC_BODY_COUNT && setInterval(() => {
    let old = localStorage.getItem("bodyCount");
    localStorage.setItem("bodyCount", Math.round(old * 0.7 + 0.3 * BODIES_COUNT));
}, 300);
refreshLoop();