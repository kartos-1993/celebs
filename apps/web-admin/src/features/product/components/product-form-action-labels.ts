export function getSubmitButtonLabel(
  isEditMode: boolean,
  isReady: boolean,
  canPublish: boolean,
): string {
  if (isEditMode) {
    return canPublish ? 'Save Changes' : 'Submit Changes for Review';
  }
  if (isReady && canPublish) {
    return 'Publish Product';
  }
  return 'Submit for Review';
}

export function getStatusHeader(
  isReady: boolean,
  isEditMode: boolean,
  canPublish: boolean,
): string {
  if (!isReady) {
    return 'More details are still required';
  }
  if (isEditMode) {
    return canPublish ? 'Ready to save changes' : 'Ready to submit for review';
  }
  return canPublish ? 'Ready to publish' : 'Ready to submit for review';
}

/**
 * What the seller is told when "Save Draft" reports it saved nothing.
 *
 * `useProductDraft.saveDraftNow` returns `false` for two distinct reasons — no
 * category yet, or browser storage refusing the write — and the button used to
 * drop that boolean on the floor, so the click looked like it had worked. The
 * copy names both because neither is a state the seller can be left guessing
 * about, and neither is reachable from anywhere else in the UI.
 */
export function getDraftSaveFailureCopy(): { title: string; description: string } {
  return {
    title: 'Draft not saved',
    description:
      'A draft is filed under its category — pick a category and subcategory, or free up browser storage, then try again.',
  };
}
