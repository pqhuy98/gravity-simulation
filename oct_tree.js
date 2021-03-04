class QuadNode {
    static EPS = 1e-7;

    constructor(parent = null, lx = 0, ly = 0, sz = 0) {
        this.parent = parent;
        this.lx = lx;
        this.ly = ly;
        this.sz = sz;
        this.children = [];

        this.object = null;

        this.objCnt = 0;
        this.mass = 0;
        this.cmx = this.cmy = 0.0;
    }

    contains(obj) {
        return (obj.x >= this.lx &&
            obj.x < this.lx + this.sz &&
            obj.y >= this.ly &&
            obj.y < this.ly + this.sz);
    }

    __update() {
        this.objCnt = (this.object !== null ? 1 : 0);
        this.mass = (this.object !== null ? this.object.mass : 0);
        this.cmx = (this.object !== null ? this.object.mass * this.object.x : 0);
        this.cmy = (this.object !== null ? this.object.mass * this.object.y : 0);
        for (const child of this.children) {
            this.objCnt += child.objCnt;
            this.mass += child.mass;
            this.cmx += child.cmx * child.mass;
            this.cmy += child.cmy * child.mass;
        }
        if (this.mass > 0) {
            this.cmx /= this.mass;
            this.cmy /= this.mass;
        }
        if (this.objCnt === 0) {
            // empty subtree --> deallocate all children
            this.children = [];
        }
    }

    addObject(obj) {
        if (!this.contains(obj)) return;
        if (this.objCnt === 0) {
            this.object = obj;
        } else {
            if (this.children.length === 0) {
                for (let i = 0; i < 2; i++) {
                    for (let j = 0; j < 2; j++) {
                        this.children.push(new QuadNode(this, this.lx + i * this.sz / 2, this.ly + j * this.sz / 2, this.sz / 2));
                    }
                }
            }
            if (this.object !== null) {
                for (const child of this.children) {
                    if (child.contains(this.object)) {
                        child.addObject(this.object);
                        break;
                    }
                }
                this.object = null;
            }
            for (const child of this.children) {
                if (child.contains(obj)) {
                    child.addObject(obj);
                    break;
                }
            }
        }
        this.__update();
    }

    removeObject(obj) {
        if (!this.contains(obj)) return;
        if (this.object === obj) {
            this.object = null;
        } else {
            for (const child of this.children) {
                if (child.contains(obj)) {
                    child.removeObject(obj);
                    break;
                }
            }
        }
        this.__update();
    }

    getAcceleration(obj, theta = 1) {
        if (this.object === obj || this.objCnt === 0) {
            return [0, 0];
        }
        let dx = this.cmx - obj.x;
        let dy = this.cmy - obj.y;
        let dis2 = dx * dx + dy * dy;
        let res = [0, 0];
        if (this.objCnt === 1 || (dis2 >= this.sz * this.sz / (theta * theta + QuadNode.EPS))) {
            let angle = Math.atan2(dy, dx);
            let k = this.mass / dis2;
            res = [
                Math.cos(angle) * k,
                Math.sin(angle) * k,
            ]
        } else {
            for (const child of this.children) {
                let [x, y] = child.getAcceleration(obj, theta);
                res[0] += x;
                res[1] += y;
            }
        }
        return res;
    }
}

// let width = 200;
// const qt = new QuadNode(null, 0, 0, width);
// let points = [
// ];
// for (let i = 0; i < 100; i++) {
//     points.push({
//         x: Math.random() * width,
//         y: Math.random() * width,
//         mass: Math.random(),
//     });
// }

// points.forEach((p, idx) => {
//     qt.addObject(p);
//     if (idx === 2) {
//         let x;
//     }
//     let a = qt.getAcceleration(p, 2);
//     // brute force
//     let a2 = [0, 0];
//     for (let i = 0; i < idx; i++) {
//         let dx = points[i].x - p.x;
//         let dy = points[i].y - p.y;
//         let dis2 = dx * dx + dy * dy;
//         let angle = Math.atan2(dy, dx);
//         let k = p.mass / dis2;
//         a2[0] += Math.sin(angle) * k;
//         a2[1] += Math.cos(angle) * k;
//     }
//     console.log(Math.abs(a[0] - a2[0]) / width, Math.abs(a[1] - a2[1]) / width);
//     console.log();
// });
// points.forEach(p => qt.removeObject(p));
