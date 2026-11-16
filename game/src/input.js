// Starlight Salvage — keyboard and mouse state. The game reads this each
// frame; edge-triggered presses (justPressed) are consumed by the update
// step so a single keypress never fires twice.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this._onKeyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) {
        this.keys.add(event.key.toLowerCase());
        this.justPressed.add(event.key.toLowerCase());
      }
    };
    this._onKeyUp = (event) => {
      this.keys.delete(event.key.toLowerCase());
    };
    this._onMouseMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      // Canvas internal resolution is fixed; map screen pixels onto it.
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    };
    this._onMouseDown = (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
        this._onMouseMove(event);
      }
    };
    this._onMouseUp = (event) => {
      if (event.button === 0) this.mouse.down = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouse.down = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  pressed(...names) {
    return names.some((n) => this.justPressed.has(n));
  }

  /** Call once per frame, after the update step has read the input. */
  endFrame() {
    this.justPressed.clear();
    this.mouse.clicked = false;
  }
}
