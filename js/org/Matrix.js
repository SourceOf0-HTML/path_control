
class Matrix {
  constructor() {
    this.a = 1;  // scale x
    this.b = 0;  // skew y
    this.c = 0;  // skew x
    this.d = 1;  // scale y
    this.e = 0;  // translate x
    this.f = 0;  // translate y
  };
  
  reset() {
    this.a = this.d = 1;
    this.b = this.c = this.e = this.f = 0;
    return this;
  };
  
  /**
   * @param {Array} point
   * @param {Integer} index
   */
  applyToPoint(point, index = 0) {
    let x = point[index];
    let y = point[index+1];
    point[index] = x * this.a + y * this.c + this.e;
    point[index+1] = x * this.b + y * this.d + this.f;
  };
  
  /**
   * @param {Array} points
   * @param {Integer} index
   */
  applyToArray(points, index = 0) {
    let pointsNum = points.length;
    for(let i = index; i < pointsNum; i += 2) {
      this.applyToPoint(points, i);
    }
  };
  
  /**
   * @param {Matrix} m
   * @return {Matrix}
   */
  setMatrix(m) {
    this.a = m.a;
    this.b = m.b;
    this.c = m.c;
    this.d = m.d;
    this.e = m.e;
    this.f = m.f;
    return this;
  };
  
  /**
   * @param {Matrix} m2
   * @param {Number} t - interpolation [0.0, 1.0]
   * @return {Matrix} - new Matrix
   */
  interpolate(m2, t) {
    let m = new Matrix();
    m.a = this.a + (m2.a - this.a) * t;
    m.b = this.b + (m2.b - this.b) * t;
    m.c = this.c + (m2.c - this.c) * t;
    m.d = this.d + (m2.d - this.d) * t;
    m.e = this.e + (m2.e - this.e) * t;
    m.f = this.f + (m2.f - this.f) * t;
    return m;
  };
  
  /**
   * @param {Number} t
   * @return {Matrix} - new Matrix
   */
  mult(t) {
    let m = new Matrix();
    m.a = this.a * t;
    m.b = this.b * t;
    m.c = this.c * t;
    m.d = this.d * t;
    m.e = this.e * t;
    m.f = this.f * t;
    return m;
  };
  
  /**
   * @param {Number} t
   * @param {Number} x
   * @param {Number} y
   * @param {Array} point
   * @param {Integer} index
   */
  multAndAddPoint(t, x, y, point, index) {
    point[index] += (x * this.a + y * this.c + this.e) * t;
    point[index+1] += (x * this.b + y * this.d + this.f) * t;
  };
  
  /**
   * @param {Number} a - scale x
   * @param {Number} b - skew y
   * @param {Number} c - skew x
   * @param {Number} d - scale y
   * @param {Number} e - translate x
   * @param {Number} f - translate y
   * @return {Matrix}
   */
  setTransform(a, b, c, d, e, f) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  };
  
  /**
   * @param {Number} a2 - scale x
   * @param {Number} b2 - skew y
   * @param {Number} c2 - skew x
   * @param {Number} d2 - scale y
   * @param {Number} e2 - translate x
   * @param {Number} f2 - translate y
   * @return {Matrix}
   */
  transform(a2, b2, c2, d2, e2, f2) {
    let a1 = this.a,
        b1 = this.b,
        c1 = this.c,
        d1 = this.d,
        e1 = this.e,
        f1 = this.f;
    this.a = a1 * a2 + c1 * b2;
    this.b = b1 * a2 + d1 * b2;
    this.c = a1 * c2 + c1 * d2;
    this.d = b1 * c2 + d1 * d2;
    this.e = a1 * e2 + c1 * f2 + e1;
    this.f = b1 * e2 + d1 * f2 + f1;
    return this;
  };
  
  rotate(angle) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    return this.transform(cos, sin, -sin, cos, 0, 0);
  };
  
  scale(sx, sy = sx) { return this.transform(sx, 0, 0, sy, 0, 0) };
  scaleX(sx) { return this.transform(sx, 0, 0, 1, 0, 0) };
  scaleY(sy) { return this.transform(1, 0, 0, sy, 0, 0) };
  
  skew(sx, sy) { return this.transform(1, sy, sx, 1, 0, 0) };
  skewX(sx) { return this.transform(1, 0, sx, 1, 0, 0) };
  skewY(sy) { return this.transform(1, sy, 0, 1, 0, 0) };
  
  translate(tx, ty) { return this.transform(1, 0, 0, 1, tx, ty) };
  translateX(tx) { return this.transform(1, 0, 0, 1, tx, 0) };
  translateY(ty) { return this.transform(1, 0, 0, 1, 0, ty) };
};

