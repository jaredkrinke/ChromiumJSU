/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function Player() {
    Entity.call(this);
    this.width = 40;
    this.height = 48;
    this.elements = [new Rectangle(undefined, undefined, undefined, undefined, 'red')];
}

Player.prototype = Object.create(Entity.prototype);
Player.boundX = 284;
Player.boundY = 213;

// TODO: Keyboard/touch controls
Player.prototype.setPosition = function (x, y) {
    this.x = (x < -Player.boundX ? -Player.boundX : (x > Player.boundX ? Player.boundX : x));
    this.y = (y < -Player.boundY ? -Player.boundY : (y > Player.boundY ? Player.boundY : y));
};

function GameLayer() {
    Layer.call(this);
    this.player = this.addEntity(new Player());
}

GameLayer.prototype = Object.create(Layer.prototype);

// TODO: It might be nice to have this also work while the mouse is outside the canvas...
GameLayer.prototype.mouseMoved = function (x, y) {
    this.player.setPosition(x, y);
};

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
