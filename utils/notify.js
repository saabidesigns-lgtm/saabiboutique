export const notifyError = (e) => {
  console.error(e);
  if (typeof window !== 'undefined' && window.alert) window.alert(e?.message || 'Something went wrong. Please try again.');
};
