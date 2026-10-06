; Escolha Servidor vs Terminal no instalador Windows (NSIS / electron-builder)
!macro customInstall
  MessageBox MB_YESNOCANCEL|MB_ICONQUESTION "Como este computador será usado?$\n$\nSim = Servidor da loja (banco e rede)$\nNão = Terminal (caixa, rampa…)$\nCancelar = definir na primeira abertura do app" IDYES writeServer IDNO writeTerminal IDCANCEL done
  writeServer:
    StrCpy $9 "server"
    Goto persistRole
  writeTerminal:
    StrCpy $9 "terminal"
    Goto persistRole
  persistRole:
    ReadEnvStr $0 "APPDATA"
    CreateDirectory "$0\Canela"
    FileOpen $1 "$0\Canela\install-role.txt" w
    FileWrite $1 $9
    FileClose $1
  done:
!macroend
