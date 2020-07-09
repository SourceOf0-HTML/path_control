
class Sprite {
  constructor() {
    this.m = new Matrix();
    this.x = 0;
    this.y = 0;
    this.anchorX = 0;
    this.anchorY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
  };
  
  reset() {
    this.x = 0;
    this.y = 0;
    this.anchorX = 0;
    this.anchorY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
  };
  
  /**
   * @return {Sprite}
   */
  clone() {
    let sprite = new Sprite();
    sprite.x = this.x;
    sprite.y = this.y;
    sprite.anchorX = this.anchorX;
    sprite.anchorY = this.anchorY;
    sprite.scaleX = this.scaleX;
    sprite.scaleY = this.scaleY;
    sprite.rotation = this.rotation;
    return sprite;
  };
  
  /**
   * @param {Sprite} s
   * @return {Sprite}
   */
  setSprite(sprite) {
    this.x = sprite.x;
    this.y = sprite.y;
    this.anchorX = sprite.anchorX;
    this.anchorY = sprite.anchorY;
    this.scaleX = sprite.scaleX;
    this.scaleY = sprite.scaleY;
    this.rotation = sprite.rotation;
    return this;
  };
  
  /**
   * @param {Sprite} s
   * @return {Sprite}
   */
  addSprite(sprite) {
    this.x +=sprite.x;
    this.y += sprite.y;
    this.anchorX += sprite.anchorX;
    this.anchorY += sprite.anchorY;
    this.scaleX *= sprite.scaleX;
    this.scaleY *= sprite.scaleY;
    this.rotation = sprite.rotation;
    return this;
  };
  
  /**
   * @param {Sprite} s
   * @return {Sprite} - new Sprite
   */
  compSprite(sprite) {
    let ret = new Sprite();
    ret.x = this.x + sprite.x;
    ret.y = this.y + sprite.y;
    ret.anchorX = this.anchorX + sprite.anchorX;
    ret.anchorY = this.anchorY + sprite.anchorY;
    ret.scaleX = this.scaleX * sprite.scaleX;
    ret.scaleY = this.scaleY * sprite.scaleY;
    ret.rotation = this.rotation + sprite.rotation;
    return ret;
  };
  
  getMatrix() {
    let sx = this.scaleX;
    let sy = this.scaleY;
    let r = this.rotation;
    return this.m.reset().translate(this.x, this.y).rotate(r).scale(sx, sy).translate(-this.anchorX, -this.anchorY);
  };
};

