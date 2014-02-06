/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function Shot(x, y, width, height, vx, vy, damage) {
    Entity.call(this, x, y, width, height);
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    // TODO: Images
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'yellow')];
}

Shot.prototype = Object.create(Entity.prototype);

Shot.prototype.update = function (ms) {
    this.x += this.vx * ms;
    this.y += this.vy * ms;
};

function Bullet(x, y) {
    Shot.call(this, x, y, 3, 37, 0, 0.71, 3.5);
}

Bullet.prototype = Object.create(Shot.prototype);

function StraightShot(x, y) {
    Shot.call(this, x, y, 7, 16, 0, -0.28, 75);
}

StraightShot.prototype = Object.create(Shot.prototype);

function OmniShot(x, y, vx, vy) {
    // TODO: Make it so that the elements get rotated based on direction
    Shot.call(this, x, y, 6, 6, vx, vy, 6);
}

OmniShot.prototype = Object.create(Shot.prototype);

function Gun(layer, host, x, y, period, periodRandomMax, shot, warmupPeriod) {
    this.layer = layer;
    this.host = host;
    this.x = x;
    this.y = y;
    this.period = period;
    this.periodRandomMax = periodRandomMax;
    this.shot = shot;
    this.warmupPeriod = warmupPeriod || 0;
    this.reset();
}

Gun.prototype.reset = function () {
    this.firing = false;
    this.timer = 0;
};

Gun.prototype.setFiring = function (firing) {
    this.firing = firing;

    // Reset timer if the gun is ready to fire
    if (firing && this.timer <= 0) {
        this.timer = this.warmupPeriod;
    }
};

Gun.prototype.reload = function () {
    this.timer += this.period + this.periodRandomMax * Math.random();
};

Gun.prototype.createShot = function () {
    return new this.shot(this.host.x + this.x, this.host.y + this.y);
};

Gun.prototype.fire = function () {
    var shot = this.createShot();

    // Add the appropriate kind of shot
    if (this.host instanceof Player) {
        this.layer.addPlayerShot(shot);
    } else {
        this.layer.addEnemyShot(shot);
    }
};

Gun.prototype.update = function (ms) {
    this.timer -= ms;
    if (this.firing && this.timer <= 0) {
        this.fire();
        this.reload();
    }
};

function Ship(layer, x, y, width, height, health) {
    Entity.call(this, x, y, width, height);
    this.layer = layer;
    this.health = health;
    this.targetX = x;
    this.targetY = y;
    this.offsetX = 0;
    this.offsetY = 0;
}

Ship.prototype = Object.create(Entity.prototype);

Ship.prototype.setPosition = function (x, y) {
    this.targetX = x;
    this.targetY = y;
};

Ship.prototype.offset = function (x, y) {
    this.offsetX += x;
    this.offsetY += y;
};

Ship.prototype.updateOffsets = function (ms) {
    // Scale down temporary offsets
    var factor = (1 - 0.9 * ms / 250);
    factor *= factor;
    this.offsetX *= factor;
    this.offsetY *= factor;
};

function Player(layer) {
    Ship.call(this, layer, 0, 0, 40, 48, 500);
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'red')];
    this.guns = [
        new Gun(layer, this, 8, 23, 100, 0, Bullet),
        new Gun(layer, this, -8, 23, 100, 0, Bullet),
        new Gun(layer, this, 13, 17, 100, 0, Bullet),
        new Gun(layer, this, -13, 17, 100, 0, Bullet)
    ];
}

Player.prototype = Object.create(Ship.prototype);
Player.boundX = 284;
Player.boundY = 213;

Player.prototype.reset = function () {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].reset();
    }
};

// TODO: Keyboard/touch controls
Player.prototype.setFiring = function (firing) {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].setFiring(firing);
    }
};

Player.prototype.takeDamage = function (shot) {
    this.health -= shot.damage;

    // Knock back
    // TODO: Should this also knock horizontally?
    this.offsetY += shot.damage / 0.87 * shot.vy;
};

Player.prototype.update = function (ms) {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].update(ms);
    }

    // Apply boundaries and temporary offsets
    // TODO: It seems like the bounds would be better controlled in the layer...
    var x = this.targetX + this.offsetX;
    var y = this.targetY + this.offsetY;
    this.x = Math.max(-Player.boundX, Math.min(Player.boundX, x));
    this.y = Math.max(-Player.boundY, Math.min(Player.boundY, y));

    // Scale down temporary offsets
    this.updateOffsets(ms);
};

function Enemy(layer, x, y, width, height, speed, health, guns) {
    Ship.call(this, layer, x, y, width, height, health);
    // TODO: It seems like bounds should be based on size...
    this.x = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, x));
    this.speed = speed;
    this.target = layer.player;
    this.guns = guns;

    if (guns) {
        var count = guns.length;
        for (var i = 0; i < count; i++) {
            var gun = guns[i];
            // TODO: Wait until on screen to fire!
            gun.setFiring(true);
        }
    }
}

Enemy.boundX = 256;
Enemy.prototype = Object.create(Ship.prototype);

Enemy.prototype.updateTargetLocation = function (ms) {
    this.setPosition(this.targetX, this.targetY - this.speed * ms);
};

Enemy.prototype.update = function (ms) {
    this.updateTargetLocation(ms);
    this.x = this.targetX + this.offsetX;
    this.y = this.targetY + this.offsetY;

    // Shooting
    if (this.guns) {
        var count = this.guns.length;
        for (var i = 0; i < count; i++) {
            this.guns[i].update(ms);
        }
    }
};

// TODO: Random factor?
function Straight(layer, x, y) {
    //	vel[1] = -0.046-frand*0.04;
    Enemy.call(this, layer, x, y, 43, 58, 0.065, 110, [new Gun(layer, this, 0, -26, 30 * 20, 90 * 20, StraightShot, 30 * 20 + 90 * 20 * Math.random())]);
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'gray')];
}

Straight.prototype = Object.create(Enemy.prototype);

function OmniGun(layer, host, x, y, warmupPeriod) {
    Gun.call(this, layer, host, x, y, 108 * 20, 0, null, warmupPeriod);
}

OmniGun.prototype = Object.create(Gun.prototype);

OmniGun.prototype.createShot = function () {
    // Aim at the player
    var x = this.host.x + this.x;
    var y = this.host.y + this.y;
    var speed = 0.5;
    var vx = 0;
    var vy = -speed;
    var target = this.layer.player;
    if (target) {
        var deltaX = target.x - x;
        var deltaY = target.y - y;
        var delta = Math.abs(deltaX) + Math.abs(deltaY);
        vx = speed * deltaX / delta;
        vy = speed * deltaY / delta;
    }
    return new OmniShot(x, y, vx, vy)
};

function Omni(layer, x, y) {
    // TODO: Gun, mass
    Enemy.call(this, layer, x, y, 20, 20, 0.1 + 0.057 * Math.random(), 45, [
        new OmniGun(layer, this, 0, 0, 0),
        new OmniGun(layer, this, 0, 0, 6 * 20),
        new OmniGun(layer, this, 0, 0, 12 * 20)
    ]);
    this.movementFactor = Math.random();
    this.lastMoveX = 0;
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'brown')];
}

Omni.prototype = Object.create(Enemy.prototype);

Omni.prototype.updateTargetLocation = function (ms) {
    if (this.target) {
        var deltaX = this.target.x - this.x;
        // Adjust x movement slowly
        this.lastMoveX *= 0.9;
        this.lastMoveX += (0.1 * (0.014 * deltaX));
        this.targetX = this.x + (this.movementFactor * this.lastMoveX);
    }

    this.targetY -= this.speed * ms;
    // TODO: Bounds? At least horizontal bounds are needed
};

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

// TODO: There is a "randFact"--is that actually used anywhere?
function LevelAction(factory, time, x, y) {
    this.factory = factory;
    this.time = time;
    this.x = x;
    this.y = y;
}

Wave = {
    formation: {
        none: 0,
        arrow: 1,
        fixed: 2
    }
}

function Level(layer, waves) {
    this.layer = layer;
    this.queue = new OrderedQueue(function compareAction(a, b) { return a.time - b.time; });
    this.timer = 0;
    var count = waves.length;
    for (var i = 0; i < count; i++) {
        var wave = waves[i];
        wave.factory.call(this, wave.start, wave.duration, wave.density);
    }
}

Level.prototype.addStraightWave = function (start, duration, density) {
    // TODO: Scale xRand?
    var xRand = 8;
    // TODO: 60?
    var frequency = 60 / density * 20;
    var end = start + duration;
    this.addWave(Straight, start, end, undefined, undefined, frequency, 5 * 20, xRand, undefined);
};

Level.prototype.addOmniWave = function (start, duration, density) {
    // Add two small omni waves
    var xRand = 1;
    var frequency = 39 / density * 20;
    var end = start + (duration / 2) + 50 * 20;
    this.addWave(Omni, start, end, (Math.random() * 2 - 1) * 227, undefined, frequency, 5 * 20, xRand, undefined);
    end = start + duration;
    this.addWave(Omni, start + (duration / 2) - 50 * 20, end, (Math.random() * 2 - 1) * 227, undefined, frequency, 5 * 20, xRand, undefined);

    // And a straight wave
    xRand = 8;
    frequency = 200 * 50;
    this.addWave(Straight, start + 100 * 20, end, undefined, undefined, frequency, 50 * 20, xRand, undefined);
};

Level.prototype.addStraightArrowWave = function (start, duration, density) {
    // Add a straight arrow wave
    var frequency = 50 / density * 20;
    var end = start + 130 * 20;
    var c = (Math.random() * 2 - 1) / 22.51 * 640;
    this.addWave(Straight, start, end, c, undefined, frequency, 0, 1.6, undefined, Wave.formation.arrow);

    // Add two omni waves
    frequency = 15 / density * 20;
    this.addWave(Omni, start + 220 * 20, start + 260 * 20, c, undefined, frequency, 5 * 20, 2);
    frequency = 22 / density * 20;
    this.addWave(Omni, start + 440 * 20, start + 600 * 20, c, undefined, frequency, 5 * 20, 2);
};

Level.prototype.addOmniArrowWave = function (start, duration, density) {
    // Add omni arrow waves
    var frequency = 25 / density * 20;
    var end = start + 130 * 20;
    var c = (Math.random() * 2 - 1) * 2 / 22.51 * 640;
    var xRand = 1;
    this.addWave(Omni, start + 50 * 20, start + 150 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);

    this.addWave(Omni, start + 250 * 20, start + 320 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);
    this.addWave(Omni, start + 300 * 20, start + 330 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);
    this.addWave(Omni, start + 350 * 20, start + 470 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);

    frequency = 5 / density * 20;
    xRand = 1.8;
    this.addWave(Omni, start + 550 * 20, start + 555 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);
};

Level.prototype.addWave = function (factory, start, end, waveX, waveY, frequency, fJitter, xRand, xJitter, formation) {
    var interval = 1;
    var iteration = 0;
    waveX = (waveX === undefined ? 0 : waveX);
    waveY = (waveY === undefined ? 284 : waveY);
    fJitter = (fJitter === undefined ? 10 * 20 : fJitter);
    xJitter = (xJitter === undefined ? 227 : xJitter);
    formation = (formation === undefined ? Wave.formation.none : formation);
    // TODO: Multiply jitter/period by (2 - gameSkill)
    // TODO: Formation
    // TODO: Use xRand?
    for (var t = start; t < end;) {
        var x = 0;

        // TODO: Supply random factor to the LevelAction (and eventually the enemy constructor)
        switch (formation) {
            case Wave.formation.none:
                x = waveX + xJitter * (Math.random() * 2 - 1);
                break;

            case Wave.formation.arrow:
                // TODO: It looks like the original tried to make an arrow but really only made a line... change it?
                x = waveX - xJitter * iteration;
                break;
        }

        t += frequency + fJitter * (Math.random() * 2 - 1);
        this.queue.insert(new LevelAction(factory, t, x, waveY));
    }
};

Level.prototype.update = function (ms) {
    this.timer += ms;
    var action;
    while ((action = this.queue.first()) && this.timer >= action.time) {
        action = this.queue.remove();
        this.layer.addEnemy(new action.factory(this.layer, action.x, action.y));
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
    this.enemyShots = [];
    this.reset();
}

GameLayer.boundX = 640;
GameLayer.boundY = 284;
GameLayer.prototype = Object.create(Layer.prototype);

GameLayer.prototype.reset = function () {
    this.player.reset();
    this.clearPlayerShots();
    this.clearEnemies();
    this.clearEnemyShots();
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
        this.removeEnemy(this.enemies[0]);
    }
};

GameLayer.prototype.addEnemyShot = function (shot) {
    this.enemyShots.push(this.addEntity(shot));
};

GameLayer.prototype.removeEnemyShot = function (shot) {
    var index = this.enemyShots.indexOf(shot);
    if (index >= 0) {
        this.removeEntity(this.enemyShots[index]);
        this.enemyShots.splice(index, 1);
    }
};

GameLayer.prototype.clearEnemyShots = function () {
    while (this.enemyShots.length > 0) {
        this.removeenemyShot(this.enemyShots[0]);
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

GameLayer.prototype.checkShipCollision = function (a, b) {
    // Not particularly precise, but true to the original...
    var x = a.x - b.x;
    var y = a.y - b.y;
    var distance = Math.abs(x) + Math.abs(y);
    return distance < (a.width + b.width) / 4;
};

GameLayer.prototype.updateGame = function (ms) {
    // Check bounds and collisions for player shots
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

    // Check bounds and collisions for enemy shots
    count = this.enemyShots.length;
    for (i = 0; i < count; i++) {
        var shot = this.enemyShots[i];
        var remove = false;

        if (shot.y < -GameLayer.boundY
            || shot.y > GameLayer.boundY
            || shot.x < -GameLayer.boundX
            || shot.x > GameLayer.boundX) {
            remove = true;
        } else {
            // Check collisions
            // TODO: This is actually a different algorithm than in the original (it used the average of width and
            // height compared to the Manhattan distance...)
            if (this.checkShotCollision(shot, this.player)) {
                // TODO: Explosion
                // TODO: Shields
                this.player.takeDamage(shot);
                remove = true;
            }
        }

        if (remove) {
            this.removeEnemyShot(shot);
            i--;
            count--;
        }
    }

    // Check bounds, health, collisions for enemies
    count = this.enemies.length;
    for (i = 0; i < count; i++) {
        var enemy = this.enemies[i];
        var remove = false;
        if (enemy.y < -GameLayer.boundY) {
            // Out of bounds
            // TODO: This should cause the player to lose a life
            remove = true;
        } else if (enemy.health <= 0) {
            // Destroyed
            // TODO: Explosion
            remove = true;
        } else if (this.player.health > 0 && this.checkShipCollision(this.player, enemy)) {
            // TODO: Move to helper on Player?
            var damage = Math.min(35, enemy.health / 2);
            this.player.health -= damage;
            // TODO: Shields
            enemy.health -= 40;

            // Knock player
            var deltaX = (this.player.x - enemy.x);
            var deltaY = (this.player.y - enemy.y);
            this.player.offsetX += deltaX * damage * 0.03;
            this.player.offsetY += deltaY * damage * 0.03;

            // Knock enemy
            // TODO: Add a mass factor
            enemy.offsetX -= deltaX / 2;
            enemy.offsetY -= deltaY / 4;
        }

        if (remove) {
            this.removeEnemy(enemy);
            i--;
            count--;
        }
    }

    // Check for loss
    if (this.player.health <= 0) {
        this.removeEntity(this.player);
    }

    // Add new enemies according to the level
    if (this.level) {
        this.level.update(ms);
    }
};

// TODO: Where should this code go?
GameLayer.prototype.loadLevel1 = function (layer) {
    var totalTime = 12000 * 20;
    var waveDuration = 500;
    time = 600 * 20;
    var waves = [];

    // Always add the same first wave
    waves.push({
        factory: Level.prototype.addStraightWave,
        start: 1,
        duration: time,
        density: 0.4
    });

    // Now add random waves
    while (time < totalTime - 1000 * 20) {
        // Scale up the density as time goes on
        var density = (time < 1500 * 20 ? (time + 250 * 20) / (2000 * 20) : 1);
        var r = Math.random();

        // Pick the type of wave
        var factory;
        if (r < 0.15) {
            // 15% chance
            factory = Level.prototype.addStraightArrowWave;
        } else if (r < 0.25) {
            // 10% chance
            factory = Level.prototype.addOmniArrowWave;
        } else if (r > 0.6) {
            // 60% chance
            factory = Level.prototype.addStraightWave;
        } else {
            // 15% chance
            factory = Level.prototype.addOmniWave;
        }

        waves.push({
            factory: factory,
            start: time,
            duration: waveDuration,
            density: density
        });

        time += waveDuration;
        waveDuration = (600 + 100 * (Math.random() * 2 - 1)) * 20;

        // Put a little delay between waves
        time += (50 + 50 * Math.random()) * 20;
    }

    // TODO: Ray gun enemy
    // TODO: Boss
    // TODO: Ammunition
    // TODO: Power-ups

    return new Level(this, waves);
};

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
