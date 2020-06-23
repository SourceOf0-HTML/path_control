
set OUTPUT_FILE=path_control.js
del %OUTPUT_FILE%
type org\PathCtr.js >> %OUTPUT_FILE%
type org\Matrix.js >> %OUTPUT_FILE%
type org\Sprite.js >> %OUTPUT_FILE%
type org\PathObj.js >> %OUTPUT_FILE%
type org\GroupObj.js >> %OUTPUT_FILE%
type org\BoneObj.js >> %OUTPUT_FILE%
type org\PathContainer.js >> %OUTPUT_FILE%
type org\BinaryLoader.js >> %OUTPUT_FILE%

set DEBUG_FILE=path_control_debug.js
del %DEBUG_FILE%
type %OUTPUT_FILE% >> %DEBUG_FILE%
type org\DebugPath.js >> %DEBUG_FILE%


set SVG_FILE=path_control_svg.js
del %SVG_FILE%
type %DEBUG_FILE% >> %SVG_FILE%
type org\SVGLoader.js >> %SVG_FILE%
