/**
 * Helper for enabling track changes in Word document operations
 */

/**
 * Enable track changes for the current Word context
 * Should be called at the beginning of any tool's Word.run block
 */
export async function enableTrackChanges(context: Word.RequestContext): Promise<void> {
  context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
  await context.sync();
}

/**
 * Restore track changes mode to previous state
 * Optional - Word maintains track changes state across operations
 */
export async function restoreTrackChanges(
  context: Word.RequestContext, 
  previousMode?: Word.ChangeTrackingMode
): Promise<void> {
  if (previousMode !== undefined) {
    context.document.changeTrackingMode = previousMode;
    await context.sync();
  }
}