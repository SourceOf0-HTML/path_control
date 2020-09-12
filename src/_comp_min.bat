set CORE_SRC=temp\core_source.min.js
set DEBUG_SRC=temp\debug_source.min.js


set DIR_PATH=..\js\path_control\

set BIN_FILE=%DIR_PATH%path_control.min.js
del %BIN_FILE%
echo let path_control = ` >> %BIN_FILE%
type %CORE_SRC% >> %BIN_FILE%
echo ` >> %BIN_FILE%
type path_main.js >> %BIN_FILE%

set BIN_DEBUG_FILE=%DIR_PATH%path_control_debug.min.js
del %BIN_DEBUG_FILE%
echo let path_control=` >> %BIN_DEBUG_FILE%
type %DEBUG_SRC% >> %BIN_DEBUG_FILE%
echo ` >> %BIN_DEBUG_FILE%
type path_main.js >> %BIN_DEBUG_FILE%

set SVG_FILE=%DIR_PATH%path_control_svg.min.js
del %SVG_FILE%
echo let path_control = ` >> %SVG_FILE%
type %DEBUG_SRC% >> %SVG_FILE%
echo ` >> %SVG_FILE%
echo let path_load_svg_worker = ` >> %SVG_FILE%
type path_load_svg_worker.js >> %SVG_FILE%
echo ` >> %SVG_FILE%
type path_main.js >> %SVG_FILE%
type path_svg_loader.js >> %SVG_FILE%

