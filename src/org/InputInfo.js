
/**
 * InputInfo
 * Singleton
 */
var InputInfo = {
  
  /* -- mouse info -- */
  isMouseDownLeft: false,
  isMouseDownMiddle: false,
  isMouseDownRight: false,
  isMouseDownBack: false,
  isMouseDownForward: false,
  mouseX: 0,
  mouseY: 0,
  
  /* -- touch info -- */
  touches: [],
  
  /* -- common pointer info -- */
  isValidPointer: false,
  pointerX: 0,
  pointerY: 0,
  
  
  /**
   * @param {Number} x - reference mouse x
   * @param {Number} y - reference mouse y
   */
  setMousePos: function(x, y) {
    this.pointerX = this.mouseX = x;
    this.pointerY = this.mouseY = y;
  },
  
  /**
   * @param {Number} mouseButton - kind of mouse button
   * @param {Boolean} isDown - is mouse down
   */
  setMouseState: function(mouseButton, isDown) {
    switch(mouseButton) {
      case 0:
        this.isMouseDownLeft = isDown;
        break;
      case 1:
        this.isMouseDownMiddle = isDown;
        break;
      case 2:
        this.isMouseDownRight = isDown;
        break;
      case 3:
        this.isMouseDownBack = isDown;
        break;
      case 4:
        this.isMouseDownForward = isDown;
        break;
        
      default:
        break;
    }
  },
  
  /**
   * @param {Number} touches - touches info
   */
  setTouch: function(touches) {
    this.touches = touches;
    if(this.touches.length == 0) {
      this.isValidPointer = false;
      return;
    }
    this.isValidPointer = true;
    this.pointerX = this.touches[0].pageX;
    this.pointerY = this.touches[0].pageY;
  },
};
