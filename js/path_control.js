
var PathCtr = {
  
  initTarget: null,  // instance to be initialized
  
   /**
    * GroupObj constructor
    */
   GroupObj: function(id, paths, maskIdToUse) {
     this.type = "group";
     this.id = id;                   // group ID
     this.paths = paths;             // path object array ( contains group objects )
     this.maskIdToUse = maskIdToUse; // ID of the mask to use
   },
   
   /**
    * PathObj constructor
    */
   PathObj: function(pathDataList, maskIdToUse, fillRule, fillStyle, lineWidth, strokeStyle) {
     this.type = "path";
     this.pathDataList = pathDataList;  // path data array
     this.maskIdToUse = maskIdToUse;    // ID of the mask to use
     this.fillRule = fillRule;          // "nonzero" or "evenodd"
     this.fillStyle = fillStyle;        // fillColor ( context2D.fillStyle )
     this.lineWidth = lineWidth;        // strokeWidth ( context2D.lineWidth )
     this.strokeStyle = strokeStyle;    // strokeColor ( context2D.strokeStyle )
   },
   
   /**
    * PathContainer constructor
    */
   PathContainer : function() {
     this.context = null;    // CanvasRenderingContext2D ( canvas.getContext("2d") )
     this.rootGroups = [];   // root group
     this.groups = {};       // list of groups
     this.masks = {};        // list of defined mask IDs
   },
   
  /**
   * @param maskStr : mask attribute of element
   * @return string of mask ID
   */
  getMaskId: function(maskStr) {
    if(!maskStr) {
      return "";
    } else {
      return maskStr.replace(/^url\(#/, "").replace(/\)$/, "");
    }
  },
  
  /**
   * @param dataDOM : d attribute of path element
   * @return list of path data
   */
  makeDataList: function(dataDOM) {
    let ret = [];
    
    let data;
    if(dataDOM.indexOf(",") < 0) {
      data = dataDOM.split(/ /);
    } else {
      data = dataDOM.replace(/([MCZ])/g,",$1,").replace(/[^,]-/g,",-").split(/[, ]/);
    }
    
    let getD=()=>parseFloat(data.shift());
    
    while(data.length > 0) {
      switch(data.shift()) {
        case "M":
          // USEGE : path2D.moveTo(pos[0], pos[1])
          ret.push({type:"M", pos:[getD(), getD()]});
          break;
        case "C":
          // USEGE : path2D.bezierCurveTo(pos[0], pos[1], pos[2], pos[3], pos[4], pos[5])
          ret.push({type:"C", pos:[getD(), getD(), getD(), getD(), getD(), getD()]});
          break;
        case "Z":
          // USEGE : path2D.closePath()
          ret.push({type:"Z"});
          break;
        default:
          break;
      }
    }
    return ret;
  },
  
  /**
   * @param pathDOM : path element
   * @param style   : CSSStyleDeclaration ( window.getComputedStyle(pathDOM) )
   * @return PathObj
   */
  makePath: function(pathDOM, style) {
    let fillStyle = style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = style.stroke;
    if(strokeStyle == "none") {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
      strokeStyle = "transparent";
    }
    return new this.PathObj(
      this.makeDataList(pathDOM.getAttribute("d")),
      this.getMaskId(pathDOM.getAttribute("mask")),
      style.fillRule,
      fillStyle,
      lineWidth,
      strokeStyle,
    );
  },
  
  /**
   * @param groupDOM : group element
   * @return GroupObj
   */
  makeGroup: function(groupDOM) {
    let id = groupDOM.getAttribute("id");
    let children = groupDOM.children;
    let paths = [];
    let childNum = children.length;
    for(let i = 0; i < childNum; ++i) {
      let child = children[i];
      let name = child.tagName;
      switch(name) {
        case "path":
          paths.push( this.makePath(child, window.getComputedStyle(child)) );
          break;
        case "mask":
          let maskNum = child.children.length;
          for(let j = 0; j < maskNum; ++j) {
            let maskChild = child.children[j];
            if( maskChild.tagName == "use" ) {
              this.initTarget.masks[child.getAttribute("id")] = maskChild.getAttribute("xlink:href").slice(1);
            } else {
              console.error("unknown mask data");
              console.log(maskChild);
            }
          }
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          paths.push( this.makeGroup(child) );
          break;
        default:
          console.error("unknown element");
          console.log(child);
          break;
      }
    }
    
    let ret = new this.GroupObj(
      id,
      paths,
      this.getMaskId(groupDOM.getAttribute("mask"))
    );
    
    this.initTarget.groups[id] = ret;
    
    return ret;
  },
  
  /**
   * @param groupsDOM : root group elements
   * @param context  : CanvasRenderingContext2D ( canvas.getContext("2d") )
   * @return PathContainer
   */
  initFromSvg: function(groupsDOM) {
    if(!groupsDOM) {
      console.error("groups dom is not found");
      return null;
    }
    
    let ret = this.initTarget = new this.PathContainer();
    let domNum = groupsDOM.length;
    for(let i = 0; i < domNum; ++i) {
      if(groupsDOM[i].tagName != "g") continue;
      ret.rootGroups.push(this.makeGroup(groupsDOM[i]));
    }
    this.initTarget = null;
    
    return ret;
  },
  
  /**
   * @param buffer  : ArrayBuffer
   * @return PathContainer
   */
  initFromBin: function(buffer) {
    if(!buffer) {
      console.error("array buffer is not found");
      return null;
    }
    //console.log(buffer);
    let ret = new this.PathContainer();
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    let getUint8  =val=>{let ret = dv.getUint8(sumLength); sumLength += 1; return ret};
    let getUint16 =val=>{let ret = dv.getUint16(sumLength); sumLength += 2; return ret};
    let getUint32 =val=>{let ret = dv.getUint32(sumLength); sumLength += 4; return ret};
    let getFloat32=val=>{let ret = dv.getFloat32(sumLength); sumLength += 4; return ret};
    let getString=()=>{
      let num = getUint8();
      let ret = "";
      for(let i = 0; i < num; ++i) {
        ret += String.fromCharCode(getUint16());
      }
      return ret;
    };
    let getColor=()=>{
      let a = getUint8();
      if(a == 0) {
        return "transparent";
      }
      let str = "rgb(" + getUint8() + ", " + getUint8() + ", " + getUint8() + ")";
      return str;
    };
    
    // get masks
    let maskNum = getUint8();
    for(let i = 0; i < maskNum; ++i) {
      ret.masks[getString()] = getString();
    }
    
    let getPath=()=>{
      let type = getUint8();
      if(type == 0) { // group
        return getGroup();
      }
      let maskIdToUse = getString();
      let fillRule = (getUint8() == 0 ? "nonzero" : "evenodd");
      let lineWidth = getFloat32();
      let fillStyle = getColor();
      let strokeStyle = getColor();
      let pathDataListNum = getUint32();
      let pathDataList = [];
      let getD=()=>getFloat32();
      for(let i = 0; i < pathDataListNum; ++i) {
        let pathType = getUint8();
        switch(pathType) {
          case 0:  // M
            pathDataList.push({type:"M", pos:[getD(), getD()]});
            break;
          case 1:  // C
            pathDataList.push({type:"C", pos:[getD(), getD(), getD(), getD(), getD(), getD()]});
            break;
          case 2:  // Z
            pathDataList.push({type:"Z"});
            break;
          default:
            break;
        }
      }
      return new this.PathObj(
        pathDataList,
        maskIdToUse,
        fillRule,
        fillStyle,
        lineWidth,
        strokeStyle,
      );
    };
    let getGroup=()=>{
      let id = getString();
      let maskIdToUse = getString();
      let pathsNum = getUint32();
      let paths = [];
      for(let i = 0; i < pathsNum; ++i) {
        paths.push(getPath());
      }
      let group = ret.groups[id] = new this.GroupObj(
        id,
        paths,
        maskIdToUse
      );
      //console.log(id);
      return group;
    };
    for(let i = getUint8(); i > 0; --i) {
      ret.rootGroups.push(getGroup());
    }
    
    return ret;
  },
  
  /**
   * @param pathContainer : PathContainer
   * @return ArrayBuffer
   */
  dataTobin: function(pathContainer) {
    if(!pathContainer) {
      console.error("path container is not found");
      return null;
    }
    
    let buffer = new ArrayBuffer(100000);
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    let setUint8  =val=>{dv.setUint8(sumLength, val); sumLength += 1};
    let setUint16 =val=>{dv.setUint16(sumLength, val); sumLength += 2};
    let setUint32 =val=>{dv.setUint32(sumLength, val); sumLength += 4};
    let setFloat32=val=>{dv.setFloat32(sumLength, val); sumLength += 4};
    let setString=str=>{
      setUint8(str.length);
      let arr = [].map.call(str, c=>setUint16(c.charCodeAt(0)));
    };
    let setColor=str=>{
      if(str == "transparent") {
        setUint8(0);  // A
      } else {
        let colorArr = str.match(/(\d+), (\d+), (\d+)/);
        setUint8(1);  // A
        setUint8(colorArr[1]);  // R
        setUint8(colorArr[2]);  // G
        setUint8(colorArr[3]);  // B
      }
    };
    
    // set masks
    setUint8(Object.keys(pathContainer.masks).length);
    Object.keys(pathContainer.masks).forEach(key=>{
      setString(key);
      setString(pathContainer.masks[key]);
    });
    
    let setPath=path=>{
      if(path.type == "group") {
        setUint8(0);  // type
        setGroup(path);
      } else {
        setUint8(1);  // type
        setString(path.maskIdToUse);
        setUint8(path.fillRule == "nonzero" ? 0 : 1);
        setFloat32(path.lineWidth);
        setColor(path.fillStyle);
        setColor(path.strokeStyle);
        setUint32(path.pathDataList.length);
        path.pathDataList.forEach(d=>{
          let i = 0;
          switch(d.type) {
            case "M":
              setUint8(0);
              setFloat32(d.pos[0]);
              setFloat32(d.pos[1]);
              break;
            case "C":
              setUint8(1);
              for(let i = 0; i < 6; ++i) {
                setFloat32(d.pos[i]);
              }
              break;
            case "Z":
              setUint8(2);
              break;
            default:
              break;
          }
        });
      }
    };
    let setGroup=group=>{
      console.log(group.id);
      setString(group.id);
      setString(group.maskIdToUse);
      setUint32(group.paths.length);
      group.paths.forEach(setPath);
      console.log(sumLength);
    };
    let rootGroupNum = pathContainer.rootGroups.length;
    setUint8(pathContainer.rootGroups.length);
    pathContainer.rootGroups.forEach(group=>{
      setGroup(group);
    });
    
    return buffer.slice(0, sumLength);
  },
};

PathCtr.PathContainer.prototype = {
  
  /**
   * @param targetGroups : search target groups
   * @param id           : mask ID to search
   * @return mask group object
   */
  getMaskGroup: function(id) {
    let refId = this.masks[id];
    if(!!refId) {
      return this.groups[refId];
    } else {
      console.error("mask is not found : " + id);
    }
    return null;
  },
  
  /**
   * @param group  : group object to be draw
   * @param isMask : when true, draw as a mask
   */
  drawGroup: function(group, isMask = false) {
    if(!this.context) {
      console.error("context is not found");
      return;
    }
    
    let isFoundMask = false;
    
    if(!isMask && !!group.maskIdToUse) {
      let mask = this.getMaskGroup(group.maskIdToUse);
      if(!!mask) {
        isFoundMask = true;
        this.context.save();
        this.drawGroup(mask, true);
      } else {
        console.log("group is not found : " + group.maskIdToUse);
      }
    }
    
    let path2D = isMask? (new Path2D()):0;
    let isUsed = false;
    
    if(!!group.paths) {
      group.paths.forEach(path=>{
        
        if(path.type == "group") {
          this.drawGroup(path, isMask);
          return;
        }
        isUsed = true;
        
        let isFoundMaskPath = false;
        
        if(!isMask && !!path.maskIdToUse) {
          let maskPath = this.getMaskGroup(path.maskIdToUse);
          if(!!maskPath) {
            isFoundMaskPath = true;
            this.context.save();
            this.drawGroup(maskPath, true);
          } else {
            console.log("mask is not found : " + path.maskIdToUse);
          }
        }
        
        if(!isMask) {
          path2D = new Path2D();
        }
        
        path.pathDataList.forEach(d=>{
          let i = 0;
          switch(d.type) {
            case "M":
              path2D.moveTo(d.pos[i++], d.pos[i++]);
              break;
            case "C":
              path2D.bezierCurveTo(d.pos[i++], d.pos[i++], d.pos[i++], d.pos[i++], d.pos[i++], d.pos[i++]);
              break;
            case "Z":
              path2D.closePath();
              break;
            default:
              break;
          }
        });
        
        if(!isMask) {
          if(path.lineWidth > 0) {
            this.context.lineWidth = path.lineWidth;
            this.context.strokeStyle = path.strokeStyle;
            this.context.stroke(path2D);
          }
          this.context.fillStyle = path.fillStyle;
          this.context.fill(path2D, path.fillRule);
        }
        
        if(isFoundMaskPath) {
          this.context.restore();
        }
      });
    }
    
    if(isMask && isUsed) {
      this.context.clip(path2D);
    }
    
    if(isFoundMask) {
      this.context.restore();
    }
  },
  
  draw: function() {
    if(!this.rootGroups) {
      console.error("root groups is not found");
      return;
    }
    this.rootGroups.forEach(group=>{
      this.drawGroup(group);
    });
  },
};

