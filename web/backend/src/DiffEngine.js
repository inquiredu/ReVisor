import { diff_match_patch } from 'diff-match-patch';

export class DiffEngine {
  constructor() {
    this.dmp = new diff_match_patch();
  }

  /**
   * Computes the delta manifest from a list of revisions.
   * @param {string} fileId - The ID of the file.
   * @param {Array} revisions - Array of revision objects { id, modifiedTime, lastModifyingUser, text }.
   *                            Assumed to be sorted chronologically.
   * @returns {Object} The Delta Manifest.
   */
  computeManifest(fileId, revisions) {
    if (!revisions || revisions.length === 0) {
      throw new Error("No revisions provided");
    }

    // Base text is the content of the first revision
    const baseText = revisions[0].text || "";
    const deltas = [];

    // Iterate through revisions starting from the second one
    for (let i = 1; i < revisions.length; i++) {
      const prevRev = revisions[i - 1];
      const currRev = revisions[i];

      const prevText = prevRev.text || "";
      const currText = currRev.text || "";

      const diffs = this.dmp.diff_main(prevText, currText);
      this.dmp.diff_cleanupSemantic(diffs);

      deltas.push({
        revId: currRev.id,
        timestamp: currRev.modifiedTime,
        author: currRev.lastModifyingUser?.displayName || "Unknown",
        ops: diffs
      });
    }

    return {
      fileId,
      totalRevisions: revisions.length,
      baseText: baseText,
      deltas
    };
  }
}
