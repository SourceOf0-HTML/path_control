
class PathObj {
  constructor(pathDataList, maskIdToUse, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.pathDataList = pathDataList;  // path data array
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.fillStyle = fillStyle;        // fillColor ( context2D.fillStyle )
    this.lineWidth = lineWidth;        // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = strokeStyle;    // strokeColor ( context2D.strokeStyle )
    this.hasActionList = [];           // if true, have action
  };
  
  addAction(pathDataList, fillRule, fillStyle, lineWidth, strokeStyle, frame, actionID) {
    if( this.hasActionList.length == 0 ) {
      // init action data
      this.pathDataList = [[this.pathDataList]];  // path data array
      this.fillStyle = [[this.fillStyle]];        // fillColor ( context2D.fillStyle )
      this.lineWidth = [[this.lineWidth]];        // strokeWidth ( context2D.lineWidth )
      this.strokeStyle = [[this.strokeStyle]];    // strokeColor ( context2D.strokeStyle )
    }
    if( !this.hasActionList[actionID] ) {
      this.pathDataList[actionID] = [this.pathDataList[0][0]];
      this.fillStyle[actionID] = [this.fillStyle[0][0]];
      this.lineWidth[actionID] = [this.lineWidth[0][0]];
      this.strokeStyle[actionID] = [this.strokeStyle[0][0]];
      this.hasActionList[actionID] = true;
    }
    this.pathDataList[actionID][frame] = pathDataList;
    this.fillStyle[actionID][frame] = fillStyle;
    this.lineWidth[actionID][frame] = lineWidth;
    this.strokeStyle[actionID][frame] = strokeStyle;
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   * @param {Path2D} path2D
   * @param {PathData} d
   */
  drawPath(pathContainer, matrix, path2D, d) {
    let pos;
    switch(d.type) {
      case "M":
        pos = matrix.applyToArray(d.pos, pathContainer.pathRatio);
        path2D.moveTo(pos[0], pos[1]);
        break;
      case "C":
        pos = matrix.applyToArray(d.pos, pathContainer.pathRatio);
        path2D.bezierCurveTo(pos[0], pos[1], pos[2], pos[3], pos[4], pos[5]);
        break;
      case "Z":
        path2D.closePath();
        break;
      default:
        console.error("unknown type");
        break;
    }
  };
  
  /**
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Number} lineWidth - strokeWidth ( context2D.lineWidth )
   * @param {String} strokeStyle - strokeColor ( context2D.strokeStyle )
   */
  drawStroke(context, path2D, lineWidth, strokeStyle) {
    if( !lineWidth ) return;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeStyle;
    context.stroke(path2D);
  };
  
  /**
   * @param {CanvasRenderingContext2D} context -  canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {String} fillStyle - strokeColor ( context2D.strokeStyle )
   */
  drawFill(context, path2D, fillStyle) {
    context.fillStyle = fillStyle;
    context.fill(path2D, this.fillRule);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, matrix, context, path2D, isMask) {
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    
    if( this.hasActionList.length == 0) {
      this.pathDataList.forEach(d=>this.drawPath(matrix, path2D, d));
      if(isMask) return;
      this.drawStroke(context, path2D, this.lineWidth, this.strokeStyle);
      this.drawFill(context, path2D, this.fillStyle);
      return;
    } else if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    
    this.pathDataList[actionID][Math.min(frame, this.pathDataList[actionID].length)].forEach(d=>this.drawPath(pathContainer, matrix, path2D, d));
    if(isMask) return;
    this.drawStroke(context, path2D, this.lineWidth[actionID][Math.min(frame, this.lineWidth[actionID].length)], this.strokeStyle[actionID][Math.min(frame, this.strokeStyle[actionID].length)]);
    this.drawFill(context, path2D, this.fillStyle[actionID][Math.min(frame, this.fillStyle[actionID].length)]);
  };
};

