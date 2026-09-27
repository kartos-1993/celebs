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
