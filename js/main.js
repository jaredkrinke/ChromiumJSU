/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

window.addEventListener('DOMContentLoaded', function () {
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new Layer());
});
