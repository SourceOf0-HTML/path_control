
class PathObj {
  constructor(maskIdToUse, pathDataList, pathDiffList, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.pathDiffList = new ActionContainer(pathDiffList, val=>Array.isArray(val) && val.some(v=>Array.isArray(v)));  // diff pos data array
    this.fillStyle = new ActionContainer(fillStyle, val=>typeof val === "string");  // fillColor ( context2D.fillStyle )
    this.lineWidth = new ActionContainer(lineWidth, val=>Number.isFinite(val));  // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = new ActionContainer(strokeStyle, val=>typeof val === "string");  // strokeColor ( context2D.strokeStyle )
    this.resultPathList = pathDataList;  // path data for drawing
    this.defPathList = pathDataList;     // default path data
  };
  
  addAction(pathDataList, fillStyle, lineWidth, strokeStyle, frame, actionID) {
    if(!pathDataList) {
      pathDataList = this.defPathList.slice();
    } else if(this.defPathList.length != pathDataList.length) {
      console.error("The number of paths does not match.");
      console.log(this.defPathList);
      console.log(pathDataList);
      pathDataList = this.defPathList.slice();
    }
    
    let pathDiffList = [];
    this.defPathList.forEach((d, i)=>{
      if(d.type != pathDataList[i].type) {
        console.error("type does not match.");
        console.log(this.defPathList);
        console.log(pathDataList);
        return;
      }
      if(!d.pos) return;
      pathDiffList[i] = [];
      d.pos.forEach((val, j)=>{
        pathDiffList[i].push(pathDataList[i].pos[j] - val);
      });
    });
    
    this.pathDiffList.addAction(pathDiffList, actionID, frame);
    this.fillStyle.addAction(fillStyle, actionID, frame);
    this.lineWidth.addAction(lineWidth, actionID, frame);
    this.strokeStyle.addAction(strokeStyle, actionID, frame);
  };
  
  /**
   * @param {Array} pathDiffList
   * @return {Array} - pathDataList
   */
  makeData(pathDiffList) {
    let ret = [];
    this.defPathList.forEach((d, i)=>{
      ret.push({
        type: d.type,
        pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
      });
    });
    return ret;
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getPathDataList(frame = 0, actionID = 0) {
    return this.makeData(this.pathDiffList.getAvailableData(actionID, frame));
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getMergePathDataList(pathContainer, frame = 0, actionID = 0) {
    if(!this.pathDiffList.hasAction) {
      return this.makeData(this.pathDiffList.getData());
    }
    
    if(!this.pathDiffList.hasActionID(actionID)) {
      actionID = 0;
      frame = 0;
    }
    
    let pathDataList = this.makeData(this.pathDiffList.getAvailableData(actionID, frame));
    if(pathContainer.actionList.length == 1) {
      return pathDataList;
    }
    
    pathContainer.actionList.forEach(action=>{
      if(actionID == action.id) return;
      if(!this.pathDiffList.hasActionID(action.id)) return;
      this.pathDiffList.getAvailableData(action.id, action.currentFrame).forEach((list, i)=>{
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
   * @param {PathContainer} pathContainer
   * @param {Array} flexiIDs - used to transform with flexi bone IDs
   */
  calcFlexi(pathContainer, flexiIDs) {
    this.resultPathList.forEach(d=> {
      if(!d.pos || d.pos.length == 0) return;
      let points = d.pos;
      let pointsNum = points.length;
      for(let i = 0; i < pointsNum; i += 2) {
        if(flexiIDs.length == 1) {
          let id = flexiIDs[0];
          if(pathContainer.groups[id].strength == 0) continue;
          pathContainer.groups[id].effectSprite.getMatrix().applyToPoint(points, i);
          continue;
        }
        
        let x = points[i];
        let y = points[i+1];
        
        let ratioList = [];
        let sum = 0;
        flexiIDs.forEach(id=>{
          let val = pathContainer.groups[id].getInfluence(x, y);
          sum += val;
          ratioList.push(val);
        });
        
        if(sum == 0) continue;
        
        points[i] = 0;
        points[i+1] = 0;
        
        flexiIDs.forEach((id, j)=>{
          pathContainer.groups[id].effectSprite.getMatrix().multAndAddPoint(1 - ratioList[j]/sum, x, y, points, i);
        });
      }
    });
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   */
  update(frame, actionID, pathContainer, matrix) {
    let pathDataList = this.getMergePathDataList(pathContainer, frame, actionID);
    
    pathDataList.forEach(d=>{
      if(!!d.pos) matrix.applyToArray(d.pos);
    });
    
    this.resultPathList = pathDataList;
    
    this.fillStyle.update(pathContainer, actionID, frame);
    this.lineWidth.update(pathContainer, actionID, frame);
    this.strokeStyle.update(pathContainer, actionID, frame);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, path2D, isMask) {
    this.resultPathList.forEach(d=>{
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
    if(!!this.lineWidth.result) {
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = this.lineWidth.result;
      context.strokeStyle = this.strokeStyle.result;
      context.stroke(path2D);
    }
    context.fillStyle = this.fillStyle.result;
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
    
    this.resultPathList.forEach(d=>{
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

