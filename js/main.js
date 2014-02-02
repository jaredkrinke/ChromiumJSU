/// <reference path="radius.js" />
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

    // Check boundaries
    // TODO: Should bounds be done in the layer? (That would remove the layer dependency...)
    if (this.y > 240) {
        this.dead = true;
    }
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
    this.x = (x < -Player.boundX ? -Player.boundX : (x > Player.boundX ? Player.boundX : x));
    this.y = (y < -Player.boundY ? -Player.boundY : (y > Player.boundY ? Player.boundY : y));
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

function GameLayer() {
    Layer.call(this);
    this.player = this.addEntity(new Player(this));
    this.playerShots = [];
    this.reset();
}

GameLayer.prototype = Object.create(Layer.prototype);

GameLayer.prototype.reset = function () {
    this.player.reset();
    this.playerShots.length = 0;
    // TODO: Remove player shots from the entity list
};

GameLayer.prototype.addPlayerShot = function (shot) {
    this.playerShots.push(this.addEntity(shot));
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

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
