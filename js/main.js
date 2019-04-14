/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function Timer(period, f) {
    Entity.call(this);
    this.period = period;
    this.f = f;
    this.timer = 0;
}

Timer.prototype = Object.create(Entity.prototype);

Timer.prototype.update = function (ms) {
    this.timer += ms;
    if (this.timer >= this.period) {
        this.dead = true;
        this.f.call();
    }
};

// Random number generator (currently using Math.random())
function RandomDefault() {
}

RandomDefault.prototype.next = function () {
    return Math.random();
};

var random = new RandomDefault();

function Message(text, period) {
    Entity.call(this);
    this.timer = 0;
    this.opacity = 0;
    this.period = Message.fadeInPeriod + period;
    this.fadeOutPeriod = 2 * Message.fadeInPeriod + period;
    this.elements = [new Text(text, Message.font, 0, 0, 'center')];
}

Message.prototype = Object.create(Entity.prototype);
Message.font = '48px sans-serif';
Message.fadeInPeriod = 3000;

Message.prototype.update = function (ms) {
    if (this.timer < Message.fadeInPeriod) {
        // Fade in
        this.timer += ms;
        this.opacity = Math.min(1, this.timer / Message.fadeInPeriod);
    } else if (this.period !== undefined && this.timer < this.period) {
        // Persist
        this.timer += ms;
    } else if (this.period !== undefined && this.timer < this.fadeOutPeriod) {
        // Fade out
        this.timer += ms;
        this.opacity = Math.max(0, 1 - (this.timer - this.period) / Message.fadeInPeriod);
    }
};

function Burst(image, x, y, width1, height1, width2, height2, duration, delay, vx, vy, maxOpacity) {
    Entity.call(this, x, y, width1, height1);
    this.duration = duration;
    this.width1 = width1;
    this.height1 = height1;
    this.width2 = width2;
    this.height2 = height2;
    this.timer = delay ? -delay : 0;
    this.vx = vx || 0;
    this.vy = vy || 0;
    this.maxOpacity = maxOpacity || 1;
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
        this.opacity = this.maxOpacity * Math.min(1, 1.2 - this.timer / this.duration);

        // Update position
        this.x += this.vx * ms;
        this.y += this.vy * ms;

        // Flag for removal if done
        if (this.timer > this.duration) {
            this.dead = true;
        }
    } else {
        this.opacity = 0;
    }
};

function BurstTemplate(image, width1, height1, width2, height2, duration, delay, vx, vy, maxOpacity) {
    this.image = image;
    this.width1 = width1;
    this.height1 = height1;
    this.width2 = width2;
    this.height2 = height2;
    this.duration = duration;
    this.delay = delay;
    this.vx = vx;
    this.vy = vy;
    this.maxOpacity = maxOpacity;
}

BurstTemplate.prototype.instantiate = function (parent, x, y) {
    parent.addChild(new Burst(this.image, x, y, this.width1, this.height1, this.width2, this.height2, this.duration, this.delay, this.vx, this.vy, this.maxOpacity));
};

function PowerUp(image, shadowImage, use, master, x, y) {
    Entity.call(this, x, y, 34, 34);
    this.master = master;
    this.vy = -0.051;
    this.baseX = x;
    this.baseY = y;
    this.timer = 0;
    this.shadowImage = shadowImage;
    this.elements = [shadowImage, image];
    this.flashTemplate = new BurstTemplate(shadowImage, this.width, this.height, this.width / 5, this.height / 5, 500);
    this.use = function () {
        this.flashTemplate.instantiate(this.master.effects, this.x, this.y);
        AudioManager.play('powerup.mp3');
        use.call(this);
    };
}

PowerUp.weaponImage = new Image('images/powerupAmmo.png', 'white');
PowerUp.shieldImage = new Image('images/powerupShield.png', 'black');
PowerUp.ammo = 150;
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
    this.shadowImage.angle = 2 * Math.PI * random.next();
};

PowerUps = [
    function (master, x, y) {
        return new PowerUp(PowerUp.weaponImage, PowerUp.shadow0Image, function () {
            if (this.master.player) {
                this.master.player.ammo[0] = PowerUp.ammo;
                this.master.ammoCollected.fire();
            }
        }, master, x, y);
    },
    function (master, x, y) {
        return new PowerUp(PowerUp.weaponImage, PowerUp.shadow1Image, function () {
            if (this.master.player) {
                this.master.player.ammo[1] = PowerUp.ammo;
                this.master.ammoCollected.fire();
            }
        }, master, x, y);
    },
    function (master, x, y) {
        return new PowerUp(PowerUp.weaponImage, PowerUp.shadow2Image, function () {
            if (this.master.player) {
                this.master.player.ammo[2] = PowerUp.ammo;
                this.master.ammoCollected.fire();
            }
        }, master, x, y);
    },
    function (master, x, y) {
        return new PowerUp(PowerUp.shieldImage, PowerUp.shadow3Image, function () {
            if (this.master.player) {
                this.master.player.health = Player.maxHealth;
                this.master.healthCollected.fire();
            }
        }, master, x, y);
    },
    function (master, x, y) {
        return new PowerUp(PowerUp.shieldImage, PowerUp.shadow4Image, function () {
            if (this.master.player) {
                if (this.master.player.shields < Player.maxShields) {
                    this.master.player.shields = Player.maxShields;
                }

                this.master.shieldsCollected.fire();
            }
        }, master, x, y);
    },
    function (master, x, y) {
        return new PowerUp(PowerUp.shieldImage, PowerUp.shadow5Image, function () {
            if (this.master.player) {
                this.master.player.health = Player.maxHealth;
                this.master.player.shields = 2 * Player.maxShields;
                this.master.healthCollected.fire();
                this.master.shieldsCollected.fire();
            }
        }, master, x, y);
    },
];

function ExplosionTemplate(image, width, height, duration, delay) {
    BurstTemplate.call(this, image, 0, 0, width, height, duration, delay);
}

ExplosionTemplate.prototype = Object.create(BurstTemplate.prototype);

function ExplosionSequence(explosions) {
    this.explosions = explosions;
}

ExplosionSequence.prototype.instantiate = function (parent, x, y) {
    var count = this.explosions.length;
    for (var i = 0; i < count; i++) {
        // Each item is an array: ExplosionTemplate, [offsetX], [offsetY]
        var explosion = this.explosions[i];
        var template = explosion[0];
        var offsetX = explosion[1] || 0;
        var offsetY = explosion[2] || 0;
        template.instantiate(parent, x + offsetX, y + offsetY);
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
    // TODO: Couldn't the explosion templates be shared across all instances?
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

function GnatShot(x, y) {
    Shot.call(this, x, y, GnatShot.image, 13, 13, 0, -0.55, 6, new ExplosionTemplate(GnatShot.explosionImage, 113, 85, 10 * 20));
}

GnatShot.image = new Image('images/tankShotFlash.png', 'purple');
GnatShot.explosionImage = new Image('images/omniExplosion.png', 'purple');
GnatShot.prototype = Object.create(Shot.prototype);

function TankShot(x, y, vx, vy) {
    Shot.call(this, x, y, TankShot.image, 26, 26, (vx === undefined) ? 0 : vx, (vy === undefined) ? -1 : vy, 100, new ExplosionTemplate(TankShot.explosionImage, 97, 97, 10 * 20));
}

TankShot.image = new Image('images/tankShot.png', 'yellow');
TankShot.flashImage = new Image('images/tankShotFlash.png', 'purple');
TankShot.explosionImage = new Image('images/tankShotExplosion.png', 'orange');
TankShot.prototype = Object.create(Shot.prototype);

function Gun(master, host, x, y, period, periodRandomMax, shot, flashTemplate, warmupPeriod, elements) {
    Entity.call(this, x, y);
    this.master = master;
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
    var target = this.master.player;
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
    this.timer += this.period + this.periodRandomMax * random.next();
};

Gun.prototype.createShot = function () {
    return new this.shot(this.host.x + this.x, this.host.y + this.y);
};

Gun.prototype.fire = function () {
    var shot = this.createShot();

    // Add the appropriate kind of shot
    if (this.host instanceof Player) {
        this.master.addPlayerShot(shot);
    } else {
        this.master.addEnemyShot(shot);
    }

    // Add a flash, if provided
    if (this.flashTemplate) {
        this.flashTemplate.instantiate(this.master.effects, this.host.x + this.x, this.host.y + this.y);
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

AudioManager = {};

(function () {
    var clips = [];

    AudioManager.load = function (fileNames) {
        var count = fileNames.length;
        for (var i = 0; i < count; i++) {
            var fileName = fileNames[i];
            clips[fileName] = new AudioClip('sounds/' + fileName, true);
        }
    };

    AudioManager.play = function (fileName) {
        var clip = clips[fileName];
        if (clip) {
            clip.play();
        }
    };
})();

function AudioEffect(fileName, delay) {
    Entity.call(this);
    this.timer = 0;
    this.fileName = fileName;
    this.delay = delay;
}

AudioEffect.prototype = Object.create(Entity.prototype);

AudioEffect.prototype.update = function (ms) {
    this.timer += ms;
    if (this.timer >= this.delay) {
        AudioManager.play(this.fileName);
        this.dead = true;
    }
};

function AudioTemplate(effects) {
    this.effects = effects;
}

AudioTemplate.prototype.instantiate = function (parent) {
    var count = this.effects.length;
    for (var i = 0; i < count; i++) {
        var effect = this.effects[i];
        var fileName = effect[0];
        var delay = effect[1];
        if (delay) {
            // Schedule the clip to play later
            parent.addChild(new AudioEffect(fileName, delay));
        } else {
            // No delay, so play the clip now
            AudioManager.play(fileName);
        }
    }
};

function Ship(master, x, y, shipWidth, shipHeight, health, mass, explosionTemplate, explosionAudioTemplate) {
    Entity.call(this, x, y);
    this.shipWidth = shipWidth;
    this.shipHeight = shipHeight;
    this.mass = mass;
    this.master = master;
    this.health = health;
    this.explosionTemplate = explosionTemplate;
    this.explosionAudioTemplate = explosionAudioTemplate;
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

Ship.prototype.playExplosionSoundEffects = function (parent) {
    if (this.explosionAudioTemplate) {
        this.explosionAudioTemplate.instantiate(parent);
    }
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
        this.angle = 2 * Math.PI * random.next();
    }
};

function PlayerSuperShields(player) {
    Entity.call(this);
    this.player = player;
    this.elements = [PlayerSuperShields.image];
    this.opacity = 0;
    this.timer = 0;
    this.sparkleTemplate = new BurstTemplate(PlayerSuperShields.sparkleImage, 22, 22, 22, 22, 20 * 20, 0, 0, -0.2);
}

PlayerSuperShields.maxOpacity = 0.9;
PlayerSuperShields.sparklePeriod = 40;
PlayerSuperShields.sparkleImage = new Image('images/sparkle.png', 'yellow');
PlayerSuperShields.image = new Image('images/playerSuperShields.png', 'blue', -PlayerShields.shieldWidth / 2, PlayerShields.shieldHeight / 2, PlayerShields.shieldWidth, PlayerShields.shieldHeight);
PlayerSuperShields.prototype = Object.create(Entity.prototype);

PlayerSuperShields.prototype.update = function (ms) {
    this.opacity = Math.max(0, (this.player.shields - Player.maxShields) / Player.maxShields);
    if (this.opacity > 0) {
        this.angle = 2 * Math.PI * random.next();

        // Add sparkles
        this.timer += ms;
        while (this.timer >= PlayerSuperShields.sparklePeriod) {
            var angle = random.next() * 2 * Math.PI;
            var distance = PlayerShields.shieldWidth / 2;
            var x = this.player.x + distance * Math.cos(angle);
            var y = this.player.y + distance * Math.sin(angle);
            this.sparkleTemplate.maxOpacity = this.opacity;
            this.sparkleTemplate.instantiate(this.player.master.effects, x, y);
            this.timer -= PlayerSuperShields.sparklePeriod;
        }
    } else {
        this.timer = 0;
    }
};

function Player(master) {
    Ship.call(this, master, 0, 0, Player.shipWidth, Player.shipHeight, 0, 100,
        new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20)],
            [new ExplosionTemplate(PowerUp.shadow2Image, 64, 64, 1000)],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20, 10 * 20)],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20, 13 * 20)],
        ]),
        new AudioTemplate([['explosionBig.mp3']]));

    this.healthLost = new Event();

    this.shieldImage = new PlayerShields();
    this.superShieldImage = new PlayerSuperShields(this);
    this.elements = [Player.image, Player.exhaustImage];

    // Movement
    this.movingLeft = false;
    this.movingRight = false;
    this.movingUp = false;
    this.movingDown = false;

    // Weapons
    var defaultGun = [
        new Gun(master, this, 9, 10, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
        new Gun(master, this, -9, 10, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
    ];
    var machineGun = [
        new Gun(master, this, 14, -5, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
        new Gun(master, this, -14, -5, 100, 0, Bullet, new ExplosionTemplate(Bullet.flashImage, 14, 14, 3 * 20)),
    ];
    var plasma = [
        new Gun(master, this, 0, 10, 500, 0, Plasma, new ExplosionTemplate(Plasma.flashImage, 28, 28, 10 * 20)),
    ];
    var emp = [
        new Gun(master, this, -20, -10, 200, 0, Emp, new ExplosionTemplate(Emp.flashImage, 28, 28, 5 * 20)),
        new Gun(master, this, 20, -10, 200, 0, Emp, new ExplosionTemplate(Emp.flashImage, 28, 28, 5 * 20), 100)
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
Player.keyboardSpeed = Player.mouseSpeed / 3;
Player.movementThreshold = 0.5;
Player.prototype = Object.create(Ship.prototype);
Player.boundX = 284;
Player.boundY = 213;

Player.prototype.reset = function () {
    // Set starting health, shields, and ammo
    this.health = Player.maxHealth;
    this.shields = 0;
    var count = this.ammo.length;
    for (var i = 0; i < count; i++) {
        this.ammo[i] = 0;
    }

    // Reset position
    this.cursorX = 0;
    this.cursorY = -Player.boundY;
    this.targetX = this.cursorX;
    this.targetY = this.cursorY;
    this.offsetX = 0;
    this.offsetY = 0;

    // Reset guns
    count = this.guns.length;
    for (i = 0; i < count; i++) {
        this.guns[i].reset();
    }
};

Player.prototype.setFiring = function (firing) {
    var count = this.guns.length;
    for (var i = 0; i < count; i++) {
        this.guns[i].setFiring(firing);
    }
};

Player.prototype.setMovingLeft = function (pressed) {
    this.movingLeft = pressed;
};

Player.prototype.setMovingRight = function (pressed) {
    this.movingRight = pressed;
};

Player.prototype.setMovingUp = function (pressed) {
    this.movingUp = pressed;
};

Player.prototype.setMovingDown = function (pressed) {
    this.movingDown = pressed;
};

Player.prototype.takeDamage = function (damage) {
    if (this.shields) {
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

    // Move based on keyboard input
    var moveX = 0;
    var moveY = 0;
    moveX += (this.movingLeft ? -1 : 0);
    moveX += (this.movingRight ? 1 : 0);
    moveY += (this.movingUp ? 1 : 0);
    moveY += (this.movingDown ? -1 : 0);
    if (moveX || moveY) {
        var distance = ms * Player.keyboardSpeed;
        var angle = Math.atan2(moveY, moveX);
        this.targetX += distance * Math.cos(angle);
        this.targetY += distance * Math.sin(angle);

        // Boundaries
        this.targetX = Math.max(-Player.boundX, Math.min(Player.boundX, this.targetX));
        this.targetY = Math.max(-Player.boundY, Math.min(Player.boundY, this.targetY));

        // Set the cursor position to here so that any previous mouse input will be ignored
        this.setCursorPosition(this.targetX, this.targetY);

        // Hide the mouse cursor since we're using keyboard input for now (the next mouse input will switch it back)
        this.master.playerCursor.setVisible(false);
    }

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

function Enemy(master, x, y, shipWidth, shipHeight, speed, health, mass, guns, explosionTemplate, explosionAudioTemplate) {
    Ship.call(this, master, x, y, shipWidth, shipHeight, health, mass, explosionTemplate, explosionAudioTemplate);
    // TODO: It seems like bounds should be based on size...
    this.x = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, x));
    this.speed = speed;
    this.target = master.player;
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

function Straight(master, x, y) {
    Enemy.call(this, master, x, y, Straight.shipWidth, Straight.shipHeight, 0.065 + random.next() * 0.0569, 110, 200,
        [new Gun(master, this, 0, -26, 30 * 20, 90 * 20, StraightShot, undefined, 30 * 20 + 90 * 20 * random.next(), [Straight.chargeImage])],
        new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20)],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), 3, 9],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), -6, , -11],
            [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20, 15 * 20)]
        ]),
        new AudioTemplate([['explosion.mp3']]));
    this.elements = [Straight.image];
}

Straight.shipWidth = 43;
Straight.shipHeight = 58;
Straight.image = new Image('images/straight.png', 'gray', -Straight.shipWidth / 2, Straight.shipHeight / 2, Straight.shipWidth, Straight.shipHeight);
Straight.chargeWidth = 16;
Straight.chargeHeight = 16;
Straight.chargeImage = new Image('images/straightShot.png', 'red', -Straight.chargeWidth / 2, Straight.chargeHeight / 2, Straight.chargeWidth, Straight.chargeHeight);
Straight.prototype = Object.create(Enemy.prototype);

function OmniGun(master, host, x, y, warmupPeriod) {
    Gun.call(this, master, host, x, y, 108 * 20, 0, OmniShot, undefined, warmupPeriod);
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

function Omni(master, x, y) {
    var guns = [];
    for (var i = 0; i < 18; i++) {
        guns.push(new OmniGun(master, this, 0, 0, i * 20));
    }

    Enemy.call(this, master, x, y, Omni.shipWidth, Omni.shipHeight, 0.1 + 0.057 * random.next(), 45, 143, guns, new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20)],
            [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 20 * 20, 3 * 20)],
            [new ExplosionTemplate(Omni.explosionImage, 114, 85, 10 * 20)]
    ]),
    new AudioTemplate([['explosionBig.mp3']]));

    this.movementFactor = random.next();
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

function RayGun(master, x, y) {
    Enemy.call(this, master, x, y, RayGun.shipWidth, RayGun.shipHeight, 0.043, 1000, 500,
        [new Gun(master, this, 0, -31, 20, 0, RayGunShot)],
        new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77)],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), 3, 9],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), -6, , -11],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 5 * 20), 16],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 15 * 20), -14, 6],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 20 * 20)],
            [new ExplosionTemplate(Enemy.explosionImage, 57, 57, 30 * 20)]
        ]),
        new AudioTemplate([
        ['explosion.mp3'],
        ['explosionBig.mp3']
        ]));
    this.elements = [RayGun.image];
    this.timer = 0;
    this.movementFactor = 0.5 + random.next() / 2;
    this.lastMoveX = 0;
    this.lastMoveY = 0;
    this.limitY = -640;
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

    if (this.targetY > this.limitY) {
        this.targetY += this.lastMoveY - this.speed * ms;
    }

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

function RayGunBoss(master, x, y) {
    RayGun.call(this, master, x, y);
    this.limitY = 0;
}
RayGunBoss.prototype = Object.create(RayGun.prototype);

function Gnat(master, x, y, moveTarget) {
    Enemy.call(this, master, x, y, Gnat.shipWidth, Gnat.shipHeight, 0.14, 10, 1,
        [new Gun(master, this, 0, -7, 1 * 20, 5 * 20, GnatShot)],
        new ExplosionSequence([
            [new ExplosionTemplate(Omni.explosionImage, 114, 85, 10 * 20)]
        ]),
        new AudioTemplate([['explosionBig.mp3']]));
    this.elements = [Gnat.image];
    this.timer = 0;
    this.randMoveX = 0.5 + 0.5 * random.next();
    this.vx = 0.2;
    this.vy = 0.1;
    this.moveTarget = moveTarget ? moveTarget : this.target;
}

Gnat.shipWidth = 26;
Gnat.shipHeight = 26;
Gnat.image = new Image('images/gnat.png', 'purple', -Gnat.shipWidth / 2, Gnat.shipHeight / 2, Gnat.shipWidth, Gnat.shipHeight);
Gnat.prototype = Object.create(Enemy.prototype);

Gnat.prototype.updateGuns = function (ms) {
    if (this.target) {
        var deltaX = this.target.x - this.targetX;
        var deltaY = this.target.y - this.targetY;
        this.guns[0].setFiring(Math.abs(deltaX) < 57 && deltaY < 0);
    } else {
        this.guns[0].setFiring(false);
    }
};

Gnat.prototype.updateTargetLocation = function (ms) {
    this.timer += ms / 20;

    // Change target to the player after a delay
    if (this.timer > 272) {
        this.moveTarget = this.target;
    }

    // Note: This uses a different coordinate system right up until the end...
    // TODO: Rerwrite this...
    var deltaX = 0;
    var deltaY = 0;
    var randX;
    if (this.moveTarget) {
        deltaX = (this.moveTarget.x - this.targetX) / 640 * 22.51;
        deltaY = (this.moveTarget.y - this.targetY) / 480 * 16.88;
        randX = this.randMoveX;
    } else {
        randX = 0.75 + 0.15 * random.next();
    }

    var s = 3.8;
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) * randX;
    var d = 0.4 + 0.6 * ((distance + 0.2 * Math.sin(this.timer * 0.001)) / s);
    var speed = d * 0.25 * randX;
    var x = speed * (deltaX / distance);
    var y = speed * (deltaY / distance);

    if (distance < s) {
        x = x * d - (1 - d) * deltaY / d;
        y = y * d + (1 - d) * deltaX / d;
        // TODO: Should be overall timer here, actually
        y += 0.01 * Math.sin(this.timer * 0.001);
    } else {
        d = 0.97;
        if (randX < 0.65) {
            x = x * d + (1 - d) * deltaY / d;
            y = y * d - (1 - d) * deltaX / d;
        } else {
            x = x * d - (1 - d) * deltaY / d;
            y = y * d + (1 - d) * deltaX / d;
        }
    }

    var tmp = randX * 0.2;
    var vx;
    if (Math.floor(this.timer / 8) % 2) {
        vx = this.vx * (0.85 - tmp) + (0.2 + tmp) * (randX - 0.2) * x;
    } else {
        vx = this.vx;
    }
    vy = this.vy * (0.85 - tmp) + (0.2 + tmp) * (randX - 0.2) * y;

    if (this.timer < 50) {
        var amount = (this.timer > 20) ? (this.timer - 20) / 30 : 0;
        this.vx = (1 - amount) * this.vx + amount * vx;
        this.vy = (1 - amount) * this.vy + amount * vy;
    } else {
        this.vx = vx;
        this.vy = vy;
    }

    // Convet back to normal coordinates and milliseconds
    this.targetX += this.vx * 640 / 22.51 * ms / 20;
    this.targetY += this.vy * 480 / 16.88 * ms / 20;

    // Horizontal bounds
    this.targetX = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, this.targetX));
};

function TankGun(master, host, x, y, warmupPeriod) {
    Gun.call(this, master, host, x, y, 10 * 20, 0, TankShot, undefined, warmupPeriod);
    this.speed = 1;
}

TankGun.prototype = Object.create(Gun.prototype);
TankGun.prototype.createShot = Gun.createAimedShot;

function Tank(master, x, y) {
    // TODO: Guns
    this.straightGuns = [
        new Gun(master, this, 43, -48, 3 * 20, 0, StraightShot),
        new Gun(master, this, -43, -48, 3 * 20, 0, StraightShot)
    ];
    this.tankGun = new TankGun(master, this, 0, -15);

    var guns = [this.tankGun]
    guns.concat(this.straightGuns);

    Enemy.call(this, master, x, y, Tank.shipWidth, Tank.shipHeight, 0.043, 2000, 1000, guns, new ExplosionSequence([
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77)],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), 3, 9],
            [new ExplosionTemplate(Enemy.explosionImage, 50, 50, 30 * 20), -6, , -11],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 5 * 20), 16],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 15 * 20), -14, 6],
            [new ExplosionTemplate(Enemy.explosionImage, 77, 77, 20 * 20)]
    ]),
    new AudioTemplate([['explosionBig.mp3']]));

    this.elements = [Tank.image, this.chargeImage = new Image('images/tankCharge.png', 'purple', -28, 13, 56, 56, 0)];
    this.timer = 0;
    this.shootSwap = 0;
    this.steps = 0;
    this.prefire = 0;
    this.lastMoveY = 0;
}

Tank.shipWidth = 108;
Tank.shipHeight = 119;
Tank.image = new Image('images/tank.png', 'gray', -Tank.shipWidth / 2, Tank.shipHeight / 2, Tank.shipWidth, Tank.shipHeight);
Tank.prototype = Object.create(Enemy.prototype);

Tank.prototype.updateGuns = function (ms) {
    this.timer += ms;
    if (this.y < 240 && this.target) {
        var deltaX = this.target.x - this.x;

        // Straight guns are fired when near the player
        if (Math.abs(deltaX) < 114) {
            // TODO: This should be done in the loop below, but it only matters with a really low framerate
            if (this.shootSwap === 0 || this.shootSwap === 8 || this.shootSwap === 16) {
                this.straightGuns[0].fire();
                this.straightGuns[1].fire();
            }
            this.shootSwap++;
            this.shootSwap %= 100;
        }

        // Handle guns that are controlled by frame count
        var nextStep = Math.floor(this.timer / 20);
        for (; this.steps < nextStep; this.steps++) {
            if (Math.floor(this.steps / 200) % 2 === 1) {
                var index = this.steps % 200;
                if (index < 100) {
                    this.prefire = index / 100;
                } else if (index < 170) {
                    if (this.steps % 10 === 0) {
                        // TODO: Aim
                        this.tankGun.fire();
                        this.prefire = Math.max(0, this.prefire - 0.4);
                    } else {
                        this.prefire += 0.035;
                    }
                } else {
                    this.prefire = 0;
                }
            }
        }

        this.chargeImage.opacity = this.prefire;
    }
}

Tank.prototype.updateTargetLocation = function (ms) {
    this.timer += ms;
    if (this.target) {
        var deltaX = this.target.x - this.targetX;
        var deltaXMagnitude = Math.abs(deltaX);
        var speed = 0.057;
        if (deltaXMagnitude < 227) {
            speed *= deltaXMagnitude / 227;
        }

        // Adjust slowly
        this.speed = 0.99 * this.speed + 0.01 * speed;

        // Adjust speed based on vertical position
        if (this.targetY < 0) {
            this.speed = 0;
        } else if (this.targetY < 85) {
            this.speed *= 0.99;
        }

        // Adjust horizontal position a small amount
        this.targetX += 20 / 1000 * Math.sin(this.timer / 10000 * Math.PI) * ms;
    }

    this.targetY += this.lastMoveY - this.speed * ms;

    // Horizontal bounds
    this.targetX = Math.max(-Enemy.boundX, Math.min(Enemy.boundX, this.targetX));
};

function createBossExplosion(width, height) {
    var explosions = [];
    var explosionDuration = 1500;
    var explosionFrequency = 5;

    explosions.push([new ExplosionTemplate(Enemy.explosionImage, width, width, explosionDuration, i)]);

    for (var i = 0; i < explosionDuration; i += explosionFrequency) {
        var size = (random.next() / 2 + 0.5) * width;
        explosions.push([new ExplosionTemplate(Enemy.explosionImage, size, size, 20 * 20, i), (random.next() - 0.5) * width, (random.next() - 0.5) * height]);

        // Decrease frequency over time
        explosionFrequency *= 1.1;
    }

    return explosions;
}

function Boss0(master, x, y) {
    // Create guns
    this.rayGun = new Gun(master, this, 0, -48, 20, 0, RayGunShot);
    this.straightGuns = [
        new Gun(master, this, 57, -54, 3 * 20, 0, StraightShot),
        new Gun(master, this, 68, -54, 3 * 20, 0, StraightShot),
        new Gun(master, this, 79, -54, 3 * 20, 0, StraightShot),
        new Gun(master, this, -57, -54, 3 * 20, 0, StraightShot),
        new Gun(master, this, -68, -54, 3 * 20, 0, StraightShot),
        new Gun(master, this, -79, -54, 3 * 20, 0, StraightShot)
    ];
    this.omniGuns = [
        new Gun(master, this, 31, -13, 50 * 20, 0, OmniShot),
        new Gun(master, this, -31, -13, 50 * 20, 0, OmniShot)
    ];
    this.tankGuns = [
        new Gun(master, this, -31, -13, 10 * 20, 0, TankShot, new ExplosionTemplate(TankShot.flashImage, 28, 28, 10 * 20)),
        new Gun(master, this, 31, -13, 10 * 20, 0, TankShot, new ExplosionTemplate(TankShot.flashImage, 28, 28, 10 * 20))
    ];
    var guns = [this.rayGun];
    guns.concat(this.straightGuns, this.omniGuns, this.tankGuns);

    // Create explosion sequence
    var explosions = createBossExplosion(Boss0.shipWidth, Boss0.shipHeight);

    Enemy.call(this, master, x, y, Boss0.shipWidth, Boss0.shipHeight, 0.028, 10000, 2000, guns, new ExplosionSequence(explosions), new AudioTemplate([
        ['explosionHuge.mp3'],
        ['explosion.mp3', 200],
        ['explosion.mp3', 600],
        ['explosion.mp3', 800],
        ['explosionBig.mp3', 1000]
    ]));

    this.moveTimer = 0;
    this.lastMoveX = 0;
    this.lastMoveY = 0;

    this.timer = 0;
    this.steps = 0;
    this.straightCounter = 0;
    this.ammoSpeed = 0.5;
    this.omniV = [0, -this.ammoSpeed];
    this.prefire = 0;
    this.chargeImages = [];
    this.chargeImages[0] = new Image('images/tankCharge.png', 'purple', -59, 15, 56, 56, 0);
    this.chargeImages[1] = new Image('images/tankCharge.png', 'purple', 3, 15, 56, 56, 0);
    this.elements = [Boss0.image].concat(this.chargeImages);

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
                    this.prefire = (this.steps % 100) / 100;
                } else if (this.steps % 10 === 0) {
                    // Fire tank guns
                    this.tankGuns[0].fire();
                    this.tankGuns[1].fire();
                    this.prefire = Math.max(0, this.prefire - 0.4);
                } else {
                    this.prefire += 0.035;
                }
            } else {
                this.prefire = Math.max(0, this.prefire - 0.02);
            }
        }

        this.chargeImages[0].opacity = this.prefire;
        this.chargeImages[1].opacity = this.prefire;
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

        deltaX += 143 * Math.sin(this.moveTimer * 0.005);

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

function Boss1(master, x, y) {
    // Create guns
    this.straightGunsA = [
        new Gun(master, this, 16, -34, 3 * 20, 0, StraightShot),
        new Gun(master, this, 16, -48, 3 * 20, 0, StraightShot),
    ];
    this.straightGunsB = [
        new Gun(master, this, -35, -35, 3 * 20, 0, StraightShot),
        new Gun(master, this, -35, -20, 3 * 20, 0, StraightShot),
    ];
    var guns = [];
    guns.concat(this.straightGunsA, this.straightGunsB);

    // Create explosion sequence
    var explosions = createBossExplosion(Boss1.shipWidth, Boss1.shipHeight);

    Enemy.call(this, master, x, y, Boss1.shipWidth, Boss1.shipHeight, 0.028, 10000, 1000, guns, new ExplosionSequence(explosions), new AudioTemplate([
        ['explosionHuge.mp3'],
        ['explosion.mp3', 200],
        ['explosion.mp3', 600],
        ['explosion.mp3', 800],
        ['explosionBig.mp3', 1000]
    ]));

    this.moveTimer = 0;
    this.lastMoveX = 0;
    this.lastMoveY = 0;

    this.timer = 0;
    this.steps = 0;
    this.straightCounter = 0;
    this.shootSwap = false;
    this.elements = [Boss1.image];
}

Boss1.shipWidth = 148;
Boss1.shipHeight = 131;
Boss1.image = new Image('images/boss1.png', 'cyan', -Boss1.shipWidth / 2, Boss1.shipHeight / 2, Boss1.shipWidth, Boss1.shipHeight);
Boss1.prototype = Object.create(Enemy.prototype);

Boss1.prototype.updateGuns = function (ms) {
    this.timer += ms;
    if (this.y < 240 && this.target) {
        var deltaX = this.target.x - this.x;
        var near = Math.abs(deltaX) < 142;

        // Handle guns that are controlled by frame count
        var nextStep = Math.floor(this.timer / 20);
        for (; this.steps < nextStep; this.steps++) {
            if (near) {
                if (this.steps % 6 === 0) {
                    this.shootSwap = !this.shootSwap;
                    if (this.shootSwap) {
                        this.straightGunsA[0].fire();
                        this.straightGunsA[1].fire();
                    } else {
                        this.straightGunsB[0].fire();
                        this.straightGunsB[1].fire();
                    }
                }
            }

            if (this.steps > 600) {
                var shitedSteps = this.steps - 600;
                if (Math.floor(shitedSteps / 512) % 2 === 0) {
                    if (Math.floor(shitedSteps / 128) % 2 === 0 && shitedSteps % 20 === 0) {
                        // Put an upper limit on the number of gnats to release
                        if (this.master.getEnemyCount() < 25) {
                            // Release a gnat
                            var x = this.x + 48;
                            var y = this.y + 34;
                            this.master.addEnemy(new Gnat(this.master, x, y, this));
                        }
                    }
                }
            }
        }
    }
};

Boss1.prototype.updateTargetLocation = function (ms) {
    this.moveTimer += ms;
    if (this.target) {
        var deltaX = this.target.x - this.x;
        var deltaY = this.target.y - this.y;
        var approach = 256;

        if (Math.abs(deltaY) < (approach + 57 * Math.sin(this.moveTimer * 0.0025))) {
            deltaY *= deltaY / approach;
        }

        deltaX += 143 * Math.sin(this.moveTimer * 0.005);

        // Adjust movement slowly
        // TODO: Slow down movement when gnats are being added?
        this.lastMoveX *= 0.98;
        this.lastMoveX += (0.001 * deltaX);
        this.lastMoveY *= 0.9;
        this.lastMoveY += 0.002 * deltaY;

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

    circuit: {
        image: new Image('images/groundCircuit.png', 'DarkGray'),
        segmentWidth: 320,
        segmentHeight: 320,
        vy: -0.048
    },

    pcb: {
        image: new Image('images/groundPCB.png', 'DarkGray'),
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

function GroundSegment(template, x, y, width, height, totalHeight, flipOnReset) {
    Entity.call(this, x, y, width, height);
    this.template = template;
    this.elements = [template.image];
    this.totalHeight = totalHeight;
    this.flipOnReset = flipOnReset;
}

GroundSegment.prototype = Object.create(Entity.prototype);

GroundSegment.prototype.update = function (ms) {
    this.y += this.template.vy * ms;
    if (this.y <= -240 - this.template.segmentHeight / 2) {
        this.y += this.totalHeight;

        // Change the image, if previously queued
        if (this.nextImage) {
            this.elements[0] = this.nextImage;
            this.nextImage = null;
        }

        // Flip, if necessary
        if (this.flipOnReset) {
            this.height = -this.height;
        }
    }
};

GroundSegment.prototype.queueImageChange = function (image) {
    this.nextImage = image;
};

function Ground(template) {
    Entity.call(this);

    var scaleY = 1;
    var screenHeight = 480;
    var y = -screenHeight / 2;
    var rows = Math.ceil(screenHeight / template.segmentHeight) + 1;
    var totalHeight = rows * template.segmentHeight;

    // If there's an uneven number, they'll need to alternate each time they reset to the top
    var flipOnReset = !!(rows % 2);

    var screenWidth = 640;
    var columns = Math.ceil(screenWidth / template.segmentWidth);

    for (var i = 0; i < rows; i++) {
        var scaleX = 1;
        var x = -screenWidth / 2 + template.segmentWidth / 2;
        for (var j = 0; j < columns; j++) {
            this.addChild(new GroundSegment(template, x, y + template.segmentHeight / 2, scaleX * template.segmentWidth, scaleY * template.segmentHeight, totalHeight, flipOnReset));
            scaleX = -scaleX;
            x += template.segmentWidth;
        }

        // Flip the next row
        scaleY = -scaleY;
        y += template.segmentHeight;
    }
}

Ground.prototype = Object.create(Entity.prototype);

Ground.prototype.queueTemplateChange = function (templateName) {
    var image = GroundTemplates[templateName].image;
    this.forEachChild(function (child) {
        child.queueImageChange(image);
    });
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
function Level(master, groundTemplate, waves) {
    this.master = master;
    this.groundTemplate = groundTemplate;
    this.queue = new OrderedQueue(function compareAction(a, b) { return a.time - b.time; });
    this.timer = 0;
    this.endTime = 0;
    var count = waves.length;
    for (var i = 0; i < count; i++) {
        var wave = waves[i];
        wave.factory.call(this, wave.start, wave.duration, wave.density);
    }
}

Level.prototype.addAction = function (action, isEnemy) {
    this.queue.insert(action);

    // Keep track of the last enemy (plus a little bit of buffer)
    if (isEnemy) {
        this.endTime = Math.max(this.endTime, action.time + 1000);
    }
};

Level.prototype.addEnemy = function (enemy) {
    this.addAction(enemy, true);
};

Level.prototype.addPowerUp = function (powerup) {
    this.addAction(powerup, false);
};

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
    this.addWave(Omni, start, end, (random.next() * 2 - 1) * 227, undefined, frequency, 5 * 20, xRand, undefined);
    end = start + duration;
    this.addWave(Omni, start + (duration / 2) - 50 * 20, end, (random.next() * 2 - 1) * 227, undefined, frequency, 5 * 20, xRand, undefined);

    // And a straight wave
    xRand = 8;
    frequency = 200 * 50;
    this.addWave(Straight, start + 100 * 20, end, undefined, undefined, frequency, 50 * 20, xRand, undefined);
};

Level.prototype.addStraightArrowWave = function (start, duration, density) {
    // Add a straight arrow wave
    var frequency = 50 / density * 20;
    var end = start + 130 * 20;
    var c = (random.next() * 2 - 1) / 22.51 * 640;
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
    var c = (random.next() * 2 - 1) * 2 / 22.51 * 640;
    var xRand = 1;
    this.addWave(Omni, start + 50 * 20, start + 150 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);

    this.addWave(Omni, start + 250 * 20, start + 320 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);
    this.addWave(Omni, start + 300 * 20, start + 330 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);
    this.addWave(Omni, start + 350 * 20, start + 470 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);

    frequency = 5 / density * 20;
    xRand = 1.8;
    this.addWave(Omni, start + 550 * 20, start + 555 * 20, c, undefined, frequency, 0, xRand, undefined, Wave.formation.arrow);
};

Level.prototype.addMixedGnatWave = function (start, duration, density) {
    var frequency = 1 / density * 20;
    var end = start + 130 * 20;
    var c = (random.next() * 2 - 1) * 2 / 22.51 * 640;
    var xRand = 1;

    if (random.next() > 0.5) {
        this.addWave(Straight, start + 50 * 20, start + duration, c, undefined, 90 * frequency, 0, xRand);
    } else {
        this.addWave(Omni, start + 50 * 20, start + 130 * 20, c, undefined, 20 * frequency, 0, 1.1, undefined, Wave.formation.arrow);
        this.addWave(Straight, start + 200, start + 250* 20, c, undefined, 50 * frequency, 0, 1.1, undefined, Wave.formation.arrow);
        this.addWave(Omni, start + 320 * 20, start + 400 * 20, c, undefined, 20 * frequency, 0, 1.1, undefined, Wave.formation.arrow);
    }

    this.addWave(Gnat, start, start + 17 * 20, c, undefined, 3 * frequency, 0, 3);
};

Level.prototype.addGnatWave = function (start, duration, density) {
    // Add omni arrow waves
    var frequency = 1 / density * 20;
    var c = (random.next() * 2 - 1) * 2 / 22.51 * 640;
    var xRand = 3;

    this.addWave(Gnat, start, start + 35 * 20, c, undefined, 2 * frequency, 0, 3);
    this.addWave(Gnat, start + 300 * 20, start + 310 * 20, c, undefined, 2 * frequency, 0, 3);
    this.addWave(Gnat, start + 300 * 20, start + 400 * 20, c, undefined, 30 * frequency, 0, 3);
};

Level.prototype.addRayGunWave = function (start, duration) {
    var end = start + duration;
    this.addWave(RayGun, start, end, undefined, undefined, 2000 * 20, 1000 * 20, 8);
};

Level.prototype.addTankWave = function (start, duration) {
    this.addWave(Tank, start, start + 100, undefined, undefined, 200, 0, 8, 0);
};

Level.createBossWaveFactory = function (enemy) {
    return function (start) {
        this.addWave(enemy, start, start + 100, undefined, undefined, 200, 0, 0, 0);
    }
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
                x = waveX + xJitter * (random.next() * 2 - 1);
                break;

            case Wave.formation.arrow:
                // TODO: It looks like the original tried to make an arrow but really only made a line... change it?
                // TODO: Double-check this one--it seems like all the enemies show up at once which seems wrong
                x = waveX - xJitter * iteration;
                break;
        }

        this.addEnemy(new LevelAction(factory, t, x, waveY));
        t += frequency + fJitter * (random.next() * 2 - 1);
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
        var t = start + firsts[j] + randomModifiers[j] * random.next();
        while (t < start + duration) {
            this.addPowerUp(new LevelAction(PowerUps[j], t, 227 * (2 * random.next() - 1), Master.boundY));
            t += frequencies[j] + (random.next() - 0.5) * randomModifiers[j] * 2;
        }
    }
};

Level.prototype.update = function (ms) {
    this.timer += ms;
    var action;
    while ((action = this.queue.first()) && this.timer >= action.time) {
        action = this.queue.remove();
        // TODO: It would probably be better to move this logic into a generic "add item" in the layer itself
        var item = new action.factory(this.master, action.x, action.y);
        if (item instanceof Enemy) {
            this.master.addEnemy(item);
        } else if (item instanceof PowerUp) {
            this.master.addPowerUp(item);
        }
    }

    // Check to see if the level is complete (i.e. all enemies have been added)
    if (!this.complete && this.timer > this.endTime) {
        this.complete = true;
    }
};

var Levels = {};

Levels.loadLevel1 = function (master) {
    var totalTime = 60000;
    var waveDuration = 400;
    var time = 400 * 20;
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
        var r = random.next();

        // Pick the type of wave
        var factory;
        if (r < 0.7) {
            factory = Level.prototype.addStraightWave;
        } else {
            factory = Level.prototype.addOmniWave;
        }

        waves.push({
            factory: factory,
            start: time,
            duration: waveDuration,
            density: density
        });

        time += waveDuration;
        waveDuration = (600 + 100 * (random.next() * 2 - 1)) * 20;

        // Put a little delay between waves
        time += (50 + 50 * random.next()) * 20;
    }

    // Boss
    waves.push({
        factory: Level.createBossWaveFactory(RayGunBoss),
        start: totalTime + 75 * 20,
        duration: 0
    });


    // Ammunition and power-ups
    var level = new Level(master, 'metal', waves);
    level.addPowerUps(0, totalTime + 9000 * 20);

    return level;
};

Levels.loadLevel2 = function (master) {
    var totalTime = 120000;
    var waveDuration = 500;
    var time = 50 * 20;
    var waves = [];

    while (time < totalTime - 1000 * 20) {
        // Scale up the density as time goes on
        var density = (time < 1500 * 20 ? (time + 250 * 20) / (2000 * 20) : 1);
        var r = random.next();

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
        waveDuration = (600 + 100 * (random.next() * 2 - 1)) * 20;

        // Put a little delay between waves
        time += (50 + 50 * random.next()) * 20;
    }

    // Boss
    waves.push({
        factory: Level.createBossWaveFactory(Tank),
        start: totalTime + 75 * 20,
        duration: (1000 - 75) * 20
    });


    // Ammunition and power-ups
    var level = new Level(master, 'metal', waves);
    level.addPowerUps(0, totalTime + 9000 * 20);

    return level;
};

Levels.loadLevel3 = function (master) {
    var totalTime = 12000 * 20;
    var waveDuration = 500;
    var time = 50 * 20;
    var waves = [];

    while (time < totalTime - 1000 * 20) {
        // Scale up the density as time goes on
        var density = (time < 1500 * 20 ? (time + 250 * 20) / (2000 * 20) : 1);
        var r = random.next();

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
        waveDuration = (600 + 100 * (random.next() * 2 - 1)) * 20;

        // Put a little delay between waves
        time += (50 + 50 * random.next()) * 20;
    }

    // Ray gun starts half way through
    waves.push({
        factory: Level.prototype.addRayGunWave,
        start: totalTime / 2,
        duration: totalTime - 1000 * 20 - totalTime / 2
    });

    // Boss
    waves.push({
        factory: Level.createBossWaveFactory(Boss0),
        start: totalTime + 75 * 20,
        duration: (1000 - 75) * 20
    });


    // Ammunition and power-ups
    var level = new Level(master, 'circuit', waves);
    level.addPowerUps(0, totalTime + 9000 * 20);

    return level;
};

Levels.loadLevel4 = function (master) {
    var totalTime = 14000 * 20;
    var waveDuration = 500;
    var time = 500 * 20;
    var waves = [];

    waves.push({
        factory: Level.prototype.addStraightWave,
        start: 100,
        duration: time,
        density: 0.5
    });

    var waveIndex = 0;
    while (time < totalTime - 1000 * 20) {
        // Scale up the density as time goes on
        var density = (time < 1500 * 20 ? (time + 250 * 20) / (2000 * 20) : 1);
        waveIndex++;

        // Hard-coded waves
        if (waveIndex === 5 || waveIndex === 12) {
            waves.push({
                factory: Level.prototype.addGnatWave,
                start: time,
                duration: waveDuration,
                density: 0.9
            });
        } else if (waveIndex === 6 || waveIndex === 11 || waveIndex === 15 || waveIndex === 16) {
            waves.push({
                factory: Level.prototype.addTankWave,
                start: time + 50 * 20
            });

            waves.push({
                factory: Level.prototype.addStraightWave,
                start: time,
                duration: 300 * 20,
                density: 0.9
            });
        } else {
            // Random waves
            var r = random.next();
            var factory;
            if (waveIndex < 5) {
                if (r < 0.2) {
                    factory = Level.prototype.addStraightArrowWave;
                } else if (r < 0.3) {
                    factory = Level.prototype.addOmniArrowWave;
                } else if (r > 0.6) {
                    factory = Level.prototype.addOmniWave;
                } else {
                    factory = Level.prototype.addStraightWave;
                }
            } else {
                if (r < 0.25) {
                    factory = Level.prototype.addMixedGnatWave;
                } else if (r < 0.35) {
                    factory = Level.prototype.addStraightArrowWave;
                } else if (r < 0.5) {
                    factory = Level.prototype.addOmniArrowWave;
                } else if (r > 0.8) {
                    factory = Level.prototype.addOmniWave;
                } else {
                    factory = Level.prototype.addStraightWave;
                }
            }

            waves.push({
                factory: factory,
                start: time,
                duration: waveDuration,
                density: density
            });
        }

        // TODO: Extra power-ups?

        time += waveDuration;
        waveDuration = (600 + 100 * (random.next() * 2 - 1)) * 20;

        // Put a little delay between waves
        time += (50 + 50 * random.next()) * 20;
    }

    waves.push({
        factory: Level.prototype.addMixedGnatWave,
        start: 3000 * 20,
        duration: 2000 * 20,
        density: 0.9
    });

    waves.push({
        factory: Level.prototype.addMixedGnatWave,
        start: 8000 * 20,
        duration: 3000 * 20,
        density: 0.9
    });

    // Boss
    waves.push({
        factory: Level.createBossWaveFactory(Boss1),
        start: totalTime + 75 * 20,
        duration: 0
    });

    // Ammunition and power-ups
    var level = new Level(master, 'pcb', waves);
    level.addPowerUps(0, totalTime + 9000 * 20);

    return level;
};

Levels.createSingleEnemyTestLevelLoader = function (enemy, groundTemplate) {
    return function (master) {
        return new Level(master, groundTemplate ? groundTemplate : 'metal', [{
            factory: function (start, duration, density) {
                this.addWave(enemy, 0, 100, undefined, undefined, 200, 0, 0, 0);
            },

            start: 0,
            duration: 100
        }]);
    };
};

Levels.levels = [
    //Levels.createSingleEnemyTestLevelLoader(Boss1, 'metal'),
    Levels.loadLevel1,
    Levels.loadLevel2,
    Levels.loadLevel3,
    Levels.loadLevel4,
];

function Master(layer) {
    Entity.call(this);
    this.layer = layer;

    // Events
    this.ammoCollected = new Event();
    this.healthCollected = new Event();
    this.shieldsCollected = new Event();
    this.lost = new Event();
    this.won = new Event();
    this.levelTransition = new Event();

    // Background
    this.addChild(this.background = new Entity());
    this.background.addChild(new Ground(GroundTemplates.metalHighlight));
    this.background.addChild(this.ground = new Ground(GroundTemplates.metal));

    // Player (and cursor)
    this.playerInternal = new Player(this);
    this.addChild(this.playerList = new Entity());
    this.addChild(this.playerCursor = new Cursor(this));
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
Master.boundX = 640;
Master.boundY = 284;
Master.collisionExplosionTemplate = new ExplosionTemplate(Enemy.explosionImage, 77, 77, 30 * 20);

Master.prototype.reset = function () {
    // Clear old stuff
    this.playerList.clearChildren();
    this.playerShots.clearChildren();
    this.enemies.clearChildren();
    this.enemyShots.clearChildren();
    this.powerups.clearChildren();
    this.effects.clearChildren();

    // Reset the player
    this.playerInternal.reset();
    this.player = this.playerInternal;
    this.playerList.addChild(this.player);

    // Turn off the mouse cursor since the player moves with the mouse
    this.layer.cursor = 'none';
    this.done = false;

    // Load the first level
    this.setLevel(0);
};

Master.prototype.setLevel = function (levelIndex) {
    this.levelIndex = levelIndex;
    this.levelCompleted = false;
    this.level = Levels.levels[this.levelIndex](this);
    
    // Set ground image
    var groundTemplate = this.level.groundTemplate || 'metal';
    this.ground.queueTemplateChange(groundTemplate);
};

Master.prototype.addPlayerShot = function (shot) {
    this.playerShots.addChild(shot);
};

Master.prototype.removePlayerShot = function (shot) {
    this.playerShots.removeChild(shot);
};

Master.prototype.addEnemy = function (enemy) {
    this.enemies.addChild(enemy);
};

Master.prototype.removeEnemy = function (enemy) {
    this.enemies.removeChild(enemy);
};

Master.prototype.getEnemyCount = function () {
    return this.enemies.getChildCount();
};

Master.prototype.addEnemyShot = function (shot) {
    this.enemyShots.addChild(shot);
};

Master.prototype.removeEnemyShot = function (shot) {
    this.enemyShots.removeChild(shot);
};

Master.prototype.addPowerUp = function (powerup) {
    this.powerups.addChild(powerup);
};

Master.prototype.removePowerUp = function (powerup) {
    this.powerups.removeChild(powerup);
};

Master.prototype.checkShotCollision = function (shot, b) {
    var bw = b.shipWidth / 2;
    var bh = b.shipHeight / 2;
    return (shot.x >= b.x - bw)
        && (shot.x <= b.x + bw)
        && (shot.y >= b.y - bh)
        && (shot.y <= b.y + bh);
};

Master.prototype.checkShipCollision = function (a, b) {
    // Not particularly precise, but true to the original...
    var x = a.x - b.x;
    var y = a.y - b.y;
    var distance = Math.abs(x) + Math.abs(y);
    return distance < (a.shipWidth + b.shipHeight) / 4;
};

Master.prototype.checkPowerUpCollision = function (ship, powerup) {
    // Again, kind of odd logic here
    var distance = Math.abs(ship.x - powerup.x) + Math.abs(ship.y - powerup.y);
    return distance < ship.shipHeight / 2;
};

Master.prototype.update = function (ms) {
    this.updateGame(ms);
    this.updateChildren(ms);
};

Master.prototype.updateGame = function (ms) {
    // Check bounds and collisions for player shots
    this.playerShots.forEachChild(function (shot) {
        var remove = false;

        if (shot.y > Master.boundY) {
            // Out of bounds
            remove = true;
        } else {
            // Check collisions
            this.enemies.forEachChild(function (enemy) {
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
                    shot.explosionTemplate.instantiate(this.effects, shot.x, shot.y);
                }
            }, this);
        }

        if (remove) {
            this.removePlayerShot(shot);
        }
    }, this);

    // Check bounds and collisions for enemy shots
    this.enemyShots.forEachChild(function (shot) {
        var remove = false;

        if (shot.y < -Master.boundY
            || shot.y > Master.boundY
            || shot.x < -Master.boundX
            || shot.x > Master.boundX) {
            remove = true;
        } else {
            // Check collisions
            if (this.player && this.checkShotCollision(shot, this.player)) {
                this.player.takeDamage(shot.damage);
                remove = true;

                // Knock back
                this.player.offsetY += shot.damage / 0.87 * shot.vy;

                // Add explosion
                shot.explosionTemplate.instantiate(this.effects, shot.x, shot.y);
            }
        }

        if (remove) {
            this.removeEnemyShot(shot);
        }
    }, this);

    // Check bounds, health, collisions for enemies
    this.enemies.forEachChild(function (enemy) {
        var remove = false;
        if (enemy.y < -Master.boundY) {
            // Out of bounds
            remove = true;
        } else if (enemy.health <= 0) {
            // Destroyed
            remove = true;

            // Sound effects
            enemy.playExplosionSoundEffects(this.effects);

            // Add explosion
            var template = enemy.explosionTemplate;
            if (template) {
                template.instantiate(this.effects, enemy.x, enemy.y);
            }
        } else if (this.player && this.player.health > 0 && this.checkShipCollision(this.player, enemy)) {
            // TODO: Move to helper on Player?
            var damage = Math.min(35, enemy.health / 2);
            this.player.takeDamage(damage);
            enemy.health -= 40;

            // Knock player
            var deltaX = (this.player.x - enemy.x);
            var deltaY = (this.player.y - enemy.y);
            this.player.offsetX += deltaX * damage * 0.04;
            this.player.offsetY += deltaY * damage * 0.04;

            // Knock enemy
            var massFactor = this.player.mass / enemy.mass;
            enemy.offsetX -= deltaX * massFactor;
            enemy.offsetY -= deltaY * massFactor / 2;

            // Add explosions
            var explosionOffsetX = 9 * (random.next() * 2 - 1);
            var explosionOffsetY = 9 * (random.next() * 2 - 1);

            Master.collisionExplosionTemplate.instantiate(this.effects, enemy.x + explosionOffsetX, enemy.y + explosionOffsetY);

            if (this.player.shields <= 0) {
                Master.collisionExplosionTemplate.instantiate(this.effects, this.player.x + explosionOffsetX, this.player.y + explosionOffsetY + 6);
            }
        }

        if (remove) {
            this.removeEnemy(enemy);
        }
    }, this);

    // Check bounds and collisions for power-ups
    this.powerups.forEachChild(function (powerup) {
        var remove = false;

        if (powerup.y < -Master.boundY
            || powerup.y > Master.boundY
            || powerup.x < -Master.boundX
            || powerup.x > Master.boundX) {
            remove = true;
        } else {
            // Check collisions
            if (this.player && this.checkPowerUpCollision(this.player, powerup)) {
                // Apply the power-up
                powerup.use();
                remove = true;
            }
        }

        if (remove) {
            this.removePowerUp(powerup);
        }
    }, this);

    // Check for loss
    var wonOrLost = false;
    if (this.player && this.player.health <= 0) {
        // TODO: Shouldn't this be consolidated into a method on Ship so enemies don't duplicate the code?
        // Sound effect
        this.player.playExplosionSoundEffects(this.effects);

        // Add explosion
        var template = this.player.explosionTemplate;
        if (template) {
            template.instantiate(this.effects, this.player.x, this.player.y);
        }

        this.playerList.removeChild(this.player);
        this.player = null;

        // Re-enable the cursor
        this.layer.cursor = 'auto';

        // Signal the loss
        this.lost.fire();
        wonOrLost = true;
    }

    // Add new enemies according to the level (assuming the player is still alive)
    if (this.player && this.level) {
        this.level.update(ms);

        // Check for end of level (no enemies queued, no enemies or enemy shots on the screen)
        if (!this.levelCompleted && this.level.complete && this.enemies.getChildCount() === 0 && this.enemyShots.getChildCount() === 0) {
            this.levelCompleted = true;

            // Signal the win
            var lastLevelCompleted = (this.levelIndex == Levels.levels.length - 1);
            this.won.fire(this.levelIndex, lastLevelCompleted);
            if (lastLevelCompleted) {
                wonOrLost = true;
            } else {
                // Level transition
                var master = this;
                this.effects.addChild(new Timer(9000, function () {
                    master.setLevel(master.levelIndex + 1);
                }));
            }
        }
    }

    // Set a timer to exit the game (if the player won or lost)
    if (wonOrLost) {
        var master = this;
        this.effects.addChild(new Timer(3000, function () {
            master.done = true;
        }));
    }
};

function Electricity(x, y, width, height) {
    Entity.call(this, x, y);
    this.totalHeight = height;
    this.elements = [];
    for (var i = 0; i < 2; i++) {
        this.elements.push(new ImageRegion(Electricity.imageSrc, 'blue', 0, 0, 1, 0.5, 0, height / 2, width, height / 2));
    }

    this.reset();
}

Electricity.imageSrc = 'images/electricity.png'
Electricity.period = 400;
Electricity.prototype = Object.create(Entity.prototype);

Electricity.prototype.reset = function () {
    this.timer = Electricity.period;
    this.update(0);
};

Electricity.prototype.update = function (ms) {
    this.timer += ms;

    if (this.timer >= Electricity.period) {
        this.opacity = 0;
    } else {
        // Move
        this.opacity = 1;
        this.y = -240 + (480 + this.totalHeight) * this.timer / Electricity.period;

        // Randomly scroll texture
        var x = random.next();
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
    this.elements = [Blink.image];
    this.reset();
}

Blink.duration = 600;
Blink.period = 150;
Blink.opacity = 0.5;
Blink.image = new Image('images/blink.png', 'red');
Blink.prototype = Object.create(Entity.prototype);

Blink.prototype.reset = function () {
    this.opacity = 0;
    this.timer = Blink.duration;
};

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

function Display(master) {
    this.master = master;
    this.blinkTimer = 0;
    this.blink = false;

    var player = master.playerInternal;
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
    master.ammoCollected.addListener(function () {
        display.ammoBackground.opacity = 1;
    });

    // Health/shield pick-up electricity effect
    this.electricityLeft = new Electricity(-320, 0, 65, 160);
    this.electricityRight = new Electricity(320 - 65, 0, 65, 160);
    master.healthCollected.addListener(function () {
        display.electricityRight.flash();
    });
    master.shieldsCollected.addListener(function () {
        display.electricityLeft.flash();
    });

    // Damage warning flash
    this.healthBlink = new Blink(320, -240, 240, 480);
    player.healthLost.addListener(function () {
        display.healthBlink.blink();
    });

    // End messages
    master.won.addListener(function (levelIndex, lastLevelCompleted) {
        if (lastLevelCompleted) {
            display.addOverlay(new Message('y o u   w i n'));
        } else {
            display.addOverlay(new Message('l e v e l   ' + (levelIndex + 1) + '   c o m p l e t e', 2000));

            // TODO: Transition effect for next level
        }
    });
    master.lost.addListener(function () {
        display.addOverlay(new Message('g a m e   o v e r'));
    });

    this.addChild(this.electricityLeft);
    this.addChild(this.electricityRight);
    this.addChild(this.healthBlink);

    // Messages (or any other overlays)
    this.addChild(this.overlays = new Entity());
}

Display.statLeftImage = new Image('images/statBackground.png', 'darkgray', -320, 240, 65, 480);
Display.statRightImage = new Image('images/statBackground.png', 'darkgray', 320 - 65, 240, 65, 480);
Display.statTopLeftImage = new Image('images/statTop.png', 'darkgray', -320, 240, 65, 94, 0.5);
Display.ammoBarImages = [
    new ImageRegion('images/ammoBar0.png', 'yellow', 0, 0, 1, 1),
    new ImageRegion('images/ammoBar1.png', 'green', 0, 0, 1, 1),
    new ImageRegion('images/ammoBar2.png', 'blue', 0, 0, 1, 1)
];
Display.barBaseY = -222;
Display.barMaxHeight = 171;
Display.fadePeriod = 1500;
Display.defaultOpacity = 0.2;
Display.blinkPeriod = 300;
Display.blinkOpacity = 0.5;
Display.ammoBlinkThreshold = 50;
Display.healthBlinkThreshold = Player.maxHealth * 0.3;
Display.healthBarImage = new ImageRegion('images/healthBar.png', 'red', 0, 0, 1, 1, 299 - 24, Display.barBaseY + Display.barMaxHeight, 24, Display.barMaxHeight);
Display.shieldBarImage = new ImageRegion('images/shieldBar.png', 'blue', 0, 0, 1, 1, -299, Display.barBaseY + Display.barMaxHeight, 24, 0);
Display.superShieldBarImage = new ImageRegion('images/superShieldBar.png', 'yellow', 0, 0, 1, 1, -299, Display.barBaseY + Display.barMaxHeight, 24, 0);
Display.prototype = Object.create(Entity.prototype);

Display.prototype.update = function (ms) {
    this.blinkTimer += ms;
    while (this.blinkTimer > Display.blinkPeriod) {
        this.blink = !this.blink;
        this.blinkTimer -= Display.blinkPeriod;
    }

    var player = this.master.player;
    if (player) {
        // Update ammo
        var count = player.ammo.length;
        for (var i = 0; i < count; i++) {
            this.ammo[i].height = 1.5 * player.ammo[i];
            this.ammo[i].sheight = player.ammo[i] / PowerUp.ammo;
            this.ammo[i].opacity = (this.blink || player.ammo[i] > Display.ammoBlinkThreshold) ? 1 : Display.blinkOpacity;
        }

        // Update health
        this.updateBar(this.healthBar, player.health / Player.maxHealth);
        this.healthBar.opacity = (this.blink || player.shields > 0 || player.health > Display.healthBlinkThreshold) ? 1 : Display.blinkOpacity;

        // Update shields
        this.updateBar(this.shieldBar, player.shields / Player.maxShields);
        this.updateBar(this.superShieldBar, (player.shields - Player.maxShields) / Player.maxShields);
    } else {
        this.healthBar.opacity = 0;
        this.shieldBar.opacity = 0;
        this.superShieldBar.opacity = 0;
    }

    if (this.ammoBackground.opacity > Display.defaultOpacity) {
        this.ammoBackground.opacity = Math.max(Display.defaultOpacity, this.ammoBackground.opacity - (1 - Display.defaultOpacity) / Display.fadePeriod * ms);
    }

    this.updateChildren(ms);
};

Display.prototype.reset = function () {
    this.blinkTimer = 0;
    this.electricityLeft.reset();
    this.electricityRight.reset();
    this.healthBlink.reset();
    this.overlays.clearChildren();
    this.update(0);
};

Display.prototype.updateBar = function (bar, fraction) {
    if (fraction > 0) {
        height = Math.min(Display.barMaxHeight, fraction * Display.barMaxHeight);
        bar.y = Display.barBaseY + height;
        bar.height = height;
        bar.sy = 1 - (height / Display.barMaxHeight);
        bar.sheight = 1 - bar.sy;
        bar.opacity = 1;
    } else {
        bar.opacity = 0;
    }
};

Display.prototype.addOverlay = function (child) {
    this.overlays.addChild(child);
};

function Cursor(master) {
    Entity.call(this, 0, 0, Cursor.size, Cursor.size);
    this.master = master;
    this.opacity = 0;
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'white')];
}

Cursor.size = 5;
Cursor.offsetY = (240 - Player.boundY) - 10;
Cursor.opacity = 0.35;
Cursor.prototype = Object.create(Entity.prototype);

Cursor.prototype.setPosition = function (x, y) {
    this.setVisible(true);
    this.x = x;
    this.y = y;

    if (this.master.player) {
        this.master.player.setCursorPosition(x, y + Cursor.offsetY);
    }
};

Cursor.prototype.setVisible = function (visible) {
    this.opacity = (visible ? Cursor.opacity : 0);
};

function GameLayer() {
    Layer.call(this);

    this.master = new Master(this);
    this.display = new Display(this.master);

    this.addEntity(this.master);
    this.addEntity(this.display);

    // Keyboard controls
    this.keyPressedHandlers = {
        up: GameLayer.prototype.moveUp,
        down: GameLayer.prototype.moveDown,
        left: GameLayer.prototype.moveLeft,
        right: GameLayer.prototype.moveRight,
        space: GameLayer.prototype.fire,
        z: GameLayer.prototype.fire
    };

    this.activeTouchIdentifier = null;
}

GameLayer.prototype = Object.create(Layer.prototype);

GameLayer.prototype.reset = function () {
    this.master.reset();
    this.display.reset();
    this.activeTouchIdentifier = null;
};

GameLayer.prototype.start = function (levelIndex) {
    if (levelIndex !== undefined) {
        this.master.setLevel(levelIndex);
    }

    Radius.pushLayer(this);
};

GameLayer.prototype.stop = function () {
    Radius.popLayer();
};

GameLayer.prototype.keyPressed = function (key, pressed) {
    if (this.master.done) {
        // Game is over, so exit on any key press
        if (pressed) {
            this.stop();
        }
    } else {
        // In game
        var keyPressedHandler = this.keyPressedHandlers[key];
        if (keyPressedHandler) {
            keyPressedHandler.call(this, pressed);
        }
    }
};

// TODO: It might be nice to have this also work while the mouse is outside the canvas...
GameLayer.prototype.mouseMoved = function (x, y) {
    this.master.playerCursor.setPosition(x, y);
};

// TODO: It would be nice to have shooting work while the mouse is outside the canvas...
GameLayer.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    if (this.master.done) {
        // Game is over; exit on any press
        if (pressed) {
            this.stop();
        }
    } else {
        // In game
        if (button === MouseButton.primary && this.master.player) {
            this.master.player.setFiring(pressed);
        }
    }
};

GameLayer.prototype.mouseOut = function () {
    // Stop firing if the mouse left the canvas
    if (this.master.player) {
        this.master.player.setFiring(false);
    }
};

// TODO: Some of this code could be unified with the mouse event handlers above
GameLayer.prototype.touchMoved = function (identifier, x, y) {
    if (this.activeTouchIdentifier === identifier) {
        this.master.playerCursor.setPosition(x, y);
    }
};

GameLayer.prototype.touched = function (identifier, started, x, y) {
    if (this.activeTouchIdentifier === null && started) {
        this.activeTouchIdentifier = identifier;
    }

    if (this.activeTouchIdentifier === identifier) {
        if (!started) {
            this.activeTouchIdentifier = null;
        }

        if (this.master.done) {
            // Game is over; exit on any press
            if (started) {
                this.stop();
            }
        } else {
            // In game
            if (this.master.player) {
                this.master.player.setFiring(started);
            }
        }
    }
};

GameLayer.prototype.touchCanceled = function (identifier) {
    if (this.activeTouchIdentifier === identifier) {
        this.activeTouchIdentifier = null;

        // Stop firing if the touch left the canvas
        if (this.master.player) {
            this.master.player.setFiring(false);
        }
    }
};

GameLayer.prototype.moveLeft = function (pressed) {
    if (this.master.player) {
        this.master.player.setMovingLeft(pressed);
    }
};

GameLayer.prototype.moveRight = function (pressed) {
    if (this.master.player) {
        this.master.player.setMovingRight(pressed);
    }
};

GameLayer.prototype.moveUp = function (pressed) {
    if (this.master.player) {
        this.master.player.setMovingUp(pressed);
    }
};

GameLayer.prototype.moveDown = function (pressed) {
    if (this.master.player) {
        this.master.player.setMovingDown(pressed);
    }
};

GameLayer.prototype.fire = function (pressed) {
    if (this.master.player) {
        this.master.player.setFiring(pressed);
    }
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

function LoadingLayer(background) {
    Layer.call(this);
    // TODO: This layer may not need to be constantly redrawn
    this.bar = new ProgressBar(0, 0, 640, 100, 'gray');
    if (background) {
        this.addEntity(background);
    }
    this.addEntity(this.bar);
}

LoadingLayer.prototype = Object.create(Layer.prototype);

LoadingLayer.prototype.load = function (loadPromise, start) {
    var loadingLayer = this;
    loadPromise.then(start, null, function (progress) {
        loadingLayer.bar.setProgress(progress);
    });
};

function MainMenu(loadPromise) {
    this.gameLayer = new GameLayer();

    // Setup loading
    this.loadPromise = loadPromise;
    this.ready = false;

    // Add mandatory options
    var mainMenu = this;
    var audioOptions = ['On', 'Muted'];
    var audioChoice = new Choice('Audio', audioOptions, Audio.muted ? 1 : 0);
    audioChoice.choiceChanged.addListener(function (text) {
        Audio.setMuted(text === audioOptions[1]);
    });

    // Allow starting on levels that have been unlocked
    var levelCount = Levels.levels.length;
    var maxLevelKey = 'maxLevelUnlocked';
    var maxLevelIndex = 0;

    try {
        maxLevelIndex = Math.min(levelCount - 1, parseInt(localStorage[maxLevelKey]) || 0);
    } catch (e) {}

    this.levelIndex = 0;
    var levelOptions = [];
    for (var i = 0; i < levelCount; i++) {
        levelOptions.push((i + 1).toString());
    }
    var levelChoice = new Choice('Level', levelOptions, 0, maxLevelIndex);
    levelChoice.choiceChanged.addListener(function (index) {
        mainMenu.levelIndex = index - 1;
    });

    // After beating a level, unlock the next one
    this.gameLayer.master.won.addListener(function (levelIndex, last) {
        if (!last) {
            maxLevelIndex++;

            try {
                localStorage[maxLevelKey] = maxLevelIndex;
            } catch (e) {}
            
            levelChoice.setMaxIndex(maxLevelIndex);
        }
    });

    var options = [
        new Separator(),
        new Button('Start New Game', function () { mainMenu.startNewGame(mainMenu.levelIndex); }),
        levelChoice,
        new Separator(),
        audioChoice,
    ];

    // Add the "fullscreen" choice, if necessary
    var fullscreenOnly = RadiusSettings && RadiusSettings.fullscreenOnly;
    if (!fullscreenOnly) {
        var fullscreenOptions = ['Off', 'On'];
        var fullscreenChoice = new Choice('Fullscreen', fullscreenOptions);
        fullscreenChoice.choiceChanged.addListener(function (text) {
            Radius.setFullscreen(text === fullscreenOptions[1]);
        });
        options.splice(5, 0, fullscreenChoice);
    }

    // Setup background
    var background = new Entity();
    var overlay = new Entity(0, 0, 640, 480);
    var box = new Rectangle();
    box.color = 'black';
    box.opacity = 0.5;
    overlay.elements = [box];
    background.addChild(this.gameLayer.master.background);
    background.addChild(overlay);
    this.background = background;

    // Create the form
    FormLayer.call(this, new NestedGridForm(1, [
        new Title('Chromium JSU'),
        new NestedFlowForm(1, options)
    ]), background);
}

MainMenu.prototype = Object.create(FormLayer.prototype);

MainMenu.prototype.startNewGameInternal = function (levelIndex) {
    this.gameLayer.reset();
    this.gameLayer.start(levelIndex);
};

MainMenu.prototype.startNewGame = function (levelIndex) {
    if (this.ready) {
        // Everything's loaded, so just go
        this.startNewGameInternal(levelIndex);
    } else {
        // Everything's not loaded yet, so show a progress bar and try again once everything's loaded
        var mainMenu = this;
        var loadingLayer = new LoadingLayer(this.background);
        Radius.pushLayer(loadingLayer);
        loadingLayer.load(this.loadPromise, function () {
            mainMenu.ready = true;
            Radius.popLayer();
            mainMenu.startNewGameInternal(levelIndex);
        });
    }
};

// Set button color
Button.focusedColor = 'red';

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));

    // These images must be loaded to show the menu, so load them first
    var menuLoadPromise = Radius.images.load([
        'images/groundMetal.png',
        'images/groundMetalHighlight.png',
    ]);

    // Show the main menu once critical images have loaded
    var loadingLayer = new LoadingLayer();
    Radius.start(loadingLayer);
    loadingLayer.load(menuLoadPromise, function () {
        // Now start loading everything else
        var loadPromise = Radius.images.load([
            'images/ammoBar0.png',
            'images/ammoBar1.png',
            'images/ammoBar2.png',
            'images/blink.png',
            'images/boss0.png',
            'images/boss1.png',
            'images/bullet.png',
            'images/bulletExplosion.png',
            'images/bulletFlash.png',
            'images/electricity.png',
            'images/emp.png',
            'images/empExplosion.png',
            'images/empFlash.png',
            'images/enemyExplosion.png',
            'images/gnat.png',
            'images/groundCircuit.png',
            'images/groundPCB.png',
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
            'images/sparkle.png',
            'images/statBackground.png',
            'images/statTop.png',
            'images/straight.png',
            'images/straightShot.png',
            'images/straightShotExplosion.png',
            'images/superShieldBar.png',
            'images/tank.png',
            'images/tankCharge.png',
            'images/tankShot.png',
            'images/tankShotExplosion.png',
            'images/tankShotFlash.png',
        ]);

        // Create audio clips (note: if muted, these won't actually be loaded)
        // TODO: Consider preloading sounds (in addition to images)
        AudioManager.load([
            'explosion.mp3',
            'explosionBig.mp3',
            'explosionHuge.mp3',
            'powerup.mp3',
        ]);

        // Show the main menu
        Radius.popLayer();
        Radius.pushLayer(new MainMenu(loadPromise));
    });
});
