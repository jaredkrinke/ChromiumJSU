﻿/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function Shot(x, y, width, height, speed, damage) {
    Entity.call(this, x, y, width, height);
    this.speed = speed;
    this.damage = damage;
    // TODO: Images
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'yellow')];
}

Shot.prototype = Object.create(Entity.prototype);

Shot.prototype.update = function (ms) {
    this.y += this.speed * ms;
};

function Bullet(x, y) {
    Shot.call(this, x, y, 3, 37, 0.71, 3.5);
}

Bullet.prototype = Object.create(Shot.prototype);

function Gun(layer, host, x, y, period, shot) {
    this.layer = layer;
    this.host = host;
    this.x = x;
    this.y = y;
    this.period = period;
    this.shot = shot;
    this.reset();
}

Gun.prototype.reset = function () {
    this.firing = false;
    this.timer = 0;
};

Gun.prototype.setFiring = function (firing) {
    this.firing = firing;

    // Reset timer if the gun is ready to fire
    if (firing && this.timer < 0) {
        this.timer = 0;
    }
};

Gun.prototype.update = function (ms) {
    this.timer -= ms;
    if (this.firing && this.timer <= 0) {
        this.layer.addPlayerShot(new this.shot(this.host.x + this.x, this.host.y + this.y));
        this.timer += this.period;
    }
};

function Player(layer) {
    Entity.call(this);
    this.layer = layer;
    this.width = 40;
    this.height = 48;
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'red')];
    this.guns = [
        new Gun(layer, this, 13, 6, 100, Bullet),
        new Gun(layer, this, -13, 6, 100, Bullet)
];
}

Player.prototype = Object.create(Entity.prototype);
Player.boundX = 284;
Player.boundY = 213;

Player.prototype.reset = function () {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].reset();
    }
};

// TODO: Keyboard/touch controls
Player.prototype.setPosition = function (x, y) {
    // TODO: It seems like the bounds would be better controlled in the layer...
    this.x = Math.max(-Player.boundX, Math.min(Player.boundX, x));
    this.y = Math.max(-Player.boundY, Math.min(Player.boundY, y));
};

Player.prototype.setFiring = function (firing) {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].setFiring(firing);
    }
};

Player.prototype.update = function (ms) {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].update(ms);
    }
};

function Enemy(x, y, width, height, speed, health) {
    Entity.call(this, x, y, width, height);
    // TODO: It seems like bounds should be based on size...
    this.x = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, x));
    this.speed = speed;
    this.health = health;
}

Enemy.boundX = 256;
Enemy.prototype = Object.create(Entity.prototype);

Enemy.prototype.update = function (ms) {
    // TODO: Secondary moves
    this.y -= this.speed * ms;
    // TODO: Shooting
};

// TODO: Random factor?
function Straight(x, y) {
    //	vel[1] = -0.046-frand*0.04;
    Enemy.call(this, x, y, 43, 58, 0.065, 110);
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'gray')];
}

Straight.prototype = Object.create(Enemy.prototype);

function OrderedQueue(compare) {
    this.compare = compare;
    this.head = null;
}

OrderedQueue.prototype.insert = function (item) {
    if (this.head) {
        var node;
        var added = false;
        for (node = this.head; node.next; node = node.next) {
            if (this.compare(item, node.next) <= 0) {
                var newNode = {
                    value: item,
                    next: node.next
                };
                node.next = newNode;
                added = true;
                break;
            }
        }

        if (!added) {
            node.next = { value: item };
        }
    } else {
        this.head = { value: item };
    }
};

OrderedQueue.prototype.first = function () {
    return this.head ? this.head.value : null;
}

OrderedQueue.prototype.remove = function () {
    var value = null;
    if (this.head) {
        value = this.head.value;
        this.head = this.head.next;
    }
    return value;
}

// TODO: This should be called Enemy
Wave = {
    Type: {
        straight: 0
    }
};

// TODO: There is a "randFact"--is that actually used anywhere?
function LevelAction(type, time, x, y) {
    this.type = type;
    this.time = time;
    this.x = x;
    this.y = y;
}

function Level(layer, waves) {
    this.layer = layer;
    this.queue = new OrderedQueue(function compareAction(a, b) { return a.time - b.time; });
    this.timer = 0;
    var count = waves.length;
    for (var i = 0; i < count; i++) {
        var wave = waves[i];
        switch (wave.type) {
            case Wave.Type.straight:
                this.addStraightWave(wave.start, wave.duration, wave.density);
                break;
        }
    }
}

Level.prototype.addStraightWave = function (start, duration, density, x, y) {
    var xRand = 8;
    // TODO: 60?
    var frequency = 60 / density * 20;
    var end = start + duration;
    this.addWave(Wave.Type.straight, start, end, x, y, frequency, 5 * 20, xRand, undefined);
};

Level.prototype.addWave = function (type, start, end, waveX, waveY, frequency, fJitter, xRand, xJitter) {
    var interval = 1;
    var iteration = 0;
    waveX = (waveX === undefined ? 0 : waveX);
    waveY = (waveY === undefined ? 284 : waveY);
    fJitter = (fJitter === undefined ? 10 * 20 : fJitter);
    xJitter = (xJitter === undefined ? 227 : xJitter);
    // TODO: Multiply jitter/period by (2 - gameSkill)
    // TODO: Formation
    for (var t = start; t < end;) {
        var x = waveX + xJitter * (Math.random() * 2 - 1);
        t += frequency + fJitter * (Math.random() * 2 - 1);
        this.queue.insert(new LevelAction(type, t, x, waveY));
    }
};

Level.prototype.update = function (ms) {
    this.timer += ms;
    var action;
    while ((action = this.queue.first()) && this.timer >= action.time) {
        action = this.queue.remove();
        switch (action.type) {
            case Wave.Type.straight:
                this.layer.addEnemy(new Straight(action.x, action.y));
                break;
        }
    }
};

function Master(layer) {
    this.layer = layer;
}

// TODO: Should the layer just have its own "update" function?
Master.prototype = Object.create(Entity.prototype);

Master.prototype.update = function (ms) {
    this.layer.updateGame(ms);
};

function GameLayer() {
    Layer.call(this);
    this.addEntity(new Master(this));
    this.player = this.addEntity(new Player(this));
    this.playerShots = [];
    this.enemies = [];
    this.reset();
}

GameLayer.boundY = 284;
GameLayer.prototype = Object.create(Layer.prototype);

GameLayer.prototype.reset = function () {
    this.player.reset();
    this.clearPlayerShots();
    this.clearEnemies();
    // TODO: Don't just load this by default
    this.level = this.loadLevel1();
};

GameLayer.prototype.addPlayerShot = function (shot) {
    this.playerShots.push(this.addEntity(shot));
};

GameLayer.prototype.removePlayerShot = function (shot) {
    var index = this.playerShots.indexOf(shot);
    if (index >= 0) {
        this.removeEntity(this.playerShots[index]);
        this.playerShots.splice(index, 1);
    }
};

GameLayer.prototype.clearPlayerShots = function () {
    while (this.playerShots.length > 0) {
        this.removePlayerShot(this.playerShots[0]);
    }
};

GameLayer.prototype.addEnemy = function (enemy) {
    this.enemies.push(this.addEntity(enemy));
};

GameLayer.prototype.removeEnemy = function (enemy) {
    var index = this.enemies.indexOf(enemy);
    if (index >= 0) {
        this.removeEntity(this.enemies[index]);
        this.enemies.splice(index, 1);
    }
};

GameLayer.prototype.clearEnemies = function () {
    while (this.enemies.length > 0) {
        this.removePlayerShot(this.enemies[0]);
    }
};

// TODO: It might be nice to have this also work while the mouse is outside the canvas...
GameLayer.prototype.mouseMoved = function (x, y) {
    this.player.setPosition(x, y);
};

GameLayer.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (button === MouseButton.primary) {
        this.player.setFiring(pressed);
    }
};

GameLayer.prototype.checkShotCollision = function (shot, b) {
    var bw = b.width / 2;
    var bh = b.height / 2;
    return (shot.x >= b.x - bw)
        && (shot.x <= b.x + bw)
        && (shot.y >= b.y - bh)
        && (shot.y <= b.y + bh);
};

GameLayer.prototype.updateGame = function (ms) {
    // Check bounds and collisions for shots
    var count = this.playerShots.length;
    for (var i = 0; i < count; i++) {
        var shot = this.playerShots[i];
        var remove = false;

        if (shot.y > GameLayer.boundY) {
            // Out of bounds
            remove = true;
        } else {
            // Check collisions
            var enemyCount = this.enemies.length;
            for (var j = 0; j < enemyCount; j++) {
                var enemy = this.enemies[j];
                if (this.checkShotCollision(shot, enemy)) {
                    enemy.health -= shot.damage;
                    remove = true;
                }
            }
        }

        if (remove) {
            this.removePlayerShot(shot);
            i--;
            count--;
        }
    }

    // Check bounds and health for enemies
    count = this.enemies.length;
    for (i = 0; i < count; i++) {
        var enemy = this.enemies[i];
        var remove = false;
        if (enemy.y < -GameLayer.boundY) {
            // Out of bounds
            remove = true;
        } else if (enemy.health <= 0) {
            // Destroyed
            // TODO: Explosion
            remove = true;
        }

        if (remove) {
            this.removeEnemy(enemy);
            i--;
            count--;
        }
    }

    // Add new enemies according to the level
    if (this.level) {
        this.level.update(ms);
    }
};

// TODO: Where should this code go?
GameLayer.prototype.loadLevel1 = function (layer) {
    var waves = [];
    waves.push({
        type: Wave.Type.straight,
        start: 1,
        duration: 600 * 20,
        density: 0.4
    });

    return new Level(this, waves);
};

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
