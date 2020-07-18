
class PathObj {
  constructor(maskIdToUse, pathDataList, pathDiffList, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.pathDiffList = pathDiffList;  // diff pos data array
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.fillStyle = fillStyle;        // fillColor ( context2D.fillStyle )
    this.lineWidth = lineWidth;        // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = strokeStyle;    // strokeColor ( context2D.strokeStyle )
    this.hasActionList = [];           // if true, have action
    this.resultPath = {                // path data for drawing
      pathDataList,
      fillStyle,
      lineWidth,
      strokeStyle,
    };
    
    this.defPath = {                   // default path data
      pathDataList,
      fillStyle,
      lineWidth,
      strokeStyle,
    };
  };
  
  addAction(pathDataList, fillStyle, lineWidth, strokeStyle, frame, actionID) {
    if(!pathDataList) {
      pathDataList = this.defPath.pathDataList.slice();
    } else if(this.defPath.pathDataList.length != pathDataList.length) {
      console.error("The number of paths does not match.");
      console.log(this.defPath.pathDataList);
      console.log(pathDataList);
      pathDataList = this.defPath.pathDataList.slice();
    }
    
    let pathDiffList = [];
    this.defPath.pathDataList.forEach((d, i)=>{
      if(d.type != pathDataList[i].type) {
        console.error("type does not match.");
        console.log(this.defPath.pathDataList);
        console.log(pathDataList);
        return;
      }
      if(!d.pos) return;
      pathDiffList[i] = [];
      d.pos.forEach((val, j)=>{
        pathDiffList[i].push(pathDataList[i].pos[j] - val);
      });
    });
    
    if( this.hasActionList.length == 0 ) {
      // init action data
      this.pathDiffList = [[this.pathDiffList]];  // path data array
      this.fillStyle = [[this.fillStyle]];        // fillColor ( context2D.fillStyle )
      this.lineWidth = [[this.lineWidth]];        // strokeWidth ( context2D.lineWidth )
      this.strokeStyle = [[this.strokeStyle]];    // strokeColor ( context2D.strokeStyle )
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.pathDiffList[actionID] = [this.pathDiffList[0][0]];
      this.fillStyle[actionID] = [this.fillStyle[0][0]];
      this.lineWidth[actionID] = [this.lineWidth[0][0]];
      this.strokeStyle[actionID] = [this.strokeStyle[0][0]];
      this.hasActionList[actionID] = true;
    }
    
    this.pathDiffList[actionID][frame] = pathDiffList;
    
    let isEmpty = true;
    for(let i = this.lineWidth[actionID].length - 1; i >= 0; --i) {
      if(typeof this.lineWidth[actionID][i] === "undefined") continue;
      if(this.lineWidth[actionID][i] == lineWidth) break;
      this.lineWidth[actionID][frame] = lineWidth;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.lineWidth[actionID][frame] = undefined;
    } else {
      isEmpty = true;
    }
    
    for(let i = this.strokeStyle[actionID].length - 1; i >= 0; --i) {
      if(typeof this.strokeStyle[actionID][i] === "undefined") continue;
      if(this.strokeStyle[actionID][i] == strokeStyle) break;
      this.strokeStyle[actionID][frame] = strokeStyle;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.strokeStyle[actionID][frame] = undefined;
    } else {
      isEmpty = true;
    }
    
    for(let i = this.fillStyle[actionID].length - 1; i >= 0; --i) {
      if(typeof this.fillStyle[actionID][i] === "undefined") continue;
      if(this.fillStyle[actionID][i] == fillStyle) break;
      this.fillStyle[actionID][frame] = fillStyle;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.fillStyle[actionID][frame] = undefined;
    } else {
      isEmpty = true;
    }
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getPathDataList(frame = 0, actionID = 0) {
    let ret = [];
    
    let makeData =(pathDiffList)=> {
      this.defPath.pathDataList.forEach((d, i)=>{
        ret.push({
          type: d.type,
          pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
        });
      });
      return ret;
    }
    
    if( this.hasActionList.length == 0 ) {
      return makeData(this.pathDiffList);
    }
    if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    return makeData(this.pathDiffList[actionID][Math.min(frame, this.pathDiffList[actionID].length)]);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getMergePathDataList(pathContainer, frame = 0, actionID = 0) {
    let ret = [];
    
    let makeData =(pathDiffList)=> {
      this.defPath.pathDataList.forEach((d, i)=>{
        ret.push({
          type: d.type,
          pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
        });
      });
      return ret;
    }
    
    if( this.hasActionList.length == 0 ) {
      return makeData(this.pathDiffList);
    }
    
    if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    let pathDataList = makeData(this.pathDiffList[actionID][Math.min(frame, this.pathDiffList[actionID].length)]);
    
    if(pathContainer.actionList.length == 1) return pathDataList;
    
    pathContainer.actionList.forEach(action=>{
      if(actionID == action.id) return;
      if( !this.hasActionList[action.id] ) return;
      frame = action.currentFrame;
      
      this.pathDiffList[action.id][Math.min(frame, this.pathDiffList[action.id].length)].forEach((list, i)=>{
        if(!list) return;
        list.forEach((val, j)=>{
          if(!val) return;
          pathDataList[i].pos[j] += val;
        });
      });
    });
    return pathDataList;
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   */
  update(frame, actionID, pathContainer, matrix) {
    let updatePath =d=>{
      if(!!d.pos) matrix.applyToArray(d.pos);
    };
    
    let pathDataList = this.getMergePathDataList(pathContainer, frame, actionID);
    pathDataList.forEach(updatePath);
    this.resultPath.pathDataList = pathDataList;
    
    if( this.hasActionList.length == 0) {
      this.resultPath.lineWidth = this.lineWidth;
      this.resultPath.strokeStyle = this.strokeStyle;
      this.resultPath.fillStyle = this.fillStyle;
      return;
    } else if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    
    let lineWidth, strokeStyle, fillStyle;
    
    pathContainer.actionList.forEach(action=>{
      if(action.pastFrame == action.currentFrame) return;
      
      let targetActionID = action.id;
      if( actionID != 0 && targetActionID == 0) return;
      if( !this.hasActionList[targetActionID] ) return;
      
      let targetLineWidth = this.lineWidth[targetActionID];
      let targetStrokeStyle = this.strokeStyle[targetActionID];
      let targetFillStyle = this.fillStyle[targetActionID];
      
      let setData=()=>{
        if(typeof lineWidth === "undefined") lineWidth = targetLineWidth[Math.min(frame, targetLineWidth.length)];
        if(!strokeStyle) strokeStyle = targetStrokeStyle[Math.min(frame, targetStrokeStyle.length)];
        if(!fillStyle) fillStyle = targetFillStyle[Math.min(frame, targetFillStyle.length)];
      };
      
      if(action.pastFrame <= action.currentFrame) {
        for(frame = action.currentFrame; frame >= action.pastFrame; --frame) setData();
      } else {
        for(frame = action.pastFrame; frame >= action.currentFrame; --frame) setData();
        if(typeof lineWidth !== "undefined") {
          lineWidth = null;
          for(frame = action.currentFrame; frame >= 0; --frame) {
            lineWidth = targetLineWidth[Math.min(frame, targetLineWidth.length)];
            if(typeof lineWidth !== "undefined") break;
          }
        }
        if(!!strokeStyle) {
          strokeStyle = null;
          for(frame = action.currentFrame; frame >= 0; --frame) {
            strokeStyle = targetStrokeStyle[Math.min(frame, targetStrokeStyle.length)];
            if(!!strokeStyle) break;
          }
        }
        if(!!fillStyle) {
          fillStyle = null;
          for(frame = action.currentFrame; frame >= 0; --frame) {
            fillStyle = targetFillStyle[Math.min(frame, targetFillStyle.length)];
            if(!!fillStyle) break;
          }
        }
      }
    });
    if(!!lineWidth) this.resultPath.lineWidth = lineWidth;
    if(!!strokeStyle) this.resultPath.strokeStyle = strokeStyle;
    if(!!fillStyle) this.resultPath.fillStyle = fillStyle;
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, path2D, isMask) {
    this.resultPath.pathDataList.forEach(d=>{
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
    
    this.resultPath.pathDataList.forEach(d=>{
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

