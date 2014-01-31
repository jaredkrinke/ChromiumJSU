/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

function Player() {
    Entity.call(this);
    this.width = 15;
    this.height = 18;
    this.elements = [new Rectangle(null, null, null, null, 'red')];
}

Player.prototype = Object.create(Entity.prototype);

function GameLayer() {
    Layer.call(this);
    this.player = this.addEntity(new Player());
}

GameLayer.prototype = Object.create(Layer.prototype);

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
});
