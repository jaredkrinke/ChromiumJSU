/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function Explosion(image, x, y, width, height, duration, delay) {
    Entity.call(this, x, y, width, height);
    this.duration = duration;
    this.originalWidth = width;
    this.originalHeight = height;
    this.timer = delay ? -delay : 0;
    this.elements = [image];

    // Make sure opacity gets set initially
    this.update(0);
}

Explosion.prototype = Object.create(Entity.prototype);

Explosion.prototype.update = function (ms) {
    this.timer += ms;
    if (this.timer >= 0) {
        // Update size and opacity
        var sizeFactor = Math.min(1, (this.timer + 100) / (this.duration + 100));
        this.width = sizeFactor * this.originalWidth;
        this.height = sizeFactor * this.originalHeight;
        this.opacity = Math.min(1, 1.2 - this.timer / this.duration);

        // Flag for removal if done
        if (this.timer > this.duration) {
            this.dead = true;
        }
    } else {
        this.opacity = 0;
    }
};

function ExplosionTemplate(image, width, height, duration, delay) {
    this.image = image;
    this.width = width;
    this.height = height;
    this.duration = duration;
    this.delay = delay;
}

ExplosionTemplate.prototype.instantiate = function (layer, x, y) {
    layer.addEntity(new Explosion(this.image, x, y, this.width, this.height, this.duration, this.delay));
};

function ExplosionSequence(explosions) {
    this.explosions = explosions;
}

ExplosionSequence.prototype.instantiate = function (layer, x, y) {
    var count = this.explosions.length;
    for (var i = 0; i < count; i++) {
        // Each item is an array: ExplosionTemplate, [offsetX], [offsetY]
        var explosion = this.explosions[i];
        var template = explosion[0];
        var offsetX = explosion[1] || 0;
        var offsetY = explosion[2] || 0;
        template.instantiate(layer, x + offsetX, y + offsetY);
    }
}

function Shot(x, y, image, width, height, vx, vy, damage, explosionTemplate, permanent) {
    Entity.call(this, x, y, width, height);
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.explosionTemplate = explosionTemplate;
    this.permanent = permanent;
    this.elements = [image];
}

Shot.prototype = Object.create(Entity.prototype);

Shot.prototype.update = function (ms) {
    this.x += this.vx * ms;
    this.y += this.vy * ms;
};

function Bullet(x, y) {
    Shot.call(this, x, y, Bullet.image, 3, 18, 0, 0.71, 3.5, new ExplosionTemplate(Bullet.explosionImage, 14, 14, 10 * 20));
}

Bullet.image = new Image('images/bullet.png', 'yellow');
Bullet.explosionImage = new Image('images/bulletExplosion.png', 'orange');
Bullet.flashImage = new Image('images/bulletFlash.png', 'orange');
Bullet.prototype = Object.create(Shot.prototype);

function Plasma(x, y) {
    Shot.call(this, x, y, Plasma.image, 6, 43, 0, 0.28, 6, new ExplosionTemplate(Plasma.explosionImage, 28, 57, 15 * 20), true);
}

Plasma.image = new Image('images/plasma.png', 'yellow');
Plasma.explosionImage = new Image('images/plasmaExplosion.png', 'orange');
Plasma.flashImage = new Image('images/plasmaFlash.png', 'green');
Plasma.prototype = Object.create(Shot.prototype);

function Emp(x, y) {
    Shot.call(this, x, y, Emp.image, 17, 43, 0, 0.43, 40, new ExplosionTemplate(Emp.explosionImage, 51, 57, 23 * 20));
}

Emp.image = new Image('images/emp.png', 'yellow');
Emp.explosionImage = new Image('images/empExplosion.png', 'orange');
Emp.flashImage = new Image('images/empFlash.png', 'blue');
Emp.prototype = Object.create(Shot.prototype);

function StraightShot(x, y) {
    Shot.call(this, x, y, StraightShot.image, 14, 31, 0, -0.28, 75, new ExplosionTemplate(StraightShot.explosionImage, 85, 85, 15 * 20));
}

StraightShot.image = new Image('images/straightShot.png', 'yellow');
StraightShot.explosionImage = new Image('images/straightShotExplosion.png', 'orange');
StraightShot.prototype = Object.create(Shot.prototype);

function OmniShot(x, y, vx, vy) {
    // TODO: Make it so that the elements get rotated based on direction
    Shot.call(this, x, y, OmniShot.image, 13, 13, vx, vy, 6, new ExplosionTemplate(OmniShot.explosionImage, 28, 28, 10 * 20));
}

OmniShot.image = new Image('images/omniShot.png', 'yellow');
OmniShot.explosionImage = new Image('images/omniShotExplosion.png', 'orange');
OmniShot.prototype = Object.create(Shot.prototype);

function RayGunShot(x, y) {
    Shot.call(this, x, y, RayGunShot.image, 17, 28, 0, -0.85, 20, new ExplosionTemplate(RayGunShot.explosionImage, 97, 97, 10 * 20));
}

RayGunShot.image = new Image('images/rayGunShot.png', 'yellow');
RayGunShot.explosionImage = new Image('images/rayGunShotExplosion.png', 'orange');
RayGunShot.prototype = Object.create(Shot.prototype);

function TankShot(x, y) {
    Shot.call(this, x, y, TankShot.image, 26, 26, 0, -1, 100, new ExplosionTemplate(TankShot.explosionImage, 97, 97, 10 * 20));
}

TankShot.image = new Image('images/tankShot.png', 'yellow');
TankShot.flashImage = new Image('images/tankShotFlash.png', 'purple');
TankShot.explosionImage = new Image('images/tankShotExplosion.png', 'orange');
TankShot.prototype = Object.create(Shot.prototype);

function Gun(layer, host, x, y, period, periodRandomMax, shot, flashTemplate, warmupPeriod, elements) {
    Entity.call(this, x, y);
    this.layer = layer;
    this.host = host;
    this.period = period;
    this.periodRandomMax = periodRandomMax;
    this.shot = shot;
    this.flashTemplate = flashTemplate;
    this.warmupPeriod = warmupPeriod || 0;
    this.elements = elements;
    this.opacity = 0;
    this.reset();
}

Gun.createAimedShot = function () {
    // Aim at the player
    var x = this.host.x + this.x;
    var y = this.host.y + this.y;
    var speed = this.speed;
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
    return new this.shot(x, y, vx, vy)
};

Gun.prototype = Object.create(Entity.prototype);

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

    // Add a flash, if provided
    if (this.flashTemplate) {
        this.flashTemplate.instantiate(this.layer, this.host.x + this.x, this.host.y + this.y);
    }
};

Gun.prototype.update = function (ms) {
    this.timer -= ms;
    if (this.firing) {
        if (this.timer <= 0) {
            this.fire();
            this.reload();

            // Opacity is used for charging effects
            this.opacity = 0;
        } else {
            this.opacity = Math.min(1, Math.max(0, (this.period - this.timer) / this.period));
        }
    } else {
        this.opacity = 0;
    }
};

function Ship(layer, x, y, shipWidth, shipHeight, health, explosionTemplate) {
    Entity.call(this, x, y);
    this.shipWidth = shipWidth;
    this.shipHeight = shipHeight;
    this.layer = layer;
    this.health = health;
    this.explosionTemplate = explosionTemplate;
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
    Ship.call(this, layer, 0, 0, Player.shipWidth, Player.shipHeight, 500, new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20));
    this.elements = [Player.image, Player.exhaustImage];
    this.guns = [
        // Default machine gun
        new Gun(layer, this, 9, 10, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
        new Gun(layer, this, -9, 10, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),

        // Extra machine gun
        new Gun(layer, this, 14, -5, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
        new Gun(layer, this, -14, -5, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),

        // Plasma
        new Gun(layer, this, 0, 10, 500, 0, Plasma, new ExplosionTemplate(Plasma.flashImage, 28, 28, 10 * 20)),

        // EMP
        new Gun(layer, this, -20, -10, 200, 0, Emp, new ExplosionTemplate(Emp.flashImage, 28, 28, 5 * 20)),
        new Gun(layer, this, 20, -10, 200, 0, Emp, new ExplosionTemplate(Emp.flashImage, 28, 28, 5 * 20), 100)
    ];

    this.children = this.guns.slice();
}

Player.shipWidth = 40;
Player.shipHeight = 48;
Player.image = new Image('images/player.png', 'red', -Player.shipWidth / 2, Player.shipHeight / 2, Player.shipWidth, Player.shipHeight);
Player.exhaustWidth = 37;
Player.exhaustHeight = 37;
Player.exhaustImage = new Image('images/empFlash.png', 'blue', -Player.exhaustWidth / 2, Player.exhaustHeight / 2 - 18, Player.exhaustWidth, Player.exhaustHeight, 0.7);
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
    // Update guns
    this.updateChildren(ms);

    // Apply boundaries and temporary offsets
    // TODO: It seems like the bounds would be better controlled in the layer...
    var x = this.targetX + this.offsetX;
    var y = this.targetY + this.offsetY;
    this.x = Math.max(-Player.boundX, Math.min(Player.boundX, x));
    this.y = Math.max(-Player.boundY, Math.min(Player.boundY, y));

    // Scale down temporary offsets
    this.updateOffsets(ms);
};

function Enemy(layer, x, y, shipWidth, shipHeight, speed, health, guns, explosionTemplate) {
    Ship.call(this, layer, x, y, shipWidth, shipHeight, health, explosionTemplate);
    // TODO: It seems like bounds should be based on size...
    this.x = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, x));
    this.speed = speed;
    this.target = layer.player;
    this.children = guns.slice();
    this.guns = guns;
}

Enemy.boundX = 256;
Enemy.explosionImage = new Image('images/enemyExplosion.png', 'orange');
Enemy.prototype = Object.create(Ship.prototype);

Enemy.prototype.updateTargetLocation = function (ms) {
    this.setPosition(this.targetX, this.targetY - this.speed * ms);
};

Enemy.prototype.setFiring = function (firing) {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        var gun = this.guns[i];
        gun.setFiring(firing);
    }
};

Enemy.prototype.updateGuns = function (ms) {
    if (this.guns && !this.startedFiring) {
        if (this.y < 240) {
            this.setFiring(true);
            this.startedFiring = true;
        }
    }
};

Enemy.prototype.update = function (ms) {
    this.updateTargetLocation(ms);
    this.x = this.targetX + this.offsetX;
    this.y = this.targetY + this.offsetY;

    // Shooting
    this.updateGuns(ms);
    this.updateChildren(ms);
};

// TODO: Random factor?
function Straight(layer, x, y) {
    //	vel[1] = -0.046-frand*0.04;
    Enemy.call(this, layer, x, y, Straight.shipWidth, Straight.shipHeight, 0.065, 110,
        [new Gun(layer, this, 0, -26, 30 * 20, 90 * 20, StraightShot, undefined, 30 * 20 + 90 * 20 * Math.random(), [Straight.chargeImage])],
        new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20)],
            [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20, 15 * 20)]
        ]));
    this.elements = [Straight.image];
}

Straight.shipWidth = 43;
Straight.shipHeight = 58;
Straight.image = new Image('images/straight.png', 'gray', -Straight.shipWidth / 2, Straight.shipHeight / 2, Straight.shipWidth, Straight.shipHeight);
Straight.chargeWidth = 16;
Straight.chargeHeight = 16;
Straight.chargeImage = new Image('images/straightShot.png', 'red', -Straight.chargeWidth / 2, Straight.chargeHeight / 2, Straight.chargeWidth, Straight.chargeHeight);
Straight.prototype = Object.create(Enemy.prototype);

function OmniGun(layer, host, x, y, warmupPeriod) {
    Gun.call(this, layer, host, x, y, 108 * 20, 0, OmniShot, undefined, warmupPeriod);
    this.speed = 0.5;
}

OmniGun.prototype = Object.create(Gun.prototype);
OmniGun.prototype.createShot = Gun.createAimedShot;

function Spinner(image, x, y, width, height, speed) {
    Entity.call(this, x, y, width, height);
    this.speed = speed;
    this.elements = [image];
}

Spinner.prototype = Object.create(Entity.prototype);

Spinner.prototype.update = function (ms) {
    this.angle += this.speed * ms;
    while (this.angle > 2 * Math.PI) {
        this.angle -= 2 * Math.PI;
    }
    while (this.angle <= -2 * Math.PI) {
        this.angle += 2 * Math.PI;
    }
};

function Omni(layer, x, y) {
    // TODO: Mass
    var guns = [];
    for (var i = 0; i < 18; i++) {
        guns.push(new OmniGun(layer, this, 0, 0, i * 20));
    }

    Enemy.call(this, layer, x, y, Omni.shipWidth, Omni.shipHeight, 0.1 + 0.057 * Math.random(), 45, guns, new ExplosionSequence([
        [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20)],
        [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20, 3 * 20)],
        [new ExplosionTemplate(Omni.explosionImage, 114, 85, 10 * 20)]
    ]));
    this.movementFactor = Math.random();
    this.lastMoveX = 0;
    this.elements = [Omni.image];
    this.children.push(new Spinner(Omni.spinnerImage, 0, 0, Omni.shipWidth, Omni.shipHeight, -8 / 20 * Math.PI / 180));
}

Omni.shipWidth = 40;
Omni.shipHeight = 40;
Omni.image = new Image('images/omni.png', 'brown', -Omni.shipWidth / 2, Omni.shipHeight / 2, Omni.shipWidth, Omni.shipHeight);
Omni.spinnerImage = new Image('images/omniSpinner.png', 'brown');
Omni.explosionImage = new Image('images/omniExplosion.png', 'gray');
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

function RayGun(layer, x, y) {
    Enemy.call(this, layer, x, y, RayGun.shipWidth, RayGun.shipHeight, 0.043, 1000,
        [new Gun(layer, this, 0, -14, 20, 0, RayGunShot)],
        new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77)],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 5 * 20), 16],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 15 * 20), -14, 6],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 20 * 20)],
            [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 30 * 20)]
        ]));
    this.elements = [RayGun.image];
    this.timer = 0;
    this.movementFactor = 0.5 + Math.random() / 2;
    this.lastMoveX = 0;
    this.lastMoveY = 0;
}

RayGun.shipWidth = 68;
RayGun.shipHeight = 68;
RayGun.image = new Image('images/rayGun.png', 'purple', -RayGun.shipWidth / 2, RayGun.shipHeight / 2, RayGun.shipWidth, RayGun.shipHeight);
RayGun.prototype = Object.create(Enemy.prototype);

RayGun.prototype.updateTargetLocation = function (ms) {
    this.timer += ms;
    if (this.target) {
        var deltaX = this.target.x - this.x;
        var deltaY = this.target.y - this.y;
        var deltaXMagnitude = Math.abs(deltaX);
        var oscillateDistance = 85;
        var dx = 0;

        if (deltaXMagnitude < oscillateDistance) {
            // Oscillate near the target when close (horizontally)
            dx = (oscillateDistance - deltaXMagnitude) / oscillateDistance * (3 * Math.sin(this.timer));
        }

        if (deltaXMagnitude < 199) {
            // Decrease vertical speed when reasonable close
            deltaY *= 0.1;
        }

        // Adjust movement slowly
        this.lastMoveX *= 0.975;
        this.lastMoveX += (0.002 * deltaX);
        this.lastMoveY *= 0.9;
        this.lastMoveY += 0.001 * deltaY;

        this.targetX = this.x + (this.movementFactor * this.lastMoveX + dx);
    }

    this.targetY += this.lastMoveY - this.speed * ms;
    // TODO: Bounds? At least horizontal bounds are needed
};

RayGun.prototype.updateGuns = function (ms) {
    if (this.y < 240 && this.target) {
        var deltaX = this.target.x - this.x;
        if (Math.abs(deltaX) < 43) {
            this.setFiring(true);
        } else {
            this.setFiring(false);
        }
    }
};

function Boss0(layer, x, y) {
    // Create guns
    this.rayGun = new Gun(layer, this, 0, -48, 20, 0, RayGunShot);
    this.straightGuns = [
        new Gun(layer, this, 57, -54, 3 * 20, 0, StraightShot),
        new Gun(layer, this, 68, -54, 3 * 20, 0, StraightShot),
        new Gun(layer, this, 79, -54, 3 * 20, 0, StraightShot),
        new Gun(layer, this, -57, -54, 3 * 20, 0, StraightShot),
        new Gun(layer, this, -68, -54, 3 * 20, 0, StraightShot),
        new Gun(layer, this, -79, -54, 3 * 20, 0, StraightShot)
    ];
    this.omniGuns = [
        new Gun(layer, this, 31, -13, 50 * 20, 0, OmniShot),
        new Gun(layer, this, -31, -13, 50 * 20, 0, OmniShot)
    ];
    this.tankGuns = [
        new Gun(layer, this, -31, -13, 10 * 20, 0, TankShot, new ExplosionTemplate(TankShot.flashImage, 28, 28, 10 * 20)),
        new Gun(layer, this, 31, -13, 10 * 20, 0, TankShot, new ExplosionTemplate(TankShot.flashImage, 28, 28, 10 * 20))
    ];
    var guns = [this.rayGun];
    guns.concat(this.straightGuns, this.omniGuns, this.tankGuns);

    // Create explosion sequence
    var width = Boss0.shipWidth;
    var height = Boss0.shipHeight;
    var explosions = [];
    var explosionDuration = 1500;
    var explosionFrequency = 5;

    explosions.push([new ExplosionTemplate(Enemy.explosionImage, width, width, explosionDuration, i)]);

    for (var i = 0; i < explosionDuration; i += explosionFrequency) {
        var size = (Math.random() / 2 + 0.5) * width;
        explosions.push([new ExplosionTemplate(Enemy.explosionImage, size, size, 20 * 20, i), (Math.random() - 0.5) * width, (Math.random() - 0.5) * height]);

        // Decrease frequency over time
        explosionFrequency *= 1.1;
    }

    Enemy.call(this, layer, x, y, width, height, 0.028, 10000, guns, new ExplosionSequence(explosions));

    this.moveTimer = 0;
    this.lastMoveX = 0;
    this.lastMoveY = 0;

    this.timer = 0;
    this.steps = 0;
    this.straightCounter = 0;
    this.ammoSpeed = 0.5;
    this.omniV = [0, -this.ammoSpeed];
    this.elements = [Boss0.image];

    // Use boss's aim for omni shots
    var boss = this;
    var createOmniShot = function () {
        return new this.shot(this.host.x + this.x, this.host.y + this.y, boss.omniV[0], boss.omniV[1]);
    };
    this.omniGuns[0].createShot = createOmniShot;
    this.omniGuns[1].createShot = createOmniShot;

    // Tank guns aim automatically
    this.tankGuns[0].createShot = Gun.createAimedShot;
    this.tankGuns[0].speed = 2 * this.ammoSpeed;
    this.tankGuns[1].createShot = Gun.createAimedShot;
    this.tankGuns[1].speed = 2 * this.ammoSpeed;
}

Boss0.shipWidth = 199;
Boss0.shipHeight = 129;
Boss0.image = new Image('images/boss0.png', 'cyan', -Boss0.shipWidth / 2, Boss0.shipHeight / 2, Boss0.shipWidth, Boss0.shipHeight);
Boss0.prototype = Object.create(Enemy.prototype);

Boss0.prototype.updateGuns = function (ms) {
    this.timer += ms;
    if (this.y < 240 && this.target) {
        var deltaX = this.target.x - this.x;

        // Fire ray gun if near the player
        this.rayGun.setFiring(Math.abs(deltaX) < 46);

        // Handle guns that are controlled by frame count
        var nextStep = Math.floor(this.timer / 20);
        for (; this.steps < nextStep; this.steps++) {
            // Straight guns
            if (this.steps % 5 === 0) {
                this.straightCounter++;
                this.straightCounter %= 15;
                if (this.straightCounter < 6) {
                    var index = this.straightCounter % 3;
                    this.straightGuns[index].fire();
                    this.straightGuns[index + 3].fire();
                }
            }

            // Adjust aim for omni guns
            if ((this.steps - 1) % 7) {
                var deltaY = this.target.y - this.y;
                var d = Math.abs(deltaX) + Math.abs(deltaY);
                this.omniV[0] = this.ammoSpeed * deltaX / d;
                this.omniV[1] = this.ammoSpeed * deltaY / d;
            }

            // Fire omni guns
            if (Math.floor(this.steps / 200) % 2 === 0) {
                if (Math.floor(this.steps / 100) % 2 === 0) {
                    if (Math.floor(this.steps / 50) % 2 === 0) {
                        this.omniGuns[0].fire()
                        this.omniGuns[1].fire()
                    }
                } else if (this.steps % 10 === 0) {
                    // Fire tank guns
                    this.tankGuns[0].fire();
                    this.tankGuns[1].fire();
                }
            }
        }
    }
};

Boss0.prototype.updateTargetLocation = function (ms) {
    this.moveTimer += ms;
    if (this.target) {
        var deltaX = this.target.x - this.x;
        var deltaY = this.target.y - this.y;
        var approach = 199;

        if (Math.abs(deltaY) < approach) {
            deltaY *= deltaY / approach;
        }

        deltaX += 143 * Math.sin(this.moveTimer / 10);

        // Adjust movement slowly
        this.lastMoveX *= 0.98;
        this.lastMoveX += (0.0005 * deltaX);
        this.lastMoveY *= 0.9;
        this.lastMoveY += 0.001 * deltaY;

        this.targetX += this.lastMoveX;
    }

    this.targetY += this.lastMoveY - this.speed * ms;
    // TODO: Bounds?
};

var GroundTemplates = {
    metal: {
        image: new Image('images/groundMetal.png', 'DarkGray'),
        segmentWidth: 320,
        segmentHeight: 320,
        vy: -0.048
    },

    metalHighlight: {
        image: new Image('images/groundMetalHighlight.png', 'DarkRed'),
        segmentWidth: 640,
        segmentHeight: 480,
        vy: -0.064
    }
}

function GroundSegment(template, x, y, width, height) {
    Entity.call(this, x, y, width, height);
    this.template = template;
    this.elements = [template.image];
}

// TODO: Make sure that portrait resolution doesn't draw extra ground on the top and bottom!
GroundSegment.prototype = Object.create(Entity.prototype);

GroundSegment.prototype.update = function (ms) {
    this.y += this.template.vy * ms;
    if (this.y <= -240 - this.template.segmentHeight / 2) {
        this.y += 480 + this.template.segmentHeight;
    }
};

function Ground(template) {
    Entity.call(this);
    this.children = [];

    var scaleY = 1;
    var screenHeight = 480;
    var y = -screenHeight / 2;
    var rows = Math.ceil(screenHeight / template.segmentHeight) + 1;

    var screenWidth = 640;
    var columns = Math.ceil(screenWidth / template.segmentWidth);

    for (var i = 0; i < rows; i++) {
        var scaleX = 1;
        var x = -screenWidth / 2 + template.segmentWidth / 2;
        for (var j = 0; j < columns; j++) {
            this.children.push(new GroundSegment(template, x, y + template.segmentHeight / 2, scaleX * template.segmentWidth, scaleY * template.segmentHeight));
            scaleX = -scaleX;
            x += template.segmentWidth;
        }

        // Flip the next row
        scaleY = -scaleY;
        y += template.segmentHeight;
    }
}

Ground.prototype = Object.create(Entity.prototype);

function OrderedQueue(compare) {
    this.compare = compare;
    this.head = null;
}

OrderedQueue.prototype.insert = function (item) {
    if (this.head) {
        var node;
        var added = false;
        for (node = this.head; node.next; node = node.next) {
            if (this.compare(item, node.next.value) <= 0) {
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

// TODO: Maybe take a maximum time and reject all adds that come after that?
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

Level.prototype.addRayGunWave = function (start, duration) {
    var end = start + duration;
    this.addWave(RayGun, start, end, undefined, undefined, 2000 * 20, 1000 * 20, 8);
};

Level.prototype.addBoss0Wave = function (start, duration) {
    var end = start + duration;
    this.addWave(Boss0, start, end, 0, 426, 5000 * 20, 0, 4);
};

// TODO: xRand and xJitter are actually two names for the same thing; converge these
Level.prototype.addWave = function (factory, start, end, waveX, waveY, frequency, fJitter, xRand, xJitter, formation) {
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
                // TODO: Double-check this one--it seems like all the enemies show up at once which seems wrong
                x = waveX - xJitter * iteration;
                break;
        }

        this.queue.insert(new LevelAction(factory, t, x, waveY));
        t += frequency + fJitter * (Math.random() * 2 - 1);
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
    this.ground = this.addEntity(new Ground(GroundTemplates.metalHighlight));
    this.ground = this.addEntity(new Ground(GroundTemplates.metal));
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

    // Turn off the mouse cursor since the player moves with the mouse
    this.cursor = 'none';

    // TODO: Remove all entities (so that special effects get removed); don't forget to re-add the player...
    // TODO: Don't just load this by default
    this.level = this.loadLevel1();

    // TODO: Load a level instead of testing one enemy
    //this.level = new Level(this, [{
    //    factory: function (start, duration, density) {
    //        this.addWave(Boss0, 0, 100, undefined, undefined, 200, 0, 0, 0);
    //    },

    //    start: 0,
    //    duration: 100
    //}]);
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
    if (this.player) {
        this.player.setPosition(x, y);
    }
};

GameLayer.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (button === MouseButton.primary && this.player) {
        this.player.setFiring(pressed);
    }
};

GameLayer.prototype.mouseOut = function () {
    // Stop firing if the mouse left the canvas
    if (this.player) {
        this.player.setFiring(false);
    }
};

GameLayer.prototype.checkShotCollision = function (shot, b) {
    var bw = b.shipWidth / 2;
    var bh = b.shipHeight / 2;
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
    return distance < (a.shipWidth + b.shipHeight) / 4;
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
                    if (shot.permanent) {
                        // Scale damage based on time for permanent shots
                        enemy.health -= shot.damage * ms / 20;
                    } else {
                        enemy.health -= shot.damage;
                        remove = true;
                    }

                    // Add explosion
                    // TODO: Permanent shots (plasma) should add explosions on a timer...
                    shot.explosionTemplate.instantiate(this, shot.x, shot.y);
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
            if (this.player && this.checkShotCollision(shot, this.player)) {
                // TODO: Explosion
                // TODO: Shields
                this.player.takeDamage(shot);
                remove = true;

                // Add explosion
                shot.explosionTemplate.instantiate(this, shot.x, shot.y);
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
            remove = true;

            // Add explosion
            var template = enemy.explosionTemplate;
            if (template) {
                template.instantiate(this, enemy.x, enemy.y);
            }
        } else if (this.player && this.player.health > 0 && this.checkShipCollision(this.player, enemy)) {
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
    if (this.player && this.player.health <= 0) {
        // Add explosion
        var template = this.player.explosionTemplate;
        if (template) {
            template.instantiate(this, this.player.x, this.player.y);
        }

        this.removeEntity(this.player);
        this.player = null;

        // Re-enable the cursor
        this.cursor = 'auto';
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

    // Ray gun starts half way through
    waves.push({
        factory: Level.prototype.addRayGunWave,
        start: totalTime / 2,
        duration: totalTime - 1000 * 20 - totalTime / 2
    });

    // Boss
    waves.push({
        factory: Level.prototype.addBoss0Wave,
        start: totalTime + 75 * 20,
        duration: (1000 - 75) * 20
    });

    // TODO: Ammunition
    // TODO: Power-ups

    return new Level(this, waves);
};

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
