@echo off
SETLOCAL

set DEFINES=/DMONGOOSE_NO_AUTH /DMONGOOSE_NO_CGI /DMONGOOSE_NO_DAV /DMONGOOSE_NO_DIRECTORY_LISTING /DMONGOOSE_NO_WEBSOCKET
set CLPATH=c:\Program Files (x86)\Microsoft Visual Studio 12.0\VC\bin

echo Building
call "%CLPATH%\vcvars32.bat"
call "%CLPATH%\cl.exe" server.c mongoose.c /W3 /Fewindows_server.exe /TC /MT %DEFINES%
del server.obj mongoose.obj
echo Done
