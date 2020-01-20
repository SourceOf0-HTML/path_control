
SVG_DATA = {
  
  masks: {},  /* list of defined mask IDs */
  groups: {}, /* groups list */
  
  /*
    @param targetGroups : search target groups
    @param id     : mask ID to search
  */
  getMaskGroup: function(id) {
    let refId = SVG_DATA.masks[id];
    if(!!refId) {
      return SVG_DATA.groups[refId];
    } else {
      console.log("mask is not found : " + id);
    }
    return null;
  },
  
  /*
    @param mask : mask attribute of element
  */
  getMaskId: function(mask) {
    if(!mask) {
      return "";
    } else {
      return mask.replace(/^url\(#/, "").replace(/\)$/, "");
    }
  },
  
  /*
    @param data : d attribute of path element
  */
  makeDataList: function(data) {
    let ret = [];
    let getD=()=>parseFloat(data.shift());
    
    if(data.indexOf(",") < 0) {
      data = data.split(/ /);
    } else {
      data = data.replace(/([MCZ])/g,",$1,").split(/[, ]/);
    }
    
    while(data.length > 0) {
      switch(data.shift()) {
        case "M":
          /* USEGE : path2D.moveTo(pos[0], pos[1]) */
          ret.push({type:"M", pos:[getD(), getD()]});
          break;
        case "C":
          /* USEGE : path2D.bezierCurveTo(pos[0], pos[1], pos[2], pos[3], pos[4], pos[5]) */
          ret.push({type:"C", pos:[getD(), getD(), getD(), getD(), getD(), getD()]});
          break;
        case "Z":
          /* USEGE : path2D.closePath() */
          ret.push({type:"Z"});
          break;
        default:
          break;
      }
    }
    
    return ret;
  },
  
  /*
    @param path  : path element
    @param style : CSSStyleDeclaration ( window.getComputedStyle(path) )
  */
  makePath: function(path, style) {
    let fillStyle = style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = style.stroke;
    if(strokeStyle == "none") {
      lineWidth = style.strokeWidth;
      strokeStyle = "transparent";
    }
    
    return {
      type: "path",
      pathDataList  : SVG_DATA.makeDataList(path.getAttribute("d")),   /* path data array */
      maskIdToUse   : SVG_DATA.getMaskId(path.getAttribute("mask")),   /* ID of the mask to use */
      fillRule      : style.fillRule,  /* "evenodd" or "nonzero" */
      fillStyle,   /* fillColor ( context2D.fillStyle ) */
      lineWidth,   /* strokeWidth ( context2D.lineWidth ) */
      strokeStyle, /* strokeColor ( context2D.strokeStyle ) */
    };
  },
  
  /*
    @param group : group element
  */
  makeGroup: function(group) {
    let id = group.getAttribute("id");
    let children = group.children;
    let paths = [];
    for(let i = 0; i < children.length; ++i) {
      let child = children[i];
      let name = child.tagName;
      switch(name) {
        case "path":
          paths.push( SVG_DATA.makePath(child, window.getComputedStyle(child)) );
          break;
        case "mask":
          for(let j = 0; j < child.children.length; ++j) {
            let maskChild = child.children[j];
            if( maskChild.tagName == "use" ) {
              SVG_DATA.masks[child.getAttribute("id")] = maskChild.getAttribute("xlink:href").slice(1);
            } else {
              console.log("unknown mask data");
              console.log(maskChild);
            }
          }
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          paths.push( SVG_DATA.makeGroup(child) );
          break;
        default:
          console.log("unknown element");
          console.log(child);
          break;
      }
    }
    
    let ret = {
      type: "group",
      id,     /* group ID */
      paths,  /* path array ( contains groups ) */
      maskIdToUse : SVG_DATA.getMaskId(group.getAttribute("mask")),  /* ID of the mask to use */
    };
    
    SVG_DATA.groups[id] = ret;
    
    return ret;
  },
};

