; Servidor vs Terminal — sem parenteses no texto (NSIS quebra o MessageBox)
!macro customInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Este PC sera o SERVIDOR da loja?$\r$\n$\r$\nSim = Servidor$\r$\nNao = Terminal" IDYES roleServer IDNO roleTerminal
  roleServer:
    StrCpy $9 "server"
    Goto rolePersist
  roleTerminal:
    StrCpy $9 "terminal"
    Goto rolePersist
  rolePersist:
    ReadEnvStr $0 "APPDATA"
    CreateDirectory "$0\Canela"
    FileOpen $1 "$0\Canela\install-role.txt" w
    FileWrite $1 $9
    FileClose $1
!macroend
