/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function Burst(image, x, y, width1, height1, width2, height2, duration, delay) {
    Entity.call(this, x, y, width1, height1);
    this.duration = duration;
    this.width1 = width1;
    this.height1 = height1;
    this.width2 = width2;
    this.height2 = height2;
    this.timer = delay ? -delay : 0;
    this.elements = [image];

    // Make sure opacity gets set initially
    this.update(0);
}

Burst.prototype = Object.create(Entity.prototype);

Burst.prototype.update = function (ms) {
    this.timer += ms;
    if (this.timer >= 0) {
        // Update size and opacity
        var t = Math.min(1, (this.timer + 100) / (this.duration + 100));
        this.width = this.width1 + (this.width2 - this.width1) * t;
        this.height = this.height1 + (this.height2 - this.height1) * t;
        this.opacity = Math.min(1, 1.2 - this.timer / this.duration);

        // Flag for removal if done
        if (this.timer > this.duration) {
            this.dead = true;
        }
    } else {
        this.opacity = 0;
    }
};

function BurstTemplate(image, width1, height1, width2, height2, duration, delay) {
    this.image = image;
    this.width1 = width1;
    this.height1 = height1;
    this.width2 = width2;
    this.height2 = height2;
    this.duration = duration;
    this.delay = delay;
}

// TODO: Base everything on a parent instead of the layer?
BurstTemplate.prototype.instantiate = function (layer, x, y) {
    layer.master.effects.addChild(new Burst(this.image, x, y, this.width1, this.height1, this.width2, this.height2, this.duration, this.delay));
};

function PowerUp(image, shadowImage, use, layer, x, y) {
    Entity.call(this, x, y, 34, 34);
    this.layer = layer;
    this.vy = -0.051;
    this.baseX = x;
    this.baseY = y;
    this.timer = 0;
    this.shadowImage = shadowImage;
    this.elements = [shadowImage, image];
    this.flashTemplate = new BurstTemplate(shadowImage, this.width, this.height, this.width / 5, this.height / 5, 500);
    this.use = function () {
        this.flashTemplate.instantiate(this.layer, this.x, this.y);
        use.call(this);
    };
}

PowerUp.weaponImage = new Image('images/powerupAmmo.png', 'white');
PowerUp.shieldImage = new Image('images/powerupShield.png', 'black');
// TODO: Maybe generate some of these images rather than loading several separate ones?
PowerUp.shadow0Image = new Image('images/powerupShadow0.png', 'yellow', -1.25, 1.25, 2.5, 2.5);
PowerUp.shadow1Image = new Image('images/powerupShadow1.png', 'green', -1.25, 1.25, 2.5, 2.5);
PowerUp.shadow2Image = new Image('images/powerupShadow2.png', 'blue', -1.25, 1.25, 2.5, 2.5);
PowerUp.shadow3Image = new Image('images/powerupShadow3.png', 'orange', -1.25, 1.25, 2.5, 2.5);
PowerUp.shadow4Image = new Image('images/powerupShadow4.png', 'purple', -1.25, 1.25, 2.5, 2.5);
PowerUp.shadow5Image = new Image('images/powerupShadow5.png', 'yellow', -1.25, 1.25, 2.5, 2.5);
PowerUp.prototype = Object.create(Entity.prototype);

PowerUp.prototype.update = function (ms) {
    this.baseY += this.vy * ms;

    // Drift slightly
    this.timer += ms;
    this.x = this.baseX + 3 * Math.sin(this.timer / 20 / 45 * 2 * Math.PI);
    this.y = this.baseY + 9 * Math.sin(this.timer / 20 / 75 * 2 * Math.PI);

    // Randomly rotate the shadow to create a shimmering effect
    this.shadowImage.angle = 2 * Math.PI * Math.random();
};

PowerUps = [
    function (layer, x, y) {
        return new PowerUp(PowerUp.weaponImage, PowerUp.shadow0Image, function () {
            if (this.layer.player) {
                this.layer.player.ammo[0] = 150;
                this.layer.ammoCollected.fire();
            }
        }, layer, x, y);
    },
    function (layer, x, y) {
        return new PowerUp(PowerUp.weaponImage, PowerUp.shadow1Image, function () {
            if (this.layer.player) {
                this.layer.player.ammo[1] = 150;
                this.layer.ammoCollected.fire();
            }
        }, layer, x, y);
    },
    function (layer, x, y) {
        return new PowerUp(PowerUp.weaponImage, PowerUp.shadow2Image, function () {
            if (this.layer.player) {
                this.layer.player.ammo[2] = 150;
                this.layer.ammoCollected.fire();
            }
        }, layer, x, y);
    },
    function (layer, x, y) {
        return new PowerUp(PowerUp.shieldImage, PowerUp.shadow3Image, function () {
            if (this.layer.player) {
                this.layer.player.health = Player.maxHealth;
                this.layer.healthCollected.fire();
            }
        }, layer, x, y);
    },
    function (layer, x, y) {
        return new PowerUp(PowerUp.shieldImage, PowerUp.shadow4Image, function () {
            if (this.layer.player) {
                if (this.layer.player.shields < Player.maxShields) {
                    this.layer.player.shields = Player.maxShields;
                }

                this.layer.shieldsCollected.fire();
            }
        }, layer, x, y);
    },
    function (layer, x, y) {
        return new PowerUp(PowerUp.shieldImage, PowerUp.shadow5Image, function () {
            if (this.layer.player) {
                this.layer.player.health = Player.maxHealth;
                this.layer.player.shields = 2 * Player.maxShields;
                this.layer.healthCollected.fire();
                this.layer.shieldsCollected.fire();
            }
        }, layer, x, y);
    },
];

function ExplosionTemplate(image, width, height, duration, delay) {
    BurstTemplate.call(this, image, 0, 0, width, height, duration, delay);
}

ExplosionTemplate.prototype = Object.create(BurstTemplate.prototype);

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

function Ship(layer, x, y, shipWidth, shipHeight, health, mass, explosionTemplate) {
    Entity.call(this, x, y);
    this.shipWidth = shipWidth;
    this.shipHeight = shipHeight;
    this.mass = mass;
    this.layer = layer;
    this.health = health;
    this.explosionTemplate = explosionTemplate;
    // TODO: This whole system of target vs. actual vs. offset is messy and confusing
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
    var factor = 1 - (0.015 * ms / 20);
    this.offsetX *= factor;
    this.offsetY *= factor;
};

function PlayerShields() {
    Entity.call(this);
    this.elements = [PlayerShields.shieldImage];
    this.opacity = 0;
}

PlayerShields.shieldWidth = 68;
PlayerShields.shieldHeight = 68;
PlayerShields.shieldFadePeriod = 500;
PlayerShields.maxOpacity = 0.9;
PlayerShields.shieldImage = new Image('images/playerShields.png', 'blue', -PlayerShields.shieldWidth / 2, PlayerShields.shieldHeight / 2, PlayerShields.shieldWidth, PlayerShields.shieldHeight);
PlayerShields.prototype = Object.create(Entity.prototype);

PlayerShields.prototype.flash = function () {
    this.opacity = PlayerShields.maxOpacity;
};

PlayerShields.prototype.update = function (ms) {
    if (this.opacity > 0) {
        this.opacity = Math.max(0, this.opacity - ms / PlayerShields.shieldFadePeriod * PlayerShields.maxOpacity);
        this.angle = 2 * Math.PI * Math.random();
    }
};

function PlayerSuperShields(player) {
    Entity.call(this);
    this.player = player;
    this.elements = [PlayerSuperShields.image];
    this.opacity = 0;
}

PlayerSuperShields.maxOpacity = 0.9;
PlayerSuperShields.image = new Image('images/playerSuperShields.png', 'blue', -PlayerShields.shieldWidth / 2, PlayerShields.shieldHeight / 2, PlayerShields.shieldWidth, PlayerShields.shieldHeight);
PlayerSuperShields.prototype = Object.create(Entity.prototype);

PlayerSuperShields.prototype.update = function (ms) {
    this.opacity = Math.max(0, (this.player.shields - Player.maxShields) / Player.maxShields);
    if (this.opacity > 0) {
        this.angle = 2 * Math.PI * Math.random();
    }
};

function Player(layer) {
    Ship.call(this, layer, 0, 0, Player.shipWidth, Player.shipHeight, Player.maxHealth, 100, new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20));

    this.healthLost = new Event();

    this.shieldImage = new PlayerShields();
    this.superShieldImage = new PlayerSuperShields(this);
    this.shields = 0;
    this.elements = [Player.image, Player.exhaustImage];

    // Movement
    this.cursorX = 0;
    this.cursorY = 0;
    this.targetX = this.cursorX;
    this.targetY = this.cursorY;

    // Weapons
    var defaultGun = [
        new Gun(layer, this, 9, 10, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
        new Gun(layer, this, -9, 10, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
    ];
    var machineGun = [
        new Gun(layer, this, 14, -5, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
        new Gun(layer, this, -14, -5, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
    ];
    var plasma = [
        new Gun(layer, this, 0, 10, 500, 0, Plasma, new ExplosionTemplate(Plasma.flashImage, 28, 28, 10 * 20)),
    ];
    var emp = [
        new Gun(layer, this, -20, -10, 200, 0, Emp, new ExplosionTemplate(Emp.flashImage, 28, 28, 5 * 20)),
        new Gun(layer, this, 20, -10, 200, 0, Emp, new ExplosionTemplate(Emp.flashImage, 28, 28, 5 * 20), 100)
    ];

    this.guns = defaultGun.concat(machineGun, plasma, emp);

    // Hook up ammo to guns
    this.ammo = [0, 0, 0];
    var player = this;
    var limitAmmo = function (guns, ammoIndex, ammoPerShot) {
        var count = guns.length;
        for (var i = 0; i < count; i++) {
            (function (i) {
                var gun = guns[i];

                // Replace the "fire" function with one that calls the original and then accounts for ammunition
                gun.fire = function () {
                    Gun.prototype.fire.apply(this, arguments);
                    player.ammo[ammoIndex] = Math.max(0, player.ammo[ammoIndex] - ammoPerShot);
                };

                // Turn the gun on/off based on ammo
                gun.update = function () {
                    if (player.ammo[ammoIndex] > 0) {
                        Gun.prototype.update.apply(this, arguments);
                    }
                };
            })(i);
        }
    };

    limitAmmo(machineGun, 0, 0.25);
    limitAmmo(plasma, 1, 1.5);
    limitAmmo(emp, 2, 1.5);

    // Set up children
    this.addChildren(this.guns);
    this.addChild(this.shieldImage);
    this.addChild(this.superShieldImage);
}

Player.maxHealth = 500;
Player.maxShields = 500;
Player.shipWidth = 40;
Player.shipHeight = 48;
Player.image = new Image('images/player.png', 'red', -Player.shipWidth / 2, Player.shipHeight / 2, Player.shipWidth, Player.shipHeight);
Player.exhaustWidth = 37;
Player.exhaustHeight = 37;
Player.exhaustImage = new Image('images/empFlash.png', 'blue', -Player.exhaustWidth / 2, Player.exhaustHeight / 2 - 18, Player.exhaustWidth, Player.exhaustHeight, 0.7);
Player.mouseSpeed = 1280 / 1000;
Player.movementThreshold = 0.5;
Player.prototype = Object.create(Ship.prototype);
Player.boundX = 284;
Player.boundY = 213;

Player.prototype.reset = function () {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].reset();
    }
};

// TODO: Keyboard
Player.prototype.setFiring = function (firing) {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].setFiring(firing);
    }
};

Player.prototype.takeDamage = function (damage) {
    if (this.shields) {
        // TODO: Any special effect if shields absorbed the hit? No knockback?
        var shieldDamage = Math.min(damage, this.shields);
        this.shields -= shieldDamage;
        damage -= shieldDamage;

        // Show a shield flash if super shields aren't in effect
        if (this.shields < Player.maxShields) {
            this.shieldImage.flash();
        }
    }

    if (damage) {
        this.health -= damage;
        this.healthLost.fire();
    }
};

Player.prototype.setCursorPosition = function (x, y) {
    this.cursorX = x;
    this.cursorY = y;
};

Player.prototype.update = function (ms) {
    // Update guns
    this.updateChildren(ms);

    // Move based on the cursor
    var dx = this.cursorX - this.targetX;
    var dy = this.cursorY - this.targetY;
    if (dx || dy) {
        var cursorDistance = Math.sqrt(dx * dx + dy * dy);
        if (cursorDistance > Player.movementThreshold) {
            var distance = Math.min(cursorDistance, ms * Player.mouseSpeed);
            var angle = Math.atan2(dy, dx);
            this.targetX += distance * Math.cos(angle);
            this.targetY += distance * Math.sin(angle);
        }
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

function Enemy(layer, x, y, shipWidth, shipHeight, speed, health, mass, guns, explosionTemplate) {
    Ship.call(this, layer, x, y, shipWidth, shipHeight, health, mass, explosionTemplate);
    // TODO: It seems like bounds should be based on size...
    this.x = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, x));
    this.speed = speed;
    this.target = layer.player;
    this.addChildren(guns);
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

function Straight(layer, x, y) {
    Enemy.call(this, layer, x, y, Straight.shipWidth, Straight.shipHeight, 0.065 + Math.random() * 0.0569, 110, 200,
        [new Gun(layer, this, 0, -26, 30 * 20, 90 * 20, StraightShot, undefined, 30 * 20 + 90 * 20 * Math.random(), [Straight.chargeImage])],
        new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20)],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), 3, 9],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), -6, , -11],
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
    var guns = [];
    for (var i = 0; i < 18; i++) {
        guns.push(new OmniGun(layer, this, 0, 0, i * 20));
    }

    Enemy.call(this, layer, x, y, Omni.shipWidth, Omni.shipHeight, 0.1 + 0.057 * Math.random(), 45, 143, guns, new ExplosionSequence([
        [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20)],
        [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20, 3 * 20)],
        [new ExplosionTemplate(Omni.explosionImage, 114, 85, 10 * 20)]
    ]));
    this.movementFactor = Math.random();
    this.lastMoveX = 0;
    this.elements = [Omni.image];
    this.addChild(new Spinner(Omni.spinnerImage, 0, 0, Omni.shipWidth, Omni.shipHeight, -8 / 20 * Math.PI / 180));
}

Omni.shipWidth = 40;
Omni.shipHeight = 40;
Omni.image = new Image('images/omni.png', 'brown', -Omni.shipWidth / 2, Omni.shipHeight / 2, Omni.shipWidth, Omni.shipHeight);
Omni.spinnerImage = new Image('images/omniSpinner.png', 'brown');
Omni.explosionImage = new Image('images/omniExplosion.png', 'gray');
Omni.prototype = Object.create(Enemy.prototype);

Omni.prototype.updateTargetLocation = function (ms) {
    if (this.target) {
        var deltaX = this.target.x - this.targetX;
        // Adjust x movement slowly
        this.lastMoveX *= 0.9;
        this.lastMoveX += (0.1 * (0.014 * deltaX));
        this.targetX = this.targetX + (this.movementFactor * this.lastMoveX);
    }

    this.targetY -= this.speed * ms;

    // Horizontal bounds
    this.targetX = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, this.targetX));
};

function RayGun(layer, x, y) {
    Enemy.call(this, layer, x, y, RayGun.shipWidth, RayGun.shipHeight, 0.043, 1000, 500,
        [new Gun(layer, this, 0, -31, 20, 0, RayGunShot)],
        new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77)],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), 3, 9],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), -6, , -11],
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
        var deltaX = this.target.x - this.targetX;
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

        this.targetX = this.targetX + (this.movementFactor * this.lastMoveX + dx);
    }

    this.targetY += this.lastMoveY - this.speed * ms;

    // Horizontal bounds
    this.targetX = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, this.targetX));
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

    Enemy.call(this, layer, x, y, width, height, 0.028, 10000, 2000, guns, new ExplosionSequence(explosions));

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

    // Horizontal bounds
    this.targetX = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, this.targetX));
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
            this.addChild(new GroundSegment(template, x, y + template.segmentHeight / 2, scaleX * template.segmentWidth, scaleY * template.segmentHeight));
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

Level.prototype.addPowerUps = function (start, duration, firsts) {
    firsts = firsts || [0, 100 * 20, 1000 * 20, 1200 * 20, 300 * 20, 1000 * 20];
    var randomModifiers = [200 * 20, 200 * 20, 500 * 20, 500 * 20, 500 * 20, 1500 * 20];
    var frequencies = [2000 * 20, 2500 * 20, 4000 * 20, 4000 * 20, 2500 * 20, 3000 * 20];

    // Add each type of power-up
    var powerupCount = firsts.length;
    for (var j = 0; j < powerupCount; j++) {
        // Loop through and add the power-up
        var t = start + firsts[j] + randomModifiers[j] * Math.random();
        while (t < start + duration) {
            this.queue.insert(new LevelAction(PowerUps[j], t, 227 * (2 * Math.random() - 1), GameLayer.boundY));
            t += frequencies[j] + (Math.random() - 0.5) * randomModifiers[j] * 2;
        }
    }
};

Level.prototype.update = function (ms) {
    this.timer += ms;
    var action;
    while ((action = this.queue.first()) && this.timer >= action.time) {
        action = this.queue.remove();
        // TODO: It would probably be better to move this logic into a generic "add item" in the layer itself
        var item = new action.factory(this.layer, action.x, action.y);
        if (item instanceof Enemy) {
            this.layer.addEnemy(item);
        } else if (item instanceof PowerUp) {
            this.layer.addPowerUp(item);
        }
    }
};

function Master(layer) {
    Entity.call(this);
    this.layer = layer;

    // Background
    this.addChild(new Ground(GroundTemplates.metalHighlight));
    this.addChild(new Ground(GroundTemplates.metal));

    // Player (and cursor)
    this.addChild(layer.playerCursor);
    this.addChild(layer.player);
    this.addChild(this.playerShots = new Entity());

    // Enemies
    this.addChild(this.enemies = new Entity());
    this.addChild(this.enemyShots = new Entity());

    // Power-ups
    this.addChild(this.powerups = new Entity());

    // Special effects
    this.addChild(this.effects = new Entity());
}

Master.prototype = Object.create(Entity.prototype);

Master.prototype.update = function (ms) {
    this.updateGame(ms);
    this.updateChildren(ms);
};

Master.prototype.updateGame = function (ms) {
    // Check bounds and collisions for player shots
    this.playerShots.forEachChild(function (shot) {
        var remove = false;

        if (shot.y > GameLayer.boundY) {
            // Out of bounds
            remove = true;
        } else {
            // Check collisions
            this.enemies.forEachChild(function (enemy) {
                if (this.layer.checkShotCollision(shot, enemy)) {
                    if (shot.permanent) {
                        // Scale damage based on time for permanent shots
                        enemy.health -= shot.damage * ms / 20;
                    } else {
                        enemy.health -= shot.damage;
                        remove = true;
                    }

                    // Add explosion
                    // TODO: Permanent shots (plasma) should add explosions on a timer...
                    shot.explosionTemplate.instantiate(this.layer, shot.x, shot.y);
                }
            }, this);
        }

        if (remove) {
            this.layer.removePlayerShot(shot);
        }
    }, this);

    // Check bounds and collisions for enemy shots
    this.enemyShots.forEachChild(function (shot) {
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
            if (this.layer.player && this.layer.checkShotCollision(shot, this.layer.player)) {
                this.layer.player.takeDamage(shot.damage);
                remove = true;

                // Knock back
                // TODO: Should this also knock horizontally?
                this.layer.player.offsetY += shot.damage / 0.87 * shot.vy;

                // Add explosion
                shot.explosionTemplate.instantiate(this.layer, shot.x, shot.y);
            }
        }

        if (remove) {
            this.layer.removeEnemyShot(shot);
        }
    }, this);

    // Check bounds, health, collisions for enemies
    this.enemies.forEachChild(function (enemy) {
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
                template.instantiate(this.layer, enemy.x, enemy.y);
            }
        } else if (this.layer.player && this.layer.player.health > 0 && this.layer.checkShipCollision(this.layer.player, enemy)) {
            // TODO: Move to helper on Player?
            var damage = Math.min(35, enemy.health / 2);
            this.layer.player.takeDamage(damage);
            enemy.health -= 40;

            // Knock player
            var deltaX = (this.layer.player.x - enemy.x);
            var deltaY = (this.layer.player.y - enemy.y);
            this.layer.player.offsetX += deltaX * damage * 0.04;
            this.layer.player.offsetY += deltaY * damage * 0.04;

            // Knock enemy
            var massFactor = this.layer.player.mass / enemy.mass;
            enemy.offsetX -= deltaX * massFactor;
            enemy.offsetY -= deltaY * massFactor / 2;

            // Add explosions
            var explosionOffsetX = 9 * (Math.random() * 2 - 1);
            var explosionOffsetY = 9 * (Math.random() * 2 - 1);

            GameLayer.collisionExplosionTemplate.instantiate(this.layer, enemy.x + explosionOffsetX, enemy.y + explosionOffsetY);

            if (this.layer.player.shields <= 0) {
                GameLayer.collisionExplosionTemplate.instantiate(this.layer, this.layer.player.x + explosionOffsetX, this.layer.player.y + explosionOffsetY + 6);
            }
        }

        if (remove) {
            this.layer.removeEnemy(enemy);
        }
    }, this);

    // Check bounds and collisions for power-ups
    this.powerups.forEachChild(function (powerup) {
        var remove = false;

        if (powerup.y < -GameLayer.boundY
            || powerup.y > GameLayer.boundY
            || powerup.x < -GameLayer.boundX
            || powerup.x > GameLayer.boundX) {
            remove = true;
        } else {
            // Check collisions
            if (this.layer.player && this.layer.checkPowerUpCollision(this.layer.player, powerup)) {
                // Apply the power-up
                powerup.use();
                remove = true;
            }
        }

        if (remove) {
            this.layer.removePowerUp(powerup);
        }
    }, this);

    // Check for loss
    if (this.layer.player && this.layer.player.health <= 0) {
        // Add explosion
        var template = this.layer.player.explosionTemplate;
        if (template) {
            template.instantiate(this.layer, this.layer.player.x, this.layer.player.y);
        }

        this.removeChild(this.layer.player);
        this.layer.player = null;

        // Re-enable the cursor
        this.layer.cursor = 'auto';
    }

    // Add new enemies according to the level
    if (this.layer.level) {
        this.layer.level.update(ms);
    }
};

function Electricity(x, y, width, height) {
    Entity.call(this, x, y);
    this.totalHeight = height;
    this.elements = [];
    for (var i = 0; i < 2; i++) {
        this.elements.push(new ImageRegion(Electricity.imageSrc, 'blue', 0, 0, 1, 0.5, 0, height / 2, width, height / 2));
    }

    this.timer = Electricity.period;
    this.update(0);
}

Electricity.imageSrc = 'images/electricity.png'
Electricity.period = 400;
Electricity.prototype = Object.create(Entity.prototype);

Electricity.prototype.update = function (ms) {
    this.timer += ms;

    if (this.timer >= Electricity.period) {
        this.opacity = 0;
    } else {
        // Move
        // TODO: Base on actual screen dimensions?
        this.opacity = 1;
        this.y = -240 + (480 + this.totalHeight) * this.timer / Electricity.period;

        // Randomly scroll texture
        var x = Math.random();
        var e1 = this.elements[0];
        var e2 = this.elements[1];

        e1.y = 0;
        e1.sy = x;
        e1.sheight = 1 - x;
        e1.height = e1.sheight * this.totalHeight;

        e2.y = -e1.height;
        e2.sy = 0;
        e2.sheight = x;
        e2.height = e2.sheight * this.totalHeight;
    }
};

Electricity.prototype.flash = function () {
    this.timer = 0;
    this.update(0);
};

function Blink(x, y, width, height) {
    Entity.call(this, x, y, width, height);
    this.opacity = 0;
    this.timer = Blink.duration;
    this.elements = [Blink.image];
}

Blink.duration = 600;
Blink.period = 150;
Blink.opacity = 0.5;
Blink.image = new Image('images/blink.png', 'red');
Blink.prototype = Object.create(Entity.prototype);

Blink.prototype.update = function (ms) {
    if (this.timer >= Blink.duration) {
        this.opacity = 0;
    } else {
        var on = (Math.floor(this.timer / Blink.period) % 2 === 0);
        this.opacity = on ? Blink.opacity : 0;
        this.timer += ms;
    }
};

Blink.prototype.blink = function () {
    if (this.timer >= Blink.duration) {
        this.timer = 0;
    }
};

function Display(layer, player) {
    this.layer = layer;
    this.player = player;
    this.blinkTimer = 0;
    this.blink = false;

    var x = -299;
    var y = 227;
    this.ammo = [];
    var count = player.ammo.length;
    for (var i = 0; i < count; i++) {
        var ammo = Display.ammoBarImages[i];
        ammo.x = x + 9 * i;
        ammo.y = y;
        ammo.width = 6;
        ammo.height = 1;
        this.ammo[i] = ammo;
    }

    this.ammoBackground = Display.statTopLeftImage;
    var backgrounds = [Display.statLeftImage, Display.statRightImage, this.ammoBackground];
    this.healthBar = Display.healthBarImage;
    this.shieldBar = Display.shieldBarImage;
    this.superShieldBar = Display.superShieldBarImage;

    this.elements = backgrounds.concat(this.ammo, [this.healthBar, this.shieldBar, this.superShieldBar]);

    // Flash the ammo area's background when ammo is collected
    var display = this;
    layer.ammoCollected.addListener(function () {
        display.ammoBackground.opacity = 1;
    });

    // Health/shield pick-up electricity effect
    this.electricityLeft = new Electricity(-320, 0, 65, 160);
    this.electricityRight = new Electricity(320 - 65, 0, 65, 160);
    layer.healthCollected.addListener(function () {
        display.electricityRight.flash();
    });
    layer.shieldsCollected.addListener(function () {
        display.electricityLeft.flash();
    });

    // Damage warning flash
    this.healthBlink = new Blink(320, -240, 240, 480);
    player.healthLost.addListener(function () {
        display.healthBlink.blink();
    });

    this.addChild(this.electricityLeft);
    this.addChild(this.electricityRight);
    this.addChild(this.healthBlink);
}

// TODO: Need a way to share the underlying image
Display.statLeftImage = new Image('images/statBackground.png', 'darkgray', -320, 240, 65, 480);
Display.statRightImage = new Image('images/statBackground.png', 'darkgray', 320 - 65, 240, 65, 480);
Display.statTopLeftImage = new Image('images/statTop.png', 'darkgray', -320, 240, 65, 94, 0.5);
Display.ammoBarImages = [
    new Image('images/ammoBar0.png', 'yellow'),
    new Image('images/ammoBar1.png', 'green'),
    new Image('images/ammoBar2.png', 'blue')
];
Display.barBaseY = -222;
Display.barMaxHeight = 171;
Display.fadePeriod = 1500;
Display.defaultOpacity = 0.2;
Display.blinkPeriod = 300;
Display.blinkOpacity = 0.5;
Display.ammoBlinkThreshold = 50;
Display.healthBlinkThreshold = Player.maxHealth * 0.3;
Display.healthBarImage = new Image('images/healthBar.png', 'red', 299 - 24, Display.barBaseY + Display.barMaxHeight, 24, 171);
Display.shieldBarImage = new Image('images/shieldBar.png', 'blue', -299, Display.barBaseY + Display.barMaxHeight, 24, 0);
Display.superShieldBarImage = new Image('images/superShieldBar.png', 'yellow', -299, Display.barBaseY + Display.barMaxHeight, 24, 0);
Display.prototype = Object.create(Entity.prototype);

Display.prototype.update = function (ms) {
    this.blinkTimer += ms;
    while (this.blinkTimer > Display.blinkPeriod) {
        this.blink = !this.blink;
        this.blinkTimer -= Display.blinkPeriod;
    }

    if (this.player) {
        // Update ammo
        var count = this.player.ammo.length;
        for (var i = 0; i < count; i++) {
            this.ammo[i].height = 1.5 * this.player.ammo[i];
            this.ammo[i].opacity = (this.blink || this.player.ammo[i] > Display.ammoBlinkThreshold) ? 1 : Display.blinkOpacity;
        }

        // Update health
        var height = Math.max(0, this.player.health / Player.maxHealth * Display.barMaxHeight);
        this.healthBar.height = height;
        this.healthBar.y = Display.barBaseY + height;
        this.healthBar.opacity = (this.blink || this.player.shields > 0 || this.player.health > Display.healthBlinkThreshold) ? 1 : Display.blinkOpacity;

        // Update shields
        height = Math.min(Display.barMaxHeight, Math.max(0, this.player.shields / Player.maxShields * Display.barMaxHeight));
        this.shieldBar.height = height;
        this.superShieldBar.height = height;
        this.shieldBar.y = Display.barBaseY + height;
        this.superShieldBar.y = this.shieldBar.y;
        this.superShieldBar.opacity = Math.max(0, (this.player.shields - Player.maxShields) / Player.maxShields);
    }

    if (this.ammoBackground.opacity > Display.defaultOpacity) {
        this.ammoBackground.opacity = Math.max(Display.defaultOpacity, this.ammoBackground.opacity - (1 - Display.defaultOpacity) / Display.fadePeriod * ms);
    }

    this.updateChildren(ms);
};

function Cursor(layer) {
    Entity.call(this, 0, 0, Cursor.size, Cursor.size);
    this.layer = layer;
    this.opacity = 0.35;
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'white')];
}

Cursor.size = 5;
Cursor.offsetY = (240 - Player.boundY) - 10;
Cursor.prototype = Object.create(Entity.prototype);

Cursor.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;

    if (this.layer.player) {
        this.layer.player.setCursorPosition(x, y + Cursor.offsetY);
    }
};

function GameLayer() {
    Layer.call(this);

    // TODO: Most of this should be moved to Master
    this.ammoCollected = new Event();
    this.healthCollected = new Event();
    this.shieldsCollected = new Event();

    this.playerCursor = new Cursor(this);
    this.player = new Player(this);
    this.master = new Master(this);
    this.display = new Display(this, this.player);

    this.addEntity(this.master);
    this.addEntity(this.display);

    // TODO: Needed?
    this.reset();
}

GameLayer.boundX = 640;
GameLayer.boundY = 284;
GameLayer.collisionExplosionTemplate = new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20);
GameLayer.prototype = Object.create(Layer.prototype);

GameLayer.prototype.reset = function () {
    // TODO: Actually reset somewhere
    this.player.reset();
    //this.clearPlayerShots();
    //this.clearEnemies();
    //this.clearEnemyShots();
    //this.clearPowerUps();

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

// TODO: These probably won't be necessary eventually
GameLayer.prototype.addPlayerShot = function (shot) {
    this.master.playerShots.addChild(shot);
};

GameLayer.prototype.removePlayerShot = function (shot) {
    this.master.playerShots.removeChild(shot);
};

GameLayer.prototype.addEnemy = function (enemy) {
    this.master.enemies.addChild(enemy);
};

GameLayer.prototype.removeEnemy = function (enemy) {
    this.master.enemies.removeChild(enemy);
};

GameLayer.prototype.addEnemyShot = function (shot) {
    this.master.enemyShots.addChild(shot);
};

GameLayer.prototype.removeEnemyShot = function (shot) {
    this.master.enemyShots.removeChild(shot);
};

GameLayer.prototype.addPowerUp = function (powerup) {
    this.master.powerups.addChild(powerup);
};

GameLayer.prototype.removePowerUp = function (powerup) {
    this.master.powerups.removeChild(powerup);
};

// TODO: It might be nice to have this also work while the mouse is outside the canvas...
GameLayer.prototype.mouseMoved = function (x, y) {
    this.playerCursor.setPosition(x, y);
};

// TODO: It would be nice to have shooting work while the mouse is outside the canvas...
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

GameLayer.prototype.checkPowerUpCollision = function (ship, powerup) {
    // Again, kind of odd logic here
    var distance = Math.abs(ship.x - powerup.x) + Math.abs(ship.y - powerup.y);
    return distance < ship.shipHeight / 2;
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


    // Ammunition and power-ups
    var level = new Level(this, waves);
    level.addPowerUps(0, totalTime + 9000 * 20);

    return level;
};

function ProgressBar(x, y, width, height, color) {
    Entity.call(this, x, y, width, height);
    this.bar = new Rectangle(-0.5, 0.5, 0, 1, color);
    this.elements = [new Rectangle(-0.5, 0.5, 1, 1, 'darkgray'), this.bar];
}

ProgressBar.prototype = Object.create(Entity.prototype);

ProgressBar.prototype.setProgress = function (progress) {
    this.bar.width = progress;
};

function LoadingLayer(loadPromise, start) {
    Layer.call(this);
    // TODO: This layer doesn't need to be constantly redrawn
    var bar = new ProgressBar(0, 0, 640, 100, 'gray');
    this.addEntity(bar);
    loadPromise.then(start, null, function (progress) {
        bar.setProgress(progress);
    });
}

LoadingLayer.prototype = Object.create(Layer.prototype);

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));

    // Pre-load images
    var loadPromise = Radius.images.load([
        'images/ammoBar0.png',
        'images/ammoBar1.png',
        'images/ammoBar2.png',
        'images/blink.png',
        'images/boss0.png',
        'images/bullet.png',
        'images/bulletExplosion.png',
        'images/bulletFlash.png',
        'images/electricity.png',
        'images/emp.png',
        'images/empExplosion.png',
        'images/empFlash.png',
        'images/enemyExplosion.png',
        'images/groundMetal.png',
        'images/groundMetalHighlight.png',
        'images/healthBar.png',
        'images/omni.png',
        'images/omniExplosion.png',
        'images/omniShot.png',
        'images/omniShotExplosion.png',
        'images/omniSpinner.png',
        'images/plasma.png',
        'images/plasmaExplosion.png',
        'images/plasmaFlash.png',
        'images/player.png',
        'images/playerShields.png',
        'images/playerSuperShields.png',
        'images/powerupAmmo.png',
        'images/powerupShadow0.png',
        'images/powerupShadow1.png',
        'images/powerupShadow2.png',
        'images/powerupShadow3.png',
        'images/powerupShadow4.png',
        'images/powerupShadow5.png',
        'images/powerupShield.png',
        'images/rayGun.png',
        'images/rayGunShot.png',
        'images/rayGunShotExplosion.png',
        'images/shieldBar.png',
        'images/statBackground.png',
        'images/statTop.png',
        'images/straight.png',
        'images/straightShot.png',
        'images/straightShotExplosion.png',
        'images/superShieldBar.png',
        'images/tankShot.png',
        'images/tankShotExplosion.png',
        'images/tankShotFlash.png',
    ]);

    Radius.start(new LoadingLayer(loadPromise, function () {
        Radius.pushLayer(new GameLayer());
    }));
});
