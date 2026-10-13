// Design Ref: §5.2 — saves text as a file through a temporary object URL (FR-13 export).
/** Chrome may still be reading the URL right after click(); revoke a moment later. */
const REVOKE_DELAY_MS = 1000;

export function downloadFile(filename: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
