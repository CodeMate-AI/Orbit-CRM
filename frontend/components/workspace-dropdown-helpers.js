export function toggleWorkspaceDropdown(event, setIsWorkspaceDropdownOpen) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  setIsWorkspaceDropdownOpen((current) => !current);
}

export function shouldCloseWorkspaceDropdown(target, workspaceMenu) {
  return Boolean(workspaceMenu && target && !workspaceMenu.contains(target));
}
