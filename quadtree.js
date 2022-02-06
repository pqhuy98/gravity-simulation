class QuadNode {
    static EPS = 1e-7;

    constructor(parent = null, lx = 0, ly = 0, sz = 0, dir = "") {
        // internal properties
        this.id = parent === null ? "root" : parent.id + "/" + dir;
        this.parent = parent;
        this.depth = parent === null ? 1 : parent.depth + 1;
        this.lx = lx;
        this.ly = ly;
        this.sz = sz;
        this.sz2 = sz * sz;

        this.object = null;
        this.objCnt = 0;
        this.children = [];

        // extra properties
        this.maxDepth = this.depth;
        this.nodeCount = 1;
        this.mass = 0;
        this.cmx = this.cmy = 0.0;
    }

    contains(obj) {
        return (obj.x >= this.lx &&
            obj.x < this.lx + this.sz &&
            obj.y >= this.ly &&
            obj.y < this.ly + this.sz);
    }

    intersect(lx, ly, sz) {
        return (
            !(this.lx >= lx + sz || this.lx + this.sz <= lx) &&
            !(this.ly >= ly + sz || this.ly + this.sz <= ly)
        );
    }

    __update(updateExtra = true) {
        this.objCnt = (this.object !== null ? 1 : 0);
        // extra
        if (updateExtra) {
            this.mass = (this.object !== null ? this.object.mass : 0);
            this.cmx = (this.object !== null ? this.object.mass * this.object.x : 0);
            this.cmy = (this.object !== null ? this.object.mass * this.object.y : 0);
            this.maxDepth = this.depth;
            this.nodeCount = 1;
        }

        for (const child of this.children) {
            this.objCnt += child.objCnt;
            if (updateExtra) {
                this.mass += child.mass;
                this.cmx += child.cmx * child.mass;
                this.cmy += child.cmy * child.mass;
                this.maxDepth = Math.max(this.maxDepth, child.maxDepth);
                this.nodeCount += child.nodeCount;
            }
        }
        if (updateExtra && this.mass > 0) {
            this.cmx /= this.mass;
            this.cmy /= this.mass;
        }
        if (this.objCnt === 0) {
            // empty subtree --> deallocate all children
            this.children = [];
            if (updateExtra) {
                this.maxDepth = this.depth;
                this.nodeCount = 1;
            }
        }
    }

    addObject(obj, updateExtra = true) {
        if (!this.contains(obj)) return;
        if (this.objCnt === 0) {
            this.object = obj;
        } else {
            if (this.children.length === 0) {
                for (let i = 0; i < 2; i++) {
                    for (let j = 0; j < 2; j++) {
                        this.children.push(new QuadNode(this, this.lx + i * this.sz / 2, this.ly + j * this.sz / 2, this.sz / 2, i * 2 + j));
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
        this.__update(updateExtra);
    }

    build(objs) {
        // reset
        this.objCnt = 0;
        this.children = [];
        this.object = null;

        // add object but delay updates to later
        for (const obj of objs) {
            this.addObject(obj, false);
        }
        // update whole tree after build
        this.update();
    }

    update() {
        for (const child of this.children) {
            child.update();
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

    // result: {x, y} is acceleration vector without gravitational constant
    getAcceleration(obj, result, theta = 1) {
        if (this.object === obj || this.objCnt === 0) {
            return;
        }
        let dx = this.cmx - obj.x;
        let dy = this.cmy - obj.y;
        let dis2 = dx * dx + dy * dy;
        if (this.objCnt === 1 || (dis2 >= this.sz2 / theta)) {
            let angle = Math.atan2(dy, dx);
            let k = this.mass / dis2;
            result.x += Math.cos(angle) * k;
            result.y += Math.sin(angle) * k;
        } else {
            for (const child of this.children) {
                child.getAcceleration(obj, result, theta);
            }
        }
    }

    // find all objects in range
    getInRange(lx, ly, sz, result) {
        // verbose && console.log(this.id, verbose);
        if (this.objCnt === 1 || lx <= this.lx && ly <= this.ly && this.lx + this.sz <= lx + sz && this.ly + this.sz <= ly + sz) {
            // this node is completely inside the range
            result.getObjects++;
            this.getObjects(lx, ly, sz, result);
        } else {
            result.touched++;
            for (const child of this.children) {
                if (child.objCnt > 0 && child.intersect(lx, ly, sz)) {
                    child.getInRange(lx, ly, sz, result);
                } else {
                    result.skipped += child.nodeCount;
                }
            }
        }
    }

    getObjects(lx, ly, sz, result) {
        result.touched++;
        if (this.object !== null &&
            lx <= this.object.x && this.object.x < lx + sz &&
            ly <= this.object.y && this.object.y < ly + sz) {
            result.list.push(this.object);
            return;
        }
        for (const child of this.children) {
            if (child.objCnt > 0) {
                child.getObjects(lx, ly, sz, result);
            }
        }
    }
}