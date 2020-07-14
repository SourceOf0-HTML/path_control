
class PathObj {
  constructor(pathDataList, maskIdToUse, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.pathDataList = pathDataList;  // path data array
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.fillStyle = fillStyle;        // fillColor ( context2D.fillStyle )
    this.lineWidth = lineWidth;        // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = strokeStyle;    // strokeColor ( context2D.strokeStyle )
    this.hasActionList = [];           // if true, have action
    this.resultPath = {};              // path data for drawing
  };
  
  addAction(pathDataList, fillStyle, lineWidth, strokeStyle, frame, actionID) {
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
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getPathDataList(frame = 0, actionID = 0) {
    if( this.hasActionList.length == 0 ) {
      return this.pathDataList;
    }
    if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    return this.pathDataList[actionID][Math.min(frame, this.pathDataList[actionID].length)];
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   */
  update(frame, actionID, pathContainer, matrix) {
    this.resultPath = {
      pathData: []
    };
    
    let updatePath =d=> {
      let pos;
      switch(d.type) {
        case "M":
          pos = d.pos.slice();
          matrix.applyToArray(pos);
          this.resultPath.pathData.push({type:"M", pos});
          break;
        case "L":
          pos = d.pos.slice();
          matrix.applyToArray(pos);
          this.resultPath.pathData.push({type:"L", pos});
          break;
        case "C":
          pos = d.pos.slice();
          matrix.applyToArray(pos);
          this.resultPath.pathData.push({type:"C", pos});
          break;
        case "Z":
          this.resultPath.pathData.push({type:"Z"});
          break;
        default:
          console.error("unknown type");
          break;
      }
    };
    
    if( this.hasActionList.length == 0) {
      this.pathDataList.forEach(updatePath);
      this.resultPath.lineWidth = this.lineWidth;
      this.resultPath.strokeStyle = this.strokeStyle;
      this.resultPath.fillStyle = this.fillStyle;
      return;
    } else if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    
    this.pathDataList[actionID][Math.min(frame, this.pathDataList[actionID].length)].forEach(updatePath);
    this.resultPath.lineWidth = this.lineWidth[actionID][Math.min(frame, this.lineWidth[actionID].length)];
    this.resultPath.strokeStyle = this.strokeStyle[actionID][Math.min(frame, this.strokeStyle[actionID].length)];
    this.resultPath.fillStyle = this.fillStyle[actionID][Math.min(frame, this.fillStyle[actionID].length)];
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, path2D, isMask) {
    this.resultPath.pathData.forEach(d=>{
      let pos = d.pos;
      let ratio = pathContainer.pathRatio;
      switch(d.type) {
        case "M":
          path2D.moveTo(pos[0]*ratio, pos[1]*ratio);
          break;
        case "L":
          path2D.lineTo(pos[0]*ratio, pos[1]*ratio);
          break;
        case "C":
          path2D.bezierCurveTo(pos[0]*ratio, pos[1]*ratio, pos[2]*ratio, pos[3]*ratio, pos[4]*ratio, pos[5]*ratio);
          break;
        case "Z":
          path2D.closePath();
          break;
        default:
          console.error("unknown type");
          break;
      }
    });
    if(isMask) return;
    if(!!this.resultPath.lineWidth) {
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = this.resultPath.lineWidth;
      context.strokeStyle = this.resultPath.strokeStyle;
      context.stroke(path2D);
    }
    context.fillStyle = this.resultPath.fillStyle;
    context.fill(path2D, this.fillRule);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   */
  debugDraw(pathContainer, context) {
    let tau = Math.PI*2;
    
    let showPos =(x, y)=> {
      if(!DebugPath.isShowPoints) return;
      let path2D = new Path2D();
      path2D.arc(x, y, DebugPath.pointSize, 0, tau);
      context.fillStyle = DebugPath.pointColor;
      context.fill(path2D, "nonzero");
    };
    
    let showControl =(x0, y0, x1, y1)=> {
      if(!DebugPath.isShowControls) return;
      let path2D = new Path2D();
      path2D.arc(x0, y0, DebugPath.controlSize, 0, tau);
      path2D.arc(x1, y1, DebugPath.controlSize, 0, tau);
      context.fillStyle = DebugPath.controlColor;
      context.fill(path2D, "nonzero");
    };
    
    this.resultPath.pathData.forEach(d=>{
      let pos = d.pos;
      let ratio = pathContainer.pathRatio;
      switch(d.type) {
        case "M":
          showPos(pos[0]*ratio, pos[1]*ratio);
          break;
        case "L":
          showPos(pos[0]*ratio, pos[1]*ratio);
          break;
        case "C":
          showControl(pos[0]*ratio, pos[1]*ratio, pos[2]*ratio, pos[3]*ratio);
          showPos(pos[4]*ratio, pos[5]*ratio);
          break;
        case "Z":
          break;
        default:
          console.error("unknown type");
          break;
      }
    });
  };
};

