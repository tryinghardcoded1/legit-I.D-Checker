export function getFriendlyErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  
  let errorMessage = err.message || String(err);
  
  try {
    // Try to parse as FirestoreErrorInfo (from our custom handleFirestoreError)
    const parsed = JSON.parse(errorMessage);
    if (parsed.error) {
      const dbError = parsed.error.toLowerCase();
      if (dbError.includes('missing or insufficient permissions')) {
        return 'You do not have permission to perform this action. Please make sure you are logged in with the correct account.';
      }
      if (dbError.includes('quota exceeded')) {
        return 'Our system is currently experiencing high traffic. Please try again in a few minutes.';
      }
      if (dbError.includes('offline') || dbError.includes('network')) {
        return 'Network error. Please check your internet connection and try again.';
      }
      return 'A database error occurred. Please try again.';
    }
  } catch (e) {
    // Not a JSON string, proceed with normal string matching
  }

  const lowerError = errorMessage.toLowerCase();
  if (lowerError.includes('network') || lowerError.includes('failed to fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (lowerError.includes('permission-denied') || lowerError.includes('missing or insufficient permissions')) {
    return 'You do not have permission to access this resource.';
  }
  if (lowerError.includes('unauthenticated')) {
    return 'Please log in to continue.';
  }
  if (lowerError.includes('invalid-argument')) {
    return 'Invalid input provided. Please check your data and try again.';
  }
  if (lowerError.includes('not-found')) {
    return 'The requested resource was not found.';
  }
  if (lowerError.includes('popup-closed-by-user')) {
    return 'Sign-in was cancelled. Please try again.';
  }
  
  return errorMessage;
}
