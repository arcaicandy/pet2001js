window.addEventListener("resize", resizeCanvas, false);
window.addEventListener("load", resizeCanvas, false);

function resizeCanvas() {

  var canvas = document.getElementById('petScreenCanvas');

  canvas.style.height = window.innerHeight + 'px';
  canvas.style.width = window.innerWidth + 'px';
};

function toggleElement(id) {
  var el = document.getElementById(id);
  el.hidden = !el.hidden;
}
