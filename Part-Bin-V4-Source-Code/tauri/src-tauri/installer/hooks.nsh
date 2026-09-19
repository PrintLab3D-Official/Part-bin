; Parts Bin installer hooks (Tauri NSIS). Two plain-English warnings so nobody
; loses an inventory: one before installing (older versions keep their data
; separately), one before uninstalling (this is the moment to back up).
; Both are skipped in a silent (/S) install/uninstall via /SD.

!macro NSIS_HOOK_PREINSTALL
  MessageBox MB_ICONINFORMATION|MB_OK "Coming from an older Parts Bin (V3 or earlier)?$\r$\n$\r$\nYour old inventory stays inside the old version. Before you remove it, open it and use Settings, Backup to file, to save a copy. Parts Bin V4 will ask to import that file the first time it opens.$\r$\n$\r$\nAlready on V4? Your data is kept and this update leaves it untouched." /SD IDOK
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  MessageBox MB_ICONEXCLAMATION|MB_YESNO|MB_DEFBUTTON2 "You are about to remove Parts Bin.$\r$\n$\r$\nIf you have not saved a backup of your inventory (Settings, Data and backup, Backup to file), do that first. A backup is the only way to get your data back later.$\r$\n$\r$\nRemove Parts Bin now?" /SD IDYES IDYES +2
  Abort
!macroend
