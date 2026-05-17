# Example: App Residue After Uninstall

Dragging a macOS app to the Trash often removes the visible application bundle but leaves behind support files.

Common residue locations include:

- `~/Library/Application Support`
- `~/Library/Caches`
- `~/Library/Containers`
- `~/Library/Group Containers`
- `~/Library/HTTPStorages`
- `~/Library/Logs`
- `~/Library/Preferences`
- `~/Library/Saved Application State`
- `~/Library/Application Support/com.apple.sharedfilelist`
- `/Library/LaunchAgents`
- `/Library/LaunchDaemons`
- `/Library/PrivilegedHelperTools`
- `/Library/Audio/Plug-Ins/HAL`
- package receipts visible through `pkgutil --pkgs`

The user should not need to know any of this to uninstall an app.

