; Best-effort cleanup for assisted upgrades.
; electron-builder inserts preInit at the beginning of NSIS .OnInit,
; before its default running-application check. taskkill returns a non-zero
; status when the application is already stopped; both outputs are ignored.
!macro preInit
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /T /IM "AI-Legal-Advisor.exe"'
  Pop $0
  Pop $1
!macroend

!macro customInit
  ; Keep the hook explicit so future installer changes do not remove the
  ; upgrade cleanup without a visible source-level diff.
!macroend

!macro customUnInstall
  ; The uninstall path is also allowed to remove a stale process from an
  ; interrupted upgrade, but never blocks when it is already absent.
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /T /IM "AI-Legal-Advisor.exe"'
  Pop $0
  Pop $1
!macroend
